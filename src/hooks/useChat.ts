import { useCallback, useEffect } from 'react';
import { cancelChatStream, dispatchChatStream } from '../services/chatService.ts';
import { getBridge } from '../services/electronBridge.ts';
import { buildFormCopilotSystemPrompt } from '../services/profilePromptService.ts';
import { useChatStore } from '../stores/chatStore.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';

export function useChat() {
  const messages = useChatStore((s) => s.messages);
  const pendingAttachments = useChatStore((s) => s.pendingAttachments);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeRequestId = useChatStore((s) => s.activeRequestId);
  const error = useChatStore((s) => s.error);
  const formAssistantMode = useChatStore((s) => s.formAssistantMode);

  const addPendingAttachment = useChatStore((s) => s.addPendingAttachment);
  const removePendingAttachment = useChatStore((s) => s.removePendingAttachment);
  const clearPendingAttachments = useChatStore((s) => s.clearPendingAttachments);
  const beginTurn = useChatStore((s) => s.beginTurn);
  const beginRegenerateTurn = useChatStore((s) => s.beginRegenerateTurn);
  const appendStreamDelta = useChatStore((s) => s.appendStreamDelta);
  const completeStream = useChatStore((s) => s.completeStream);
  const failStream = useChatStore((s) => s.failStream);
  const cancelActiveStream = useChatStore((s) => s.cancelActiveStream);
  const clearConversation = useChatStore((s) => s.clearConversation);
  const clearError = useChatStore((s) => s.clearError);
  const setFormAssistantMode = useChatStore((s) => s.setFormAssistantMode);
  const toggleFormAssistantMode = useChatStore((s) => s.toggleFormAssistantMode);

  const snapshot = useSettingsStore((s) => s.snapshot);
  const modelsByProvider = useSettingsStore((s) => s.modelsByProvider);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;

    const unsubChunk = bridge.chat.onStreamChunk((ev) => {
      appendStreamDelta(ev.requestId, ev.delta);
    });
    const unsubDone = bridge.chat.onStreamDone((ev) => {
      completeStream(ev.requestId, ev.fullText);
    });
    const unsubError = bridge.chat.onStreamError((ev) => {
      failStream(ev.requestId, ev.error);
    });

    return () => {
      unsubChunk();
      unsubDone();
      unsubError();
    };
  }, [appendStreamDelta, completeStream, failStream]);

  const sendMessage = useCallback(
    async (
      rawText: string,
      options?: { isFormAssistant?: boolean; systemPrompt?: string }
    ): Promise<boolean> => {
      const content = rawText.trim();
      if (!content && pendingAttachments.length === 0) return false;
      if (isStreaming) return false;

      const provider = snapshot.settings.activeProvider;
      const providerConfig = snapshot.settings.providers[provider];
      let model = providerConfig.model;
      const requestId = crypto.randomUUID();
      const attachmentsToSend = [...pendingAttachments];

      // Auto-route screenshot turns to a vision-capable model if current model is text-only
      if (attachmentsToSend.length > 0) {
        const availableModels = modelsByProvider[provider] ?? [];
        const currentModelInfo = availableModels.find((m) => m.id === model);
        if (currentModelInfo && !currentModelInfo.supportsVision) {
          const visionModel = availableModels.find((m) => m.supportsVision);
          if (visionModel) {
            model = visionModel.id;
          }
        }
      }

      beginTurn({
        userContent: content,
        attachments: attachmentsToSend,
        provider,
        model,
        requestId,
      });

      const knownModel = (modelsByProvider[provider] ?? []).find((m) => m.id === model);
      const supportsVisionOverride =
        provider === 'openai-compatible'
          ? providerConfig.customModelSupportsVision
          : knownModel?.supportsVision;

      const currentMessages = useChatStore.getState().messages.slice(0, -1);

      // Build system prompt with personal profile if in Form Copilot mode
      let systemPrompt = options?.systemPrompt;
      const isFormCopilot = options?.isFormAssistant ?? formAssistantMode;
      if (isFormCopilot && !systemPrompt) {
        const bridge = getBridge();
        if (bridge?.profile) {
          try {
            const profile = await bridge.profile.get();
            systemPrompt = buildFormCopilotSystemPrompt(profile);
          } catch {
            // Fallback to default
          }
        }
      }

      const res = await dispatchChatStream({
        requestId,
        provider,
        model,
        messages: currentMessages,
        supportsVisionOverride,
        systemPrompt,
      });

      if (!res.accepted) {
        failStream(requestId, res.error ?? 'Unable to start AI request.');
        return false;
      }

      return true;
    },
    [
      beginTurn,
      failStream,
      formAssistantMode,
      isStreaming,
      modelsByProvider,
      pendingAttachments,
      snapshot.settings.activeProvider,
      snapshot.settings.providers,
    ]
  );

  const stopGeneration = useCallback(async () => {
    if (!activeRequestId) return;
    await cancelChatStream(activeRequestId);
    cancelActiveStream();
  }, [activeRequestId, cancelActiveStream]);

  const regenerateMessage = useCallback(
    async (assistantMessageId: string) => {
      if (isStreaming) return;
      const stateMessages = useChatStore.getState().messages;
      const targetIndex = stateMessages.findIndex((m) => m.id === assistantMessageId);
      if (targetIndex === -1) return;

      const contextMessages = stateMessages.slice(0, targetIndex);
      if (contextMessages.length === 0) return;

      const provider = snapshot.settings.activeProvider;
      const providerConfig = snapshot.settings.providers[provider];
      const model = providerConfig.model;
      const requestId = crypto.randomUUID();

      beginRegenerateTurn({
        assistantMessageId,
        provider,
        model,
        requestId,
      });

      const knownModel = (modelsByProvider[provider] ?? []).find((m) => m.id === model);
      const supportsVisionOverride =
        provider === 'openai-compatible'
          ? providerConfig.customModelSupportsVision
          : knownModel?.supportsVision;

      // Build system prompt with personal profile if in Form Copilot mode
      let systemPrompt: string | undefined;
      if (formAssistantMode) {
        const bridge = getBridge();
        if (bridge?.profile) {
          try {
            const profile = await bridge.profile.get();
            systemPrompt = buildFormCopilotSystemPrompt(profile);
          } catch {
            // Fallback
          }
        }
      }

      const res = await dispatchChatStream({
        requestId,
        provider,
        model,
        messages: contextMessages,
        supportsVisionOverride,
        systemPrompt,
      });

      if (!res.accepted) {
        failStream(requestId, res.error ?? 'Unable to regenerate response.');
      }
    },
    [
      beginRegenerateTurn,
      failStream,
      formAssistantMode,
      isStreaming,
      modelsByProvider,
      snapshot.settings.activeProvider,
      snapshot.settings.providers,
    ]
  );

  const refineLastMessage = useCallback(
    async (refinementPrompt: string): Promise<boolean> => {
      return sendMessage(refinementPrompt);
    },
    [sendMessage]
  );

  return {
    messages,
    pendingAttachments,
    isStreaming,
    error,
    formAssistantMode,
    setFormAssistantMode,
    toggleFormAssistantMode,
    addPendingAttachment,
    removePendingAttachment,
    clearPendingAttachments,
    sendMessage,
    refineLastMessage,
    stopGeneration,
    regenerateMessage,
    clearConversation,
    clearError,
  };
}
