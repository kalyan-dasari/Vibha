import { app, globalShortcut, powerMonitor } from 'electron';
import type { ProviderFactory } from '../services/ai/ProviderFactory.ts';
import type { SettingsService } from '../services/security/settingsService.ts';
import type { WindowManager } from './windowManager.ts';

export class AppLifecycleManager {
  private registeredAccelerator: string | null = null;
  private readonly windowManager: WindowManager;
  private readonly settingsService: SettingsService;
  private readonly providerFactory: ProviderFactory;

  constructor(deps: {
    windowManager: WindowManager;
    settingsService: SettingsService;
    providerFactory: ProviderFactory;
  }) {
    this.windowManager = deps.windowManager;
    this.settingsService = deps.settingsService;
    this.providerFactory = deps.providerFactory;
  }

  enforceSingleInstance(): boolean {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      app.quit();
      return false;
    }

    app.on('second-instance', () => {
      this.windowManager.restoreOrExpand();
    });

    return true;
  }

  applyStartupBehavior(launchOnStartup: boolean): void {
    if (process.platform === 'win32' || process.platform === 'darwin') {
      try {
        app.setLoginItemSettings({
          openAtLogin: launchOnStartup,
          args: launchOnStartup ? ['--hidden'] : [],
        });
      } catch {
        // Ignore in unpackaged dev environment if OS refuses login item registration
      }
    }
  }

  registerGlobalShortcut(accelerator: string): { ok: boolean; error?: string } {
    if (this.registeredAccelerator) {
      globalShortcut.unregister(this.registeredAccelerator);
      this.registeredAccelerator = null;
    }

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.windowManager.toggleFromShortcut();
      });

      if (!success) {
        return {
          ok: false,
          error: `Shortcut "${accelerator}" could not be registered (it may be claimed by another application).`,
        };
      }

      this.registeredAccelerator = accelerator;
      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Failed to register global shortcut.',
      };
    }
  }

  registerPowerAndQuitHandlers(): void {
    powerMonitor.on('resume', () => {
      const settings = this.settingsService.getSettings();
      this.registerGlobalShortcut(settings.globalShortcut);
      this.windowManager.clampCurrentWindowToNearestDisplay();
    });

    app.on('window-all-closed', () => {
      // Keep running when hidden/collapsed on Windows; quit explicitly via Exit
      if (process.platform !== 'darwin' && !this.windowManager.getWidgetWindow()) {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.providerFactory.cancelAll();
      globalShortcut.unregisterAll();
    });
  }
}
