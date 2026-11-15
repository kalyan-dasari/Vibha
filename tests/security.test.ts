import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  CredentialEncryptionUnavailableError,
  CredentialService,
  type SafeStorageAdapter,
} from '../electron/services/security/credentialService.ts';
import {
  sanitizePartialSettings,
  validateChatStreamRequest,
  validateEndpointUrl,
  validateGlobalShortcut,
} from '../electron/services/security/validators.ts';
import { DEFAULT_APP_SETTINGS } from '../electron/services/security/settingsService.ts';

const tempDirs: string[] = [];

function createTempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'floating-ai-sec-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('CredentialService & safeStorage enforcement', () => {
  it('refuses plaintext fallback when safeStorage encryption is unavailable', () => {
    const dir = createTempDir();
    const unavailableAdapter: SafeStorageAdapter = {
      isEncryptionAvailable: () => false,
      encryptString: () => Buffer.from('never'),
      decryptString: () => 'never',
    };

    const service = new CredentialService(dir, unavailableAdapter);
    expect(() => service.saveCredential('gemini', 'AIzaSyFakeKey12345')).toThrow(
      CredentialEncryptionUnavailableError
    );
    expect(fs.existsSync(path.join(dir, 'credentials.enc.json'))).toBe(false);
  });

  it('encrypts credentials, masks IPC status hints, and never exposes raw keys', () => {
    const dir = createTempDir();
    const mockAdapter: SafeStorageAdapter = {
      isEncryptionAvailable: () => true,
      encryptString: (plain) => Buffer.from(`ENC:${plain}`, 'utf8'),
      decryptString: (buf) => buf.toString('utf8').replace(/^ENC:/, ''),
    };

    const service = new CredentialService(dir, mockAdapter);
    const status = service.saveCredential('groq', 'gsk_secret_token_9876');

    expect(status.configured).toBe(true);
    expect(status.maskedHint).toBe('••••9876');
    expect(JSON.stringify(service.getAllSafeStatuses())).not.toContain('gsk_secret_token_9876');
    expect(service.getCredentialInternal('groq')).toBe('gsk_secret_token_9876');

    const diskContent = fs.readFileSync(path.join(dir, 'credentials.enc.json'), 'utf8');
    expect(diskContent).not.toContain('gsk_secret_token_9876');

    const deleted = service.deleteCredential('groq');
    expect(deleted.configured).toBe(false);
    expect(service.getCredentialInternal('groq')).toBeNull();
  });
});

describe('IPC & Endpoint Security Validators', () => {
  it('blocks unsafe URL schemes and cloud metadata IPs while allowing HTTPS and localhost', () => {
    expect(validateEndpointUrl('https://api.openai.com/v1').valid).toBe(true);
    expect(validateEndpointUrl('http://localhost:11434/v1').valid).toBe(true);
    expect(validateEndpointUrl('http://127.0.0.1:1234/v1').valid).toBe(true);

    expect(validateEndpointUrl('http://api.example.com/v1').valid).toBe(false);
    expect(validateEndpointUrl('file:///etc/passwd').valid).toBe(false);
    expect(validateEndpointUrl('javascript:alert(1)').valid).toBe(false);
    expect(validateEndpointUrl('https://169.254.169.254/latest/meta-data').valid).toBe(false);
    expect(validateEndpointUrl('https://user:pass@api.openai.com/v1').valid).toBe(false);
  });

  it('validates chat stream payloads and rejects malformed attachments or providers', () => {
    const valid = validateChatStreamRequest({
      requestId: 'req-1',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(valid.valid).toBe(true);

    const invalidProvider = validateChatStreamRequest({
      requestId: 'req-2',
      provider: 'unknown-provider',
      model: 'x',
      messages: [{ role: 'user', content: 'Hello' }],
    });
    expect(invalidProvider.valid).toBe(false);

    const invalidMime = validateChatStreamRequest({
      requestId: 'req-3',
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      messages: [
        {
          role: 'user',
          content: 'Check this',
          attachments: [
            {
              id: 'a1',
              name: 'bad.svg',
              mimeType: 'image/svg+xml',
              base64Data: 'PHN2Zz4=',
              width: 10,
              height: 10,
              sizeBytes: 10,
              source: 'file',
            },
          ],
        },
      ],
    });
    expect(invalidMime.valid).toBe(false);
  });

  it('validates global shortcuts and settings updates', () => {
    expect(validateGlobalShortcut('CommandOrControl+Space')).toBe(true);
    expect(validateGlobalShortcut('Alt+Shift+A')).toBe(true);
    expect(validateGlobalShortcut('Space')).toBe(false);

    const badSettings = sanitizePartialSettings(
      {
        providers: {
          ...DEFAULT_APP_SETTINGS.providers,
          'openai-compatible': {
            provider: 'openai-compatible',
            model: 'llama3',
            customBaseUrl: 'http://evil-remote.com/v1',
            customModelSupportsVision: false,
          },
        },
      },
      DEFAULT_APP_SETTINGS
    );
    expect(badSettings.valid).toBe(false);
  });
});
