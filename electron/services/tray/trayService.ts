import fs from 'node:fs';
import path from 'node:path';
import { Menu, Tray, app, nativeImage } from 'electron';
import type { WindowManager } from '../../main/windowManager.ts';

export function resolveTrayIconPath(customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  const appPath = typeof app?.getAppPath === 'function' ? app.getAppPath() : process.cwd();
  const resourcesDir = app?.isPackaged ? process.resourcesPath : appPath;

  const candidates = [
    path.join(resourcesDir, 'resources', 'icons', 'icon.ico'),
    path.join(resourcesDir, 'resources', 'icons', 'icon.png'),
    path.join(appPath, 'resources', 'icons', 'icon.ico'),
    path.join(appPath, 'resources', 'icons', 'icon.png'),
    path.resolve(__dirname, '../../resources/icons/icon.ico'),
    path.resolve(__dirname, '../../resources/icons/icon.png'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return '';
}

export interface TrayServiceDeps {
  windowManager: WindowManager;
  onQuit?: () => void;
  iconPath?: string;
}

export class TrayService {
  private tray: Tray | null = null;
  private readonly windowManager: WindowManager;
  private readonly onQuit: () => void;
  private readonly iconPath?: string;

  constructor(deps: TrayServiceDeps) {
    this.windowManager = deps.windowManager;
    this.onQuit = deps.onQuit ?? (() => app.quit());
    this.iconPath = deps.iconPath;
  }

  initTray(): Tray {
    if (this.tray && !this.tray.isDestroyed()) {
      return this.tray;
    }

    if (this.tray) {
      try {
        this.tray.destroy();
      } catch {
        // Safe catch for previously destroyed instance
      }
      this.tray = null;
    }

    const iconFile = resolveTrayIconPath(this.iconPath);
    let trayIcon: Electron.NativeImage;
    if (iconFile) {
      trayIcon = nativeImage.createFromPath(iconFile);
    } else {
      trayIcon = nativeImage.createEmpty();
    }

    const tray = new Tray(trayIcon);
    tray.setToolTip('Vibha');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Vibha',
        click: () => {
          this.windowManager.restoreOrExpand();
        },
      },
      {
        label: 'Hide Vibha',
        click: () => {
          this.windowManager.hide();
        },
      },
      {
        label: 'Settings',
        click: () => {
          this.windowManager.openSettings();
        },
      },
      { type: 'separator' },
      {
        label: 'Quit Vibha',
        click: () => {
          this.onQuit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      this.windowManager.toggleVisibility();
    });

    tray.on('double-click', () => {
      this.windowManager.restoreOrExpand();
    });

    this.tray = tray;
    return tray;
  }

  getTray(): Tray | null {
    return this.tray && !this.tray.isDestroyed() ? this.tray : null;
  }

  destroy(): void {
    if (this.tray && !this.tray.isDestroyed()) {
      try {
        this.tray.destroy();
      } catch {
        // Safe catch during teardown
      }
    }
    this.tray = null;
  }
}
