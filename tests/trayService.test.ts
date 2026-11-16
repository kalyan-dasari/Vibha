import { beforeEach, describe, expect, it, vi } from 'vitest';

const { MockTray, mockBuildFromTemplate, mockTrayInstances } = vi.hoisted(() => {
  const instances: any[] = [];

  class MockTrayClass {
    tooltip = '';
    menu: any = null;
    destroyed = false;
    listeners: Record<string, Function[]> = {};

    constructor(public image: any) {
      instances.push(this);
    }

    setToolTip(tip: string) {
      this.tooltip = tip;
    }

    setContextMenu(menu: any) {
      this.menu = menu;
    }

    on(event: string, fn: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(fn);
    }

    emit(event: string, ...args: any[]) {
      this.listeners[event]?.forEach((fn) => fn(...args));
    }

    destroy() {
      this.destroyed = true;
    }

    isDestroyed() {
      return this.destroyed;
    }
  }

  return {
    MockTray: MockTrayClass,
    mockBuildFromTemplate: vi.fn((template: any[]) => ({ template })),
    mockTrayInstances: instances,
  };
});

vi.mock('electron', () => {
  return {
    Tray: MockTray,
    Menu: {
      buildFromTemplate: (template: any[]) => mockBuildFromTemplate(template),
    },
    nativeImage: {
      createFromPath: vi.fn((p: string) => ({ path: p, isEmpty: () => false })),
      createEmpty: vi.fn(() => ({ path: '', isEmpty: () => true })),
    },
    app: {
      isPackaged: false,
      getAppPath: () => process.cwd(),
      quit: vi.fn(),
    },
  };
});

import { TrayService } from '../electron/services/tray/trayService.ts';

describe('TrayService (Windows System Tray)', () => {
  let mockWindowManager: any;
  let onQuitMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockTrayInstances.length = 0;
    mockWindowManager = {
      restoreOrExpand: vi.fn(),
      hide: vi.fn(),
      openSettings: vi.fn(),
      toggleVisibility: vi.fn(),
    };
    onQuitMock = vi.fn();
  });

  it('initializes tray with Vibha tooltip and context menu', () => {
    const service = new TrayService({
      windowManager: mockWindowManager,
      onQuit: onQuitMock,
    });

    const tray = service.initTray() as any;
    expect(tray).toBeDefined();
    expect(tray.tooltip).toBe('Vibha');
    expect(mockBuildFromTemplate).toHaveBeenCalled();

    const menuTemplate = mockBuildFromTemplate.mock.calls[0][0];
    const labels = menuTemplate.map((item: any) => item.label ?? (item.type === 'separator' ? '---' : ''));
    expect(labels).toEqual(['Open Vibha', 'Hide Vibha', 'Settings', '---', 'Quit Vibha']);
  });

  it('prevents duplicate tray instances when initTray is called repeatedly', () => {
    const service = new TrayService({
      windowManager: mockWindowManager,
      onQuit: onQuitMock,
    });

    const tray1 = service.initTray();
    const tray2 = service.initTray();

    expect(tray1).toBe(tray2);
    expect(mockTrayInstances.length).toBe(1);
    expect(service.getTray()).toBe(tray1);
  });

  it('dispatches tray menu actions to windowManager and quit handler', () => {
    const service = new TrayService({
      windowManager: mockWindowManager,
      onQuit: onQuitMock,
    });

    service.initTray();
    const menuTemplate = mockBuildFromTemplate.mock.calls[0][0];

    const openItem = menuTemplate.find((i: any) => i.label === 'Open Vibha');
    const hideItem = menuTemplate.find((i: any) => i.label === 'Hide Vibha');
    const settingsItem = menuTemplate.find((i: any) => i.label === 'Settings');
    const quitItem = menuTemplate.find((i: any) => i.label === 'Quit Vibha');

    openItem.click();
    expect(mockWindowManager.restoreOrExpand).toHaveBeenCalledTimes(1);

    hideItem.click();
    expect(mockWindowManager.hide).toHaveBeenCalledTimes(1);

    settingsItem.click();
    expect(mockWindowManager.openSettings).toHaveBeenCalledTimes(1);

    quitItem.click();
    expect(onQuitMock).toHaveBeenCalledTimes(1);
  });

  it('toggles widget visibility when tray icon is clicked', () => {
    const service = new TrayService({
      windowManager: mockWindowManager,
      onQuit: onQuitMock,
    });

    const tray = service.initTray() as any;
    tray.emit('click');
    expect(mockWindowManager.toggleVisibility).toHaveBeenCalledTimes(1);

    tray.emit('double-click');
    expect(mockWindowManager.restoreOrExpand).toHaveBeenCalledTimes(1);
  });

  it('completely destroys tray instance on quit/teardown', () => {
    const service = new TrayService({
      windowManager: mockWindowManager,
      onQuit: onQuitMock,
    });

    const tray = service.initTray() as any;
    expect(tray.isDestroyed()).toBe(false);

    service.destroy();
    expect(tray.isDestroyed()).toBe(true);
    expect(service.getTray()).toBeNull();

    // Calling destroy again should be safe and idempotent
    expect(() => service.destroy()).not.toThrow();
  });
});
