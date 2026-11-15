import { GoogleGenAI } from '@google/genai';
import type { Content, Part } from '@google/genai';
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

const SYSTEM_INSTRUCTION =
  'You are Floating AI, a concise, accurate, fast desktop assistant. Provide clear answers with clean Markdown and fenced code blocks when helpful.';

const KNOWN_GEMINI_MODELS: AIModelInfo[] = [
  {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen (Fast & Multimodal)',
    provider: 'gemini',
    supportsVision: true,
    description: 'Fast multimodal model for everyday Q&A and screenshot analysis.',
  },
  {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon (Reasoning & Coding)',
    provider: 'gemini',
    supportsVision: true,
    description: 'Advanced reasoning, coding, and visual debugging.',
  },
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'gemini',
    supportsVision: true,
    description: 'Ultra-low-latency multimodal assistant.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'gemini',
    supportsVision: true,
    description: 'Balanced speed and multimodal accuracy.',
  },
];

function inferGeminiVisionSupport(modelId: string): boolean {
  const lower = modelId.toLowerCase();
  if (lower.includes('embedding') || lower.includes('tts') || lower.includes('transcribe')) {
    return false;
  }
  return true;
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const;
  private readonly apiKey: string;
  private readonly abortControllers = new Map<string, AbortController>();

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      throw new ProviderConfigError('Google Gemini API key is not configured.');
    }
    this.apiKey = apiKey.trim();
  }

  private createClient(): GoogleGenAI {
    return new GoogleGenAI({
      apiKey: this.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'floating-ai-desktop',
        },
      },
    });
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
        message: `Connected to Google Gemini (${models.length} models available).`,
        modelsCount: models.length,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to validate Gemini API key.';
      return { ok: false, message: msg };
    }
  }

  async getModels(): Promise<AIModelInfo[]> {
    const ai = this.createClient();
    const discovered: AIModelInfo[] = [];
    const seen = new Set<string>();

    try {
      const pager = await ai.models.list();
      for await (const m of pager) {
        const rawName = m.name ?? '';
        const id = rawName.replace(/^models\//, '');
        if (!id) continue;
        const lower = id.toLowerCase();
        // Exclude deprecated 1.x / 2.0 or non-chat models (embeddings, imagen, veo, tts, lyria)
        if (
          lower.includes('embedding') ||
          lower.includes('imagen') ||
          lower.includes('veo') ||
          lower.includes('lyria') ||
          lower.includes('tts') ||
          lower.includes('transcribe') ||
          lower.includes('aqa') ||
          lower.startsWith('gemini-1.') ||
          lower.startsWith('gemini-2.0')
        ) {
          continue;
        }
        const actions = m.supportedActions ?? [];
        if (actions.length > 0 && !actions.includes('generateContent')) {
          continue;
        }
        if (seen.has(id)) continue;
        seen.add(id);
        discovered.push({
          id,
          name: m.displayName || id,
          provider: 'gemini',
          supportsVision: inferGeminiVisionSupport(id),
          contextWindow: m.inputTokenLimit,
          description: m.description,
        });
      }
    } catch (err) {
      // Surface auth errors directly rather than masking invalid keys
      const msg = err instanceof Error ? err.message : String(err);
      if (/api key|permission|unauthorized|401|403|400/i.test(msg)) {
        throw new ProviderConfigError(`Gemini authentication failed: ${msg}`);
      }
    }

    if (discovered.length > 0) {
      // Ensure recommended active models appear near top if present
      return discovered;
    }

    return KNOWN_GEMINI_MODELS;
  }

  private buildContents(params: ProviderSendParams): Content[] {
    return params.messages.map((msg) => {
      const parts: Part[] = [];
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          parts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: att.base64Data,
            },
          });
        }
      }
      if (msg.content.trim().length > 0) {
        parts.push({ text: msg.content });
      } else if (parts.length > 0) {
        parts.push({ text: 'Analyze the attached image.' });
      }
      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      };
    });
  }

  private assertVisionIfNeeded(params: ProviderSendParams): void {
    if (!hasImageAttachments(params.messages)) return;
    const supported = params.supportsVisionOverride ?? inferGeminiVisionSupport(params.model);
    if (!supported) {
      throw new VisionUnsupportedError(params.model, 'gemini');
    }
  }

  async sendMessage(params: ProviderSendParams, signal?: AbortSignal): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const ai = this.createClient();
    const response = await ai.models.generateContent({
      model: params.model,
      contents: this.buildContents(params),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        abortSignal: signal,
      },
    });
    return { fullText: response.text ?? '' };
  }

  async streamResponse(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult> {
    this.assertVisionIfNeeded(params);
    const ai = this.createClient();

    const stream = await ai.models.generateContentStream({
      model: params.model,
      contents: this.buildContents(params),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        abortSignal: signal,
      },
    });

    let fullText = '';
    for await (const chunk of stream) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled by user.', 'AbortError');
      }
      const delta = chunk.text ?? '';
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
