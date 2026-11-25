import type {
  AIModelInfo,
  ProviderCapabilities,
  TestConnectionResult,
} from '../../../shared/types.ts';
import { validateEndpointUrl } from '../security/validators.ts';
import {
  AIProvider,
  ProviderConfigError,
  ProviderSendParams,
  ProviderStreamResult,
  VisionUnsupportedError,
  hasImageAttachments,
} from './AIProvider.ts';

const SYSTEM_PROMPT =
  'You are Vibha, a concise, accurate, fast desktop assistant. Provide clear answers with clean Markdown and fenced code blocks when helpful.';

export function inferOpenAICompatibleVisionSupport(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  return (
    lower.includes('gpt-4o') ||
    lower.includes('gpt-4.1') ||
    lower.includes('gpt-4-turbo') ||
    lower.includes('gpt-5') ||
    lower.includes('o1') ||
    lower.includes('o3') ||
    lower.includes('o4') ||
    lower.includes('vision') ||
    lower.includes('vl') ||
    lower.includes('llava') ||
    lower.includes('claude-3') ||
    lower.includes('claude-4') ||
    lower.includes('pixtral') ||
    lower.includes('qwen2.5-vl') ||
    lower.includes('qwen-vl') ||
    lower.includes('gemma-3') ||
    lower.includes('gemini')
  );
}

interface OpenAIMessagePart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: 'auto' | 'low' | 'high' };
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id = 'openai-compatible' as const;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(apiKey: string, baseUrl: string) {
    const urlCheck = validateEndpointUrl(baseUrl);
    if (!urlCheck.valid || !urlCheck.normalized) {
      throw new ProviderConfigError(urlCheck.error ?? 'Invalid OpenAI-compatible base URL.');
    }
    this.baseUrl = urlCheck.normalized;

    // Local servers like Ollama/LM Studio sometimes accept dummy keys, but remote HTTPS requires an API key
    const parsed = new URL(this.baseUrl);
    const isLocal = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    if (!isLocal && (!apiKey || !apiKey.trim())) {
      throw new ProviderConfigError('API key is required for remote OpenAI-compatible endpoints.');
    }
    this.apiKey = apiKey?.trim() || 'local-no-key';
  }

  getCapabilities(): ProviderCapabilities {
    return {
      streaming: true,
      vision: true,
      dynamicModelList: true,
      customEndpoint: true,
    };
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  async validateCredentials(): Promise<TestConnectionResult> {
    try {
      const models = await this.getModels();
      return {
        ok: true,
        message: `Connected to endpoint (${models.length} models discovered).`,
        modelsCount: models.length,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to connect to OpenAI-compatible endpoint.';
      return { ok: false, message: msg };
    }
  }

  async getModels(): Promise<AIModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/models`, {
      method: 'GET',
      headers: this.headers(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new ProviderConfigError(
        `Endpoint returned HTTP ${res.status}${body ? `: ${body.slice(0, 180)}` : ''}`
      );
    }

    const json = (await res.json()) as { data?: Array<{ id: string }> };
    const rows = Array.isArray(json.data) ? json.data : [];

    return rows
      .filter((m) => typeof m.id === 'string' && m.id.length > 0)
      .map((m) => ({
        id: m.id,
        name: m.id,
        provider: 'openai-compatible' as const,
        supportsVision: inferOpenAICompatibleVisionSupport(m.id),
      }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  private assertVisionIfNeeded(params: ProviderSendParams): void {
    if (!hasImageAttachments(params.messages)) return;
    const supported =
      params.supportsVisionOverride ?? inferOpenAICompatibleVisionSupport(params.model);
    if (!supported) {
      throw new VisionUnsupportedError(params.model, 'openai-compatible');
    }
  }

  private buildMessages(params: ProviderSendParams) {
    const out: Array<{ role: 'system' | 'user' | 'assistant'; content: string | OpenAIMessagePart[] }> = [
      { role: 'system', content: params.systemPrompt || SYSTEM_PROMPT },
    ];

    for (const msg of params.messages) {
      if (msg.role === 'user' && msg.attachments && msg.attachments.length > 0) {
        const parts: OpenAIMessagePart[] = [
          {
            type: 'text',
            text: msg.content.trim().length > 0 ? msg.content : 'Analyze the attached image.',
          },
        ];
        for (const att of msg.attachments) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${att.mimeType};base64,${att.base64Data}`,
              detail: 'auto',
            },
          });
        }
        out.push({ role: 'user', content: parts });
      } else {
        out.push({ role: msg.role, content: msg.content });
      }
    }
    return out;
  }

  async sendMessage(params: ProviderSendParams, signal?: AbortSignal): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: JSON.stringify({
        model: params.model,
        messages: this.buildMessages(params),
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Provider HTTP ${res.status}: ${errText.slice(0, 220)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return { fullText: json.choices?.[0]?.message?.content ?? '' };
  }

  async streamResponse(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers(),
      signal,
      body: JSON.stringify({
        model: params.model,
        messages: this.buildMessages(params),
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Provider HTTP ${res.status}: ${errText.slice(0, 220)}`);
    }

    if (!res.body) {
      throw new Error('Streaming response body unavailable from endpoint.');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      if (signal?.aborted) {
        await reader.cancel();
        throw new DOMException('Request cancelled by user.', 'AbortError');
      }
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') {
          return { fullText };
        }
        try {
          const parsed = JSON.parse(dataStr) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) {
            fullText += delta;
            onChunk(delta);
          }
        } catch {
          // Ignore partial SSE comment/keepalive lines
        }
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
