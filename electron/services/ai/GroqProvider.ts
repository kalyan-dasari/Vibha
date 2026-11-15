import Groq from 'groq-sdk';
import type {
  AIModelInfo,
  ProviderCapabilities,
  TestConnectionResult,
} from '../../../shared/types.ts';
import {
  AIProvider,
  ProviderConfigError,
  ProviderSendParams,
  ProviderStreamResult,
  VisionUnsupportedError,
  hasImageAttachments,
} from './AIProvider.ts';

const SYSTEM_PROMPT =
  'You are Floating AI, a concise, accurate, fast desktop assistant. Provide clear answers with clean Markdown and fenced code blocks when helpful.';

export function inferGroqVisionSupport(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes('vision') ||
    lower.includes('llama-4-scout') ||
    lower.includes('llama-4-maverick')
  );
}

export class GroqProvider implements AIProvider {
  readonly id = 'groq' as const;
  private readonly apiKey: string;
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new ProviderConfigError('Groq API key is not configured.');
    }
    this.apiKey = apiKey.trim();
  }

  private createClient(): Groq {
    return new Groq({ apiKey: this.apiKey });
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      vision: true,
      dynamicModelList: true,
      customEndpoint: false,
    };
  }

  async validateCredentials(): Promise<TestConnectionResult> {
    try {
      const models = await this.getModels();
      return {
        ok: true,
        message: `Connected to Groq (${models.length} models available).`,
        modelsCount: models.length,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to validate Groq API key.';
      return { ok: false, message: msg };
    }
  }

  async getModels(): Promise<AIModelInfo[]> {
    const groq = this.createClient();
    const list = await groq.models.list();
    const models: AIModelInfo[] = (list.data ?? [])
      .filter((m) => {
        const id = m.id.toLowerCase();
        return !id.includes('whisper') && !id.includes('tts') && !id.includes('guard');
      })
      .map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'groq' as const,
        supportsVision: inferGroqVisionSupport(m.id),
        contextWindow: (m as unknown as { context_window?: number }).context_window,
      }));

    return models.sort((a, b) => Number(b.supportsVision) - Number(a.supportsVision) || a.id.localeCompare(b.id));
  }

  private assertVisionIfNeeded(params: ProviderSendParams): void {
    if (!hasImageAttachments(params.messages)) return;
    const supported = params.supportsVisionOverride ?? inferGroqVisionSupport(params.model);
    if (!supported) {
      throw new VisionUnsupportedError(params.model, 'groq');
    }
  }

  private buildMessages(params: ProviderSendParams): Groq.Chat.Completions.ChatCompletionMessageParam[] {
    const out: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    for (const msg of params.messages) {
      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const parts: Groq.Chat.Completions.ChatCompletionContentPart[] = [];
        if (msg.content.trim().length > 0) {
          parts.push({ type: 'text', text: msg.content });
        } else {
          parts.push({ type: 'text', text: 'Analyze the attached image.' });
        }
        for (const att of msg.attachments) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${att.mimeType};base64,${att.base64Data}`,
            },
          });
        }
        out.push({ role: 'user', content: parts });
      } else {
        out.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
    return out;
  }

  async sendMessage(params: ProviderSendParams, signal?: AbortSignal): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const groq = this.createClient();
    const completion = await groq.chat.completions.create(
      {
        model: params.model,
        messages: this.buildMessages(params),
        stream: false,
      },
      { signal }
    );
    return { fullText: completion.choices?.[0]?.message?.content ?? '' };
  }

  async streamResponse(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const groq = this.createClient();
    const stream = await groq.chat.completions.create(
      {
        model: params.model,
        messages: this.buildMessages(params),
        stream: true,
      },
      { signal }
    );

    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled by user.', 'AbortError');
      }
      const delta = chunk.choices?.[0]?.delta?.content ?? '';
      if (delta) {
        fullText += delta;
        onChunk(delta);
      }
    }
    return { fullText };
  }

  async sendImageMessage(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult> {
    return this.streamResponse(params, onChunk, signal);
  }

  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }
}
