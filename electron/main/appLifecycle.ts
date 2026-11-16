import { app, globalShortcut, powerMonitor } from 'electron';
import type { ShortcutStatus } from '../../shared/types.ts';
import type { ProviderFactory } from '../services/ai/ProviderFactory.ts';
import type { SettingsService } from '../services/security/settingsService.ts';
import type { TrayService } from '../services/tray/trayService.ts';
import type { WindowManager } from './windowManager.ts';

export const RECOMMENDED_SHORTCUT_ALTERNATIVES = [
  'CommandOrControl+Shift+Space',
  'Alt+Space',
  'CommandOrControl+Alt+Space',
  'CommandOrControl+Shift+V',
  'CommandOrControl+F12',
];

export class AppLifecycleManager {
  private configuredShortcut: string = 'CommandOrControl+Space';
  private registeredAccelerator: string | null = null;
  private lastRegistrationError: string | null = null;
  private isAppQuitting = false;

  private readonly windowManager: WindowManager;
  private readonly settingsService: SettingsService;
  private readonly providerFactory: ProviderFactory;
  private trayService?: TrayService;

  constructor(deps: {
    windowManager: WindowManager;
    settingsService: SettingsService;
    providerFactory: ProviderFactory;
    trayService?: TrayService;
  }) {
    this.windowManager = deps.windowManager;
    this.settingsService = deps.settingsService;
    this.providerFactory = deps.providerFactory;
    this.trayService = deps.trayService;
    this.configuredShortcut = deps.settingsService.getSettings().globalShortcut;

    // Connect quit callback to windowManager so window close events don't terminate app
    this.windowManager.setIsQuittingCallback(() => this.isQuitting());
  }

  setTrayService(trayService: TrayService): void {
    this.trayService = trayService;
  }

  isQuitting(): boolean {
    return this.isAppQuitting;
  }

  prepareQuit(): void {
    this.isAppQuitting = true;
  }

  enforceSingleInstance(): boolean {
    const gotLock = app.requestSingleInstanceLock();
    if (!gotLock) {
      this.isAppQuitting = true;
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

  getShortcutStatus(): ShortcutStatus {
    const isRegistered =
      this.registeredAccelerator !== null &&
      this.registeredAccelerator.toLowerCase() === this.configuredShortcut.toLowerCase();

    return {
      registered: isRegistered,
      currentShortcut: this.configuredShortcut,
      error: this.lastRegistrationError ?? undefined,
      suggestedAlternatives: RECOMMENDED_SHORTCUT_ALTERNATIVES.filter(
        (alt) => alt.toLowerCase() !== this.configuredShortcut.toLowerCase()
      ),
    };
  }

  registerGlobalShortcut(accelerator: string): { ok: boolean; error?: string } {
    this.configuredShortcut = accelerator;

    if (this.registeredAccelerator) {
      try {
        globalShortcut.unregister(this.registeredAccelerator);
      } catch {
        // Safe catch when unregistering previous accelerator
      }
      this.registeredAccelerator = null;
    }

    try {
      const success = globalShortcut.register(accelerator, () => {
        this.windowManager.toggleFromShortcut();
      });

      if (!success) {
        this.registeredAccelerator = null;
        this.lastRegistrationError = `Shortcut "${accelerator}" could not be registered. It may already be in use by another application or reserved by Windows.`;
        return {
          ok: false,
          error: this.lastRegistrationError,
        };
      }

      this.registeredAccelerator = accelerator;
      this.lastRegistrationError = null;
      return { ok: true };
    } catch (err) {
      this.registeredAccelerator = null;
      this.lastRegistrationError =
        err instanceof Error ? err.message : `Failed to register global shortcut "${accelerator}".`;
      return {
        ok: false,
        error: this.lastRegistrationError,
      };
    }
  }

  unregisterGlobalShortcut(): void {
    if (this.registeredAccelerator) {
      try {
        globalShortcut.unregister(this.registeredAccelerator);
      } catch {
        // Safe unregister
      }
      this.registeredAccelerator = null;
    }
  }

  registerPowerAndQuitHandlers(): void {
    powerMonitor.on('resume', () => {
      const settings = this.settingsService.getSettings();
      this.registerGlobalShortcut(settings.globalShortcut);
      this.windowManager.clampCurrentWindowToNearestDisplay();
    });

    app.on('window-all-closed', () => {
      // Vibha resides in the Windows system tray. Hiding or closing windows
      // should not exit the application unless an explicit quit was initiated.
      if (this.isAppQuitting) {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      this.isAppQuitting = true;
      this.trayService?.destroy();
      this.providerFactory.cancelAll();
      this.unregisterGlobalShortcut();
      try {
        globalShortcut.unregisterAll();
      } catch {
        // Safe catch on app teardown
      }
    });
  }
}
