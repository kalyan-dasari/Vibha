import fs from 'node:fs';
import path from 'node:path';
import type { AIProviderId, ProviderCredentialStatus } from '../../../shared/types.ts';

export interface SafeStorageAdapter {
  isEncryptionAvailable: () => boolean;
  encryptString: (plainText: string) => Buffer;
  decryptString: (encrypted: Buffer) => string;
}

interface EncryptedCredentialRecord {
  ciphertextBase64: string;
  maskedHint: string;
  updatedAt: string;
}

type CredentialStoreFile = Partial<Record<AIProviderId, EncryptedCredentialRecord>>;

export class CredentialEncryptionUnavailableError extends Error {
  constructor(message = 'OS-level credential encryption (Electron safeStorage) is unavailable. Refusing to store API key in plaintext.') {
    super(message);
    this.name = 'CredentialEncryptionUnavailableError';
  }
}

export function maskApiKey(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length <= 4) {
    return '••••';
  }
  return `••••${trimmed.slice(-4)}`;
}

/**
 * CredentialService stores BYOK API keys strictly encrypted via Electron safeStorage
 * (Windows DPAPI under the hood). It never falls back to plaintext storage and never
 * returns raw API keys to the renderer process.
 */
export class CredentialService {
  private readonly storePath: string;
  private readonly safeStorage: SafeStorageAdapter;

  constructor(userDataDir: string, safeStorageAdapter: SafeStorageAdapter) {
    this.storePath = path.join(userDataDir, 'credentials.enc.json');
    this.safeStorage = safeStorageAdapter;
  }

  isEncryptionAvailable(): boolean {
    try {
      return this.safeStorage.isEncryptionAvailable();
    } catch {
      return false;
    }
  }

  saveCredential(provider: AIProviderId, rawApiKey: string): ProviderCredentialStatus {
    const apiKey = rawApiKey.trim();
    if (!apiKey) {
      throw new Error('API key cannot be empty.');
    }

    if (!this.isEncryptionAvailable()) {
      throw new CredentialEncryptionUnavailableError();
    }

    const encryptedBuffer = this.safeStorage.encryptString(apiKey);
    const store = this.readStoreFile();
    const maskedHint = maskApiKey(apiKey);

    store[provider] = {
      ciphertextBase64: encryptedBuffer.toString('base64'),
      maskedHint,
      updatedAt: new Date().toISOString(),
    };

    this.writeStoreFile(store);

    return {
      provider,
      configured: true,
      maskedHint,
      encryptionAvailable: true,
    };
  }

  /**
   * Internal main-process retrieval only. Never expose this return value over IPC.
   */
  getCredentialInternal(provider: AIProviderId): string | null {
    const store = this.readStoreFile();
    const record = store[provider];
    if (!record) return null;

    if (!this.isEncryptionAvailable()) {
      throw new CredentialEncryptionUnavailableError();
    }

    const buffer = Buffer.from(record.ciphertextBase64, 'base64');
    const decrypted = this.safeStorage.decryptString(buffer);
    return decrypted || null;
  }

  deleteCredential(provider: AIProviderId): ProviderCredentialStatus {
    const store = this.readStoreFile();
    if (store[provider]) {
      delete store[provider];
      this.writeStoreFile(store);
    }
    return {
      provider,
      configured: false,
      maskedHint: null,
      encryptionAvailable: this.isEncryptionAvailable(),
    };
  }

  getSafeStatus(provider: AIProviderId): ProviderCredentialStatus {
    const store = this.readStoreFile();
    const record = store[provider];
    return {
      provider,
      configured: Boolean(record?.ciphertextBase64),
      maskedHint: record?.maskedHint ?? null,
      encryptionAvailable: this.isEncryptionAvailable(),
    };
  }

  getAllSafeStatuses(): Record<AIProviderId, ProviderCredentialStatus> {
    return {
      gemini: this.getSafeStatus('gemini'),
      groq: this.getSafeStatus('groq'),
      'openai-compatible': this.getSafeStatus('openai-compatible'),
    };
  }

  private readStoreFile(): CredentialStoreFile {
    try {
      if (!fs.existsSync(this.storePath)) {
        return {};
      }
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? (parsed as CredentialStoreFile) : {};
    } catch {
      return {};
    }
  }

  private writeStoreFile(store: CredentialStoreFile): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.storePath, JSON.stringify(store, null, 2), {
      encoding: 'utf8',
      mode: 0o600,
    });
  }
}
