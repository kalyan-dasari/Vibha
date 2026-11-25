import type { AIProviderId, ChatMessageInput, ChatStreamRequest } from '../types/index.ts';
import type { UIMessage } from '../types/index.ts';
import { getBridge } from './electronBridge.ts';

export function toChatMessageInputs(messages: UIMessage[]): ChatMessageInput[] {
  return messages
    .filter((m) => m.status !== 'error' && (m.content.trim().length > 0 || (m.attachments?.length ?? 0) > 0))
    .map((m) => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments,
    }));
}

export async function dispatchChatStream(params: {
  requestId: string;
  provider: AIProviderId;
  model: string;
  messages: UIMessage[];
  supportsVisionOverride?: boolean;
  systemPrompt?: string;
}): Promise<{ accepted: boolean; error?: string }> {
  const bridge = getBridge();
  if (!bridge) {
    return {
      accepted: false,
      error:
        'Electron desktop runtime is not connected. Launch with "npm run dev:electron" on Windows to invoke main-process AI providers securely.',
    };
  }

  const request: ChatStreamRequest = {
    requestId: params.requestId,
    provider: params.provider,
    model: params.model,
    messages: toChatMessageInputs(params.messages),
    supportsVisionOverride: params.supportsVisionOverride,
    systemPrompt: params.systemPrompt,
  };

  return bridge.chat.sendMessageStream(request);
}

export async function cancelChatStream(requestId: string): Promise<void> {
  const bridge = getBridge();
  if (!bridge) return;
  await bridge.chat.cancelRequest(requestId);
}
