import { ipcMain } from 'electron';
import type { CaptureFullscreenPayload, CaptureWindowPayload } from '../../shared/types.ts';
import type { CaptureService } from '../services/screen/captureService.ts';
import type { SettingsService } from '../services/security/settingsService.ts';

export function registerCaptureHandlers(deps: {
  captureService: CaptureService;
  settingsService: SettingsService;
}): void {
  const { captureService, settingsService } = deps;

  ipcMain.handle('capture:get-displays', () => {
    return captureService.getDisplays();
  });

  ipcMain.handle('capture:get-windows', async () => {
    return captureService.getWindowSources();
  });

  ipcMain.handle('capture:fullscreen', async (_event, payload?: CaptureFullscreenPayload) => {
    const settings = settingsService.getSettings();
    const displayId =
      payload && typeof payload.displayId === 'number' ? payload.displayId : undefined;
    return captureService.captureFullscreen(settings.capture, displayId);
  });

  ipcMain.handle('capture:window', async (_event, rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return { error: 'Invalid window capture payload.' };
    }
    const payload = rawPayload as Partial<CaptureWindowPayload>;
    if (typeof payload.sourceId !== 'string' || payload.sourceId.trim().length === 0) {
      return { error: 'A target window must be selected.' };
    }
    const settings = settingsService.getSettings();
    return captureService.captureWindow(payload.sourceId, settings.capture);
  });

  ipcMain.handle('capture:area', async (_event, displayId?: unknown) => {
    const settings = settingsService.getSettings();
    const validDisplayId = typeof displayId === 'number' ? displayId : undefined;
    return captureService.captureArea(settings.capture, validDisplayId);
  });
}
