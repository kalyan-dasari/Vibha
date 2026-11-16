import path from 'node:path';
import { BrowserWindow, app } from 'electron';

export interface WidgetWindowOptions {
  preloadPath: string;
  rendererDevUrl?: string;
  rendererDistHtml: string;
  hideFromTaskbar: boolean;
  initialBounds: { x: number; y: number; width: number; height: number };
  startHidden?: boolean;
  isQuitting?: () => boolean;
}

export function createWidgetWindow(opts: WidgetWindowOptions): BrowserWindow {
  const win = new BrowserWindow({
    x: opts.initialBounds.x,
    y: opts.initialBounds.y,
    width: opts.initialBounds.width,
    height: opts.initialBounds.height,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: opts.hideFromTaskbar,
    hasShadow: false,
    show: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: opts.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      webviewTag: false,
      devTools: !app.isPackaged,
    },
  });

  // Use 'screen-saver' level on Windows so widget stays reliably above normal windows
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  if (opts.rendererDevUrl) {
    void win.loadURL(opts.rendererDevUrl);
  } else {
    void win.loadFile(opts.rendererDistHtml);
  }

  win.once('ready-to-show', () => {
    if (!opts.startHidden) {
      win.showInactive();
    }
  });

  // Keep Vibha alive in system tray when user or system requests close
  win.on('close', (event) => {
    if (!opts.isQuitting?.()) {
      event.preventDefault();
      win.hide();
    }
  });

  // Guard against accidental navigation outside the app bundle
  win.webContents.on('will-navigate', (event, targetUrl) => {
    const allowedOrigin = opts.rendererDevUrl
      ? new URL(opts.rendererDevUrl).origin
      : 'file://';
    if (!targetUrl.startsWith(allowedOrigin)) {
      event.preventDefault();
    }
  });

  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  return win;
}

export function resolvePreloadPath(): string {
  return path.join(__dirname, '../preload/index.cjs');
}
