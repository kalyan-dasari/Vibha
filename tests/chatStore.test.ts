import { beforeEach, describe, expect, it } from 'vitest';
import { useChatStore } from '../src/stores/chatStore.ts';

describe('RAM-only chatStore', () => {
  beforeEach(() => {
    useChatStore.getState().clearConversation();
  });

  it('tracks streaming turns in memory and releases all data on clearConversation', () => {
    const store = useChatStore.getState();

    store.addPendingAttachment({
      id: 'att-1',
      name: 'capture.jpg',
      mimeType: 'image/jpeg',
      base64Data: 'AAAA',
      width: 100,
      height: 100,
      sizeBytes: 3,
      source: 'capture',
    });
    expect(useChatStore.getState().pendingAttachments).toHaveLength(1);

    store.beginTurn({
      userContent: 'Explain this error',
      attachments: useChatStore.getState().pendingAttachments,
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      requestId: 'req-1',
    });

    expect(useChatStore.getState().pendingAttachments).toHaveLength(0);
    expect(useChatStore.getState().isStreaming).toBe(true);
    expect(useChatStore.getState().messages).toHaveLength(2);

    useChatStore.getState().appendStreamDelta('req-1', 'Check line 42.');
    useChatStore.getState().completeStream('req-1');

    const afterDone = useChatStore.getState();
    expect(afterDone.isStreaming).toBe(false);
    expect(afterDone.messages[1].content).toBe('Check line 42.');
    expect(afterDone.messages[1].status).toBe('complete');

    afterDone.clearConversation();
    expect(useChatStore.getState().messages).toHaveLength(0);
    expect(useChatStore.getState().activeRequestId).toBeNull();
  });
});
