import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGlobalShortcut,
  mockPowerMonitor,
  mockApp,
} = vi.hoisted(() => {
  const registered = new Map<string, Function>();
  const powerListeners: Record<string, Function[]> = {};
  const appListeners: Record<string, Function[]> = {};

  return {
    mockGlobalShortcut: {
      registeredMap: registered,
      registerAllowed: true,
      register: vi.fn((acc: string, cb: Function) => {
        if (!mockGlobalShortcut.registerAllowed) {
          return false;
        }
        registered.set(acc, cb);
        return true;
      }),
      unregister: vi.fn((acc: string) => {
        registered.delete(acc);
      }),
      unregisterAll: vi.fn(() => {
        registered.clear();
      }),
      isRegistered: vi.fn((acc: string) => registered.has(acc)),
    },
    mockPowerMonitor: {
      listeners: powerListeners,
      on: vi.fn((event: string, cb: Function) => {
        if (!powerListeners[event]) powerListeners[event] = [];
        powerListeners[event].push(cb);
      }),
      emit: (event: string, ...args: any[]) => {
        powerListeners[event]?.forEach((cb) => cb(...args));
      },
    },
    mockApp: {
      listeners: appListeners,
      on: vi.fn((event: string, cb: Function) => {
        if (!appListeners[event]) appListeners[event] = [];
        appListeners[event].push(cb);
      }),
      emit: (event: string, ...args: any[]) => {
        appListeners[event]?.forEach((cb) => cb(...args));
      },
      requestSingleInstanceLock: vi.fn(() => true),
      setLoginItemSettings: vi.fn(),
      quit: vi.fn(),
    },
  };
});

vi.mock('electron', () => {
  return {
    globalShortcut: mockGlobalShortcut,
    powerMonitor: mockPowerMonitor,
    app: mockApp,
  };
});

import { AppLifecycleManager, RECOMMENDED_SHORTCUT_ALTERNATIVES } from '../electron/main/appLifecycle.ts';

describe('Global Shortcut Recovery & Lifecycle (appLifecycle)', () => {
  let mockWindowManager: any;
  let mockSettingsService: any;
  let mockProviderFactory: any;
  let currentSettings: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGlobalShortcut.registeredMap.clear();
    mockGlobalShortcut.registerAllowed = true;
    mockPowerMonitor.listeners.resume = [];
    mockApp.listeners['before-quit'] = [];
    mockApp.listeners['window-all-closed'] = [];

    currentSettings = {
      globalShortcut: 'CommandOrControl+Space',
      launchOnStartup: false,
      hideFromTaskbar: true,
    };

    mockSettingsService = {
      getSettings: vi.fn(() => currentSettings),
      updateSettings: vi.fn((partial: any) => {
        currentSettings = { ...currentSettings, ...partial };
        return { ok: true, settings: currentSettings };
      }),
    };

    mockWindowManager = {
      restoreOrExpand: vi.fn(),
      hide: vi.fn(),
      openSettings: vi.fn(),
      toggleFromShortcut: vi.fn(),
      clampCurrentWindowToNearestDisplay: vi.fn(),
      setIsQuittingCallback: vi.fn(),
    };

    mockProviderFactory = {
      cancelAll: vi.fn(),
    };
  });

  it('registers configured global shortcut successfully', () => {
    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
    });

    const res = lifecycle.registerGlobalShortcut('CommandOrControl+Space');
    expect(res.ok).toBe(true);
    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Space', expect.any(Function));

    const status = lifecycle.getShortcutStatus();
    expect(status.registered).toBe(true);
    expect(status.currentShortcut).toBe('CommandOrControl+Space');
    expect(status.error).toBeUndefined();
    expect(status.suggestedAlternatives).not.toContain('CommandOrControl+Space');
  });

  it('detects registration failure, reports error, and offers suggested alternatives without silent overwrite', () => {
    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
    });

    // Simulate OS conflict where registration returns false
    mockGlobalShortcut.registerAllowed = false;

    const res = lifecycle.registerGlobalShortcut('Alt+Space');
    expect(res.ok).toBe(false);
    expect(res.error).toContain('could not be registered');

    const status = lifecycle.getShortcutStatus();
    expect(status.registered).toBe(false);
    expect(status.currentShortcut).toBe('Alt+Space'); // Preserved user's intent!
    expect(status.error).toContain('could not be registered');
    expect(status.suggestedAlternatives.length).toBeGreaterThan(0);
    expect(status.suggestedAlternatives).toContain('CommandOrControl+Shift+Space');
  });

  it('properly unregisters previous shortcut when registering a new one', () => {
    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
    });

    lifecycle.registerGlobalShortcut('CommandOrControl+Space');
    expect(mockGlobalShortcut.registeredMap.has('CommandOrControl+Space')).toBe(true);

    // Switch to another shortcut
    lifecycle.registerGlobalShortcut('CommandOrControl+Shift+Space');
    expect(mockGlobalShortcut.unregister).toHaveBeenCalledWith('CommandOrControl+Space');
    expect(mockGlobalShortcut.registeredMap.has('CommandOrControl+Shift+Space')).toBe(true);
  });

  it('re-registers global shortcut and reclamps window display after system resume', () => {
    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
    });

    lifecycle.registerPowerAndQuitHandlers();
    lifecycle.registerGlobalShortcut('CommandOrControl+Space');

    // Simulate system going to sleep (clearing OS registrations) then resuming
    mockGlobalShortcut.registeredMap.clear();
    mockPowerMonitor.emit('resume');

    expect(mockGlobalShortcut.register).toHaveBeenCalledWith('CommandOrControl+Space', expect.any(Function));
    expect(mockWindowManager.clampCurrentWindowToNearestDisplay).toHaveBeenCalled();
  });

  it('cleans up resources and unregisters all global shortcuts before app quit', () => {
    const mockTrayService: any = {
      destroy: vi.fn(),
    };

    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
      trayService: mockTrayService,
    });

    lifecycle.registerPowerAndQuitHandlers();
    lifecycle.registerGlobalShortcut('CommandOrControl+Space');

    expect(lifecycle.isQuitting()).toBe(false);

    // Trigger before-quit
    mockApp.emit('before-quit');

    expect(lifecycle.isQuitting()).toBe(true);
    expect(mockTrayService.destroy).toHaveBeenCalled();
    expect(mockProviderFactory.cancelAll).toHaveBeenCalled();
    expect(mockGlobalShortcut.unregisterAll).toHaveBeenCalled();
  });

  it('does not quit application when windows close unless app is quitting', () => {
    const lifecycle = new AppLifecycleManager({
      windowManager: mockWindowManager,
      settingsService: mockSettingsService,
      providerFactory: mockProviderFactory,
    });

    lifecycle.registerPowerAndQuitHandlers();

    // Normal window close while app is active
    mockApp.emit('window-all-closed');
    expect(mockApp.quit).not.toHaveBeenCalled();

    // Now after explicit quit initiation
    lifecycle.prepareQuit();
    mockApp.emit('window-all-closed');
    expect(mockApp.quit).toHaveBeenCalled();
  });
});
