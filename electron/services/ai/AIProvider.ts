import type {
  AIModelInfo,
  AIProviderId,
  ChatMessageInput,
  ProviderCapabilities,
  TestConnectionResult,
} from '../../../shared/types.ts';

export class VisionUnsupportedError extends Error {
  constructor(model: string, provider: AIProviderId) {
    super(
      `The selected model "${model}" on provider "${provider}" does not support image/screenshot inputs. Switch to a vision-capable model in Settings before sending screenshots.`
    );
    this.name = 'VisionUnsupportedError';
  }
}

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProviderConfigError';
  }
}

export interface ProviderSendParams {
  model: string;
  messages: ChatMessageInput[];
  supportsVisionOverride?: boolean;
}

export interface ProviderStreamResult {
  fullText: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  validateCredentials(): Promise<TestConnectionResult>;
  getModels(): Promise<AIModelInfo[]>;
  sendMessage(params: ProviderSendParams, signal?: AbortSignal): Promise<ProviderStreamResult>;
  streamResponse(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult>;
  sendImageMessage(
    params: ProviderSendParams,
    onChunk: (delta: string) => void,
    signal?: AbortSignal
  ): Promise<ProviderStreamResult>;
  cancelRequest(requestId: string): void;
  getCapabilities(): ProviderCapabilities;
}

export function hasImageAttachments(messages: ChatMessageInput[]): boolean {
  return messages.some((m) => Array.isArray(m.attachments) && m.attachments.length > 0);
}
