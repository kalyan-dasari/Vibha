import { ipcMain } from 'electron';
import type { ProviderFactory } from '../services/ai/ProviderFactory.ts';
import type { SettingsService } from '../services/security/settingsService.ts';
import { validateChatStreamRequest } from '../services/security/validators.ts';

export function registerChatHandlers(deps: {
  providerFactory: ProviderFactory;
  settingsService: SettingsService;
}): void {
  const { providerFactory, settingsService } = deps;

  ipcMain.handle('chat:send-stream', async (event, rawPayload: unknown) => {
    const validation = validateChatStreamRequest(rawPayload);
    if (!validation.valid || !validation.data) {
      return { accepted: false, error: validation.error ?? 'Invalid request.' };
    }

    const req = validation.data;
    const settings = settingsService.getSettings();
    const controller = providerFactory.registerRequest(req.requestId);

    // Run streaming asynchronously so the IPC invoke returns immediately and UI stays responsive
    void (async () => {
      try {
        const provider = providerFactory.createProvider(req.provider, settings);
        const providerConfig = settings.providers[req.provider];
        const supportsVisionOverride =
          req.provider === 'openai-compatible'
            ? providerConfig.customModelSupportsVision
            : req.supportsVisionOverride;

        const hasImages = req.messages.some((m) => m.attachments && m.attachments.length > 0);
        const params = {
          model: req.model,
          messages: req.messages,
          supportsVisionOverride,
          systemPrompt: req.systemPrompt,
        };

        const sendChunk = (delta: string) => {
          if (!event.sender.isDestroyed()) {
            event.sender.send('chat:stream-chunk', {
              requestId: req.requestId,
              delta,
            });
          }
        };

        const result = hasImages
          ? await provider.sendImageMessage(params, sendChunk, controller.signal)
          : await provider.streamResponse(params, sendChunk, controller.signal);

        if (!event.sender.isDestroyed()) {
          event.sender.send('chat:stream-done', {
            requestId: req.requestId,
            fullText: result.fullText,
          });
        }
      } catch (err) {
        const isAbort =
          controller.signal.aborted ||
          (err instanceof Error && err.name === 'AbortError');

        if (!event.sender.isDestroyed()) {
          if (isAbort) {
            event.sender.send('chat:stream-done', {
              requestId: req.requestId,
              fullText: '',
            });
          } else {
            event.sender.send('chat:stream-error', {
              requestId: req.requestId,
              error: err instanceof Error ? err.message : 'AI provider request failed.',
            });
          }
        }
      } finally {
        providerFactory.finishRequest(req.requestId);
      }
    })();

    return { accepted: true };
  });

  ipcMain.handle('chat:cancel', async (_event, requestId: unknown) => {
    if (typeof requestId === 'string' && requestId.trim().length > 0) {
      providerFactory.cancelRequest(requestId);
    }
  });
}
