import { BrowserWindow, app, ipcMain } from 'electron';
import type { CaptureAreaResult, DisplayInfo } from '../../shared/types.ts';

export interface CaptureOverlayOptions {
  display: DisplayInfo;
  preloadPath: string;
  rendererDevUrl?: string;
  rendererDistHtml: string;
}

export function openCaptureOverlay(opts: CaptureOverlayOptions): Promise<CaptureAreaResult | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: CaptureAreaResult | null) => {
      if (settled) return;
      settled = true;
      ipcMain.removeListener('capture:submit-area', onSubmit);
      if (!overlayWin.isDestroyed()) {
        overlayWin.close();
      }
      resolve(result);
    };

    const overlayWin = new BrowserWindow({
      x: opts.display.bounds.x,
      y: opts.display.bounds.y,
      width: opts.display.bounds.width,
      height: opts.display.bounds.height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      enableLargerThanScreen: true,
      focusable: true,
      backgroundColor: '#00000000',
      webPreferences: {
        preload: opts.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        devTools: !app.isPackaged,
      },
    });

    overlayWin.setAlwaysOnTop(true, 'screen-saver');

    const onSubmit = (_event: Electron.IpcMainEvent, selection: CaptureAreaResult | null) => {
      if (selection && typeof selection.width === 'number' && typeof selection.height === 'number') {
        finish({
          x: selection.x,
          y: selection.y,
          width: selection.width,
          height: selection.height,
          displayId: opts.display.id,
          scaleFactor: opts.display.scaleFactor,
        });
      } else {
        finish(null);
      }
    };

    ipcMain.on('capture:submit-area', onSubmit);

    overlayWin.on('closed', () => {
      finish(null);
    });

    overlayWin.on('blur', () => {
      // Allow Escape/Cancel cleanly without abruptly closing on initial focus settle
    });

    const queryParams = `view=capture-overlay&displayId=${encodeURIComponent(
      String(opts.display.id)
    )}&scaleFactor=${encodeURIComponent(String(opts.display.scaleFactor))}`;

    if (opts.rendererDevUrl) {
      const sep = opts.rendererDevUrl.includes('?') ? '&' : '?';
      void overlayWin.loadURL(`${opts.rendererDevUrl}${sep}${queryParams}`);
    } else {
      void overlayWin.loadFile(opts.rendererDistHtml, {
        search: queryParams,
      });
    }

    overlayWin.once('ready-to-show', () => {
      overlayWin.show();
      overlayWin.focus();
    });
  });
}
