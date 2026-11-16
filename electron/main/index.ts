import path from 'node:path';
import { app, ipcMain, safeStorage } from 'electron';
import type { WindowExpandPayload, WindowMovePayload } from '../../shared/types.ts';
import { registerCaptureHandlers } from '../ipc/captureHandlers.ts';
import { registerChatHandlers } from '../ipc/chatHandlers.ts';
import { registerSettingsHandlers } from '../ipc/settingsHandlers.ts';
import { ProviderFactory } from '../services/ai/ProviderFactory.ts';
import { CaptureService } from '../services/screen/captureService.ts';
import { MonitorService } from '../services/screen/monitorService.ts';
import { CredentialService } from '../services/security/credentialService.ts';
import { SettingsService } from '../services/security/settingsService.ts';
import { TrayService } from '../services/tray/trayService.ts';
import { resolvePreloadPath } from '../windows/widgetWindow.ts';
import { AppLifecycleManager } from './appLifecycle.ts';
import { WindowManager } from './windowManager.ts';

function bootstrap(): void {
  const userDataDir = app.getPath('userData');
  const settingsService = new SettingsService(userDataDir);
  const credentialService = new CredentialService(userDataDir, safeStorage);
  const providerFactory = new ProviderFactory(credentialService);
  const monitorService = new MonitorService();

  const rendererDevUrl = process.env.ELECTRON_RENDERER_URL;
  const rendererDistHtml = path.join(__dirname, '../../dist/index.html');
  const preloadPath = resolvePreloadPath();

  const windowManager = new WindowManager({
    preloadPath,
    rendererDevUrl,
    rendererDistHtml,
    settingsService,
  });

  const lifecycleManager = new AppLifecycleManager({
    windowManager,
    settingsService,
    providerFactory,
  });

  if (!lifecycleManager.enforceSingleInstance()) {
    return;
  }

  const captureService = new CaptureService({
    monitorService,
    windowManager,
    preloadPath,
    rendererDevUrl,
    rendererDistHtml,
  });

  app.whenReady().then(() => {
    const settings = settingsService.getSettings();

    ipcMain.handle('window:set-expanded', (_event, payload: unknown) => {
      const expanded =
        Boolean(payload && typeof payload === 'object' && (payload as WindowExpandPayload).expanded);
      windowManager.setExpanded(expanded);
    });

    ipcMain.handle('window:move-by', (_event, payload: unknown) => {
      if (!payload || typeof payload !== 'object') return;
      const { deltaX, deltaY } = payload as Partial<WindowMovePayload>;
      if (typeof deltaX === 'number' && typeof deltaY === 'number') {
        windowManager.moveBy(deltaX, deltaY);
      }
    });

    ipcMain.handle('window:hide', () => {
      windowManager.hide();
    });

    ipcMain.handle('window:minimize', () => {
      windowManager.minimizeToOrb();
    });

    ipcMain.handle('window:get-state', () => {
      return { expanded: windowManager.isExpanded() };
    });

    registerChatHandlers({ providerFactory, settingsService });
    registerSettingsHandlers({
      settingsService,
      credentialService,
      providerFactory,
      windowManager,
      lifecycleManager,
    });
    registerCaptureHandlers({ captureService, settingsService });

    const trayService = new TrayService({
      windowManager,
      onQuit: () => {
        lifecycleManager.prepareQuit();
        app.quit();
      },
    });
    lifecycleManager.setTrayService(trayService);
    trayService.initTray();

    const isHiddenStartup = process.argv.includes('--hidden');
    windowManager.initWidget({ startHidden: isHiddenStartup });
    lifecycleManager.registerGlobalShortcut(settings.globalShortcut);
    lifecycleManager.applyStartupBehavior(settings.launchOnStartup);
    lifecycleManager.registerPowerAndQuitHandlers();
  });
}

bootstrap();
