import { create } from 'zustand';
import type { AIProviderId, ImageAttachment } from '../types/index.ts';
import type { UIMessage } from '../types/index.ts';

interface ChatState {
  messages: UIMessage[];
  pendingAttachments: ImageAttachment[];
  isStreaming: boolean;
  activeRequestId: string | null;
  activeAssistantMessageId: string | null;
  error: string | null;

  addPendingAttachment: (attachment: ImageAttachment) => void;
  removePendingAttachment: (id: string) => void;
  clearPendingAttachments: () => void;

  beginTurn: (params: {
    userContent: string;
    attachments: ImageAttachment[];
    provider: AIProviderId;
    model: string;
    requestId: string;
  }) => { userMessageId: string; assistantMessageId: string };

  beginRegenerateTurn: (params: {
    assistantMessageId: string;
    provider: AIProviderId;
    model: string;
    requestId: string;
  }) => void;

  appendStreamDelta: (requestId: string, delta: string) => void;
  completeStream: (requestId: string, fullText?: string) => void;
  failStream: (requestId: string, errorMessage: string) => void;
  cancelActiveStream: () => void;

  clearConversation: () => void;
  clearError: () => void;
}

/**
 * Strictly RAM-only conversation store.
 * No Zustand persist middleware, no localStorage, no disk history.
 */
export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  pendingAttachments: [],
  isStreaming: false,
  activeRequestId: null,
  activeAssistantMessageId: null,
  error: null,

  addPendingAttachment: (attachment) =>
    set((state) => ({
      pendingAttachments:
        state.pendingAttachments.length >= 4
          ? state.pendingAttachments
          : [...state.pendingAttachments, attachment],
    })),

  removePendingAttachment: (id) =>
    set((state) => ({
      pendingAttachments: state.pendingAttachments.filter((a) => a.id !== id),
    })),

  clearPendingAttachments: () => set({ pendingAttachments: [] }),

  beginTurn: ({ userContent, attachments, provider, model, requestId }) => {
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();
    const now = Date.now();

    const userMsg: UIMessage = {
      id: userMessageId,
      role: 'user',
      content: userContent,
      attachments: attachments.length > 0 ? attachments : undefined,
      createdAt: now,
      status: 'complete',
    };

    const assistantMsg: UIMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
      status: 'streaming',
      provider,
      model,
    };

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      pendingAttachments: [],
      isStreaming: true,
      activeRequestId: requestId,
      activeAssistantMessageId: assistantMessageId,
      error: null,
    }));

    return { userMessageId, assistantMessageId };
  },

  beginRegenerateTurn: ({ assistantMessageId, provider, model, requestId }) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === assistantMessageId
          ? {
              ...m,
              content: '',
              status: 'streaming',
              errorMessage: undefined,
              provider,
              model,
            }
          : m
      ),
      isStreaming: true,
      activeRequestId: requestId,
      activeAssistantMessageId: assistantMessageId,
      error: null,
    })),

  appendStreamDelta: (requestId, delta) => {
    const { activeRequestId, activeAssistantMessageId } = get();
    if (requestId !== activeRequestId || !activeAssistantMessageId) return;

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === activeAssistantMessageId ? { ...m, content: m.content + delta } : m
      ),
    }));
  },

  completeStream: (requestId, fullText) => {
    const { activeRequestId, activeAssistantMessageId } = get();
    if (requestId !== activeRequestId) return;

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === activeAssistantMessageId
          ? {
              ...m,
              content: m.content || fullText || '',
              status: m.content || fullText ? 'complete' : 'cancelled',
            }
          : m
      ),
      isStreaming: false,
      activeRequestId: null,
      activeAssistantMessageId: null,
    }));
  },

  failStream: (requestId, errorMessage) => {
    const { activeRequestId, activeAssistantMessageId } = get();
    if (requestId !== activeRequestId) return;

    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === activeAssistantMessageId
          ? {
              ...m,
              status: 'error',
              errorMessage,
            }
          : m
      ),
      isStreaming: false,
      activeRequestId: null,
      activeAssistantMessageId: null,
      error: errorMessage,
    }));
  },

  cancelActiveStream: () => {
    const { activeAssistantMessageId } = get();
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === activeAssistantMessageId ? { ...m, status: 'cancelled' } : m
      ),
      isStreaming: false,
      activeRequestId: null,
      activeAssistantMessageId: null,
    }));
  },

  clearConversation: () =>
    set({
      messages: [],
      pendingAttachments: [],
      isStreaming: false,
      activeRequestId: null,
      activeAssistantMessageId: null,
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
