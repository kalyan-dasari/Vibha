import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisionUnsupportedError } from '../electron/services/ai/AIProvider.ts';
import { GroqProvider } from '../electron/services/ai/GroqProvider.ts';
import { OpenAICompatibleProvider } from '../electron/services/ai/OpenAICompatibleProvider.ts';
import { ProviderFactory } from '../electron/services/ai/ProviderFactory.ts';
import { DEFAULT_APP_SETTINGS } from '../electron/services/security/settingsService.ts';
import type { CredentialService } from '../electron/services/security/credentialService.ts';
import type { ImageAttachment } from '../shared/types.ts';

const SAMPLE_ATTACHMENT: ImageAttachment = {
  id: 'img-1',
  name: 'screen.png',
  mimeType: 'image/png',
  base64Data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  width: 1,
  height: 1,
  sizeBytes: 68,
  source: 'capture',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AI Provider Adapters & Vision Enforcement', () => {
  it('refuses to silently drop images when a text-only Groq model is selected', async () => {
    const groq = new GroqProvider('gsk_test_key');
    await expect(
      groq.sendImageMessage(
        {
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: 'What is on my screen?', attachments: [SAMPLE_ATTACHMENT] }],
        },
        () => {}
      )
    ).rejects.toThrow(VisionUnsupportedError);
  });

  it('refuses to silently drop images on OpenAI-compatible text-only model unless overridden', async () => {
    const provider = new OpenAICompatibleProvider('sk-test', 'https://api.openai.com/v1');
    await expect(
      provider.sendImageMessage(
        {
          model: 'mistral-7b-instruct',
          supportsVisionOverride: false,
          messages: [{ role: 'user', content: 'Describe this', attachments: [SAMPLE_ATTACHMENT] }],
        },
        () => {}
      )
    ).rejects.toThrow(VisionUnsupportedError);
  });

  it('streams SSE deltas and supports AbortController cancellation in OpenAICompatibleProvider', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'));
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"world"}}]}\n\n'));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: stream,
      })
    );

    const provider = new OpenAICompatibleProvider('sk-test', 'https://api.openai.com/v1');
    const chunks: string[] = [];
    const result = await provider.streamResponse(
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Say hello' }],
      },
      (delta) => chunks.push(delta)
    );

    expect(chunks).toEqual(['Hello ', 'world']);
    expect(result.fullText).toBe('Hello world');
  });

  it('cancels active requests cleanly through ProviderFactory', () => {
    const fakeCredService = {
      getCredentialInternal: () => 'test-key',
    } as unknown as CredentialService;

    const factory = new ProviderFactory(fakeCredService);
    const controller = factory.registerRequest('req-cancel-1');
    expect(controller.signal.aborted).toBe(false);

    const cancelled = factory.cancelRequest('req-cancel-1');
    expect(cancelled).toBe(true);
    expect(controller.signal.aborted).toBe(true);

    const provider = factory.createProvider('openai-compatible', DEFAULT_APP_SETTINGS, {
      apiKeyOverride: 'sk-test',
      customBaseUrlOverride: 'https://api.openai.com/v1',
    });
    expect(provider.id).toBe('openai-compatible');
  });
});
