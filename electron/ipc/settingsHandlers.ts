import { app, ipcMain } from 'electron';
import type { SafeSettingsSnapshot, SaveCredentialPayload, TestConnectionPayload } from '../../shared/types.ts';
import type { AppLifecycleManager } from '../main/appLifecycle.ts';
import type { WindowManager } from '../main/windowManager.ts';
import type { ProviderFactory } from '../services/ai/ProviderFactory.ts';
import type { CredentialService } from '../services/security/credentialService.ts';
import type { SettingsService } from '../services/security/settingsService.ts';
import { isValidProviderId, validateEndpointUrl } from '../services/security/validators.ts';

export function buildSafeSnapshot(
  settingsService: SettingsService,
  credentialService: CredentialService
): SafeSettingsSnapshot {
  return {
    settings: settingsService.getSettings(),
    credentials: credentialService.getAllSafeStatuses(),
    platform: {
      os: `${process.platform} (${process.arch})`,
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron ?? 'unknown',
      encryptionAvailable: credentialService.isEncryptionAvailable(),
    },
  };
}

export function registerSettingsHandlers(deps: {
  settingsService: SettingsService;
  credentialService: CredentialService;
  providerFactory: ProviderFactory;
  windowManager: WindowManager;
  lifecycleManager: AppLifecycleManager;
}): void {
  const {
    settingsService,
    credentialService,
    providerFactory,
    windowManager,
    lifecycleManager,
  } = deps;

  ipcMain.handle('settings:get-snapshot', () => {
    return buildSafeSnapshot(settingsService, credentialService);
  });

  ipcMain.handle('settings:update', (_event, partial: unknown) => {
    const prev = settingsService.getSettings();
    const res = settingsService.updateSettings(partial);
    if (!res.ok) {
      return {
        ok: false,
        snapshot: buildSafeSnapshot(settingsService, credentialService),
        error: res.error,
      };
    }

    if (res.settings.globalShortcut !== prev.globalShortcut) {
      const reg = lifecycleManager.registerGlobalShortcut(res.settings.globalShortcut);
      if (!reg.ok) {
        // Revert shortcut setting if OS rejected registration
        settingsService.updateSettings({ globalShortcut: prev.globalShortcut });
        lifecycleManager.registerGlobalShortcut(prev.globalShortcut);
        return {
          ok: false,
          snapshot: buildSafeSnapshot(settingsService, credentialService),
          error: reg.error,
        };
      }
    }

    if (res.settings.launchOnStartup !== prev.launchOnStartup) {
      lifecycleManager.applyStartupBehavior(res.settings.launchOnStartup);
    }

    if (res.settings.hideFromTaskbar !== prev.hideFromTaskbar) {
      windowManager.applyTaskbarVisibility(res.settings.hideFromTaskbar);
    }

    return {
      ok: true,
      snapshot: buildSafeSnapshot(settingsService, credentialService),
    };
  });

  ipcMain.handle('settings:save-credential', (_event, rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return {
        ok: false,
        status: credentialService.getSafeStatus('gemini'),
        error: 'Invalid credential payload.',
      };
    }
    const payload = rawPayload as Partial<SaveCredentialPayload>;
    if (!isValidProviderId(payload.provider) || typeof payload.apiKey !== 'string') {
      return {
        ok: false,
        status: credentialService.getSafeStatus('gemini'),
        error: 'Provider and API key are required.',
      };
    }
    const providerId = payload.provider;

    try {
      const status = credentialService.saveCredential(providerId, payload.apiKey);
      return { ok: true, status };
    } catch (err) {
      return {
        ok: false,
        status: credentialService.getSafeStatus(providerId),
        error: err instanceof Error ? err.message : 'Failed to encrypt and save credential.',
      };
    }
  });

  ipcMain.handle('settings:delete-credential', (_event, provider: unknown) => {
    if (!isValidProviderId(provider)) {
      return {
        ok: false,
        status: credentialService.getSafeStatus('gemini'),
        error: 'Invalid provider ID.',
      };
    }
    const status = credentialService.deleteCredential(provider);
    return { ok: true, status };
  });

  ipcMain.handle('settings:test-connection', async (_event, rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return { ok: false, message: 'Invalid connection test request.' };
    }
    const payload = rawPayload as Partial<TestConnectionPayload>;
    if (!isValidProviderId(payload.provider)) {
      return { ok: false, message: 'Unsupported AI provider.' };
    }
    const providerId = payload.provider;

    if (providerId === 'openai-compatible' && payload.customBaseUrl) {
      const urlCheck = validateEndpointUrl(payload.customBaseUrl);
      if (!urlCheck.valid) {
        return { ok: false, message: urlCheck.error ?? 'Invalid custom base URL.' };
      }
    }

    try {
      const settings = settingsService.getSettings();
      const provider = providerFactory.createProvider(providerId, settings, {
        apiKeyOverride:
          typeof payload.apiKeyOverride === 'string' && payload.apiKeyOverride.trim().length > 0
            ? payload.apiKeyOverride
            : undefined,
        customBaseUrlOverride:
          typeof payload.customBaseUrl === 'string' && payload.customBaseUrl.trim().length > 0
            ? payload.customBaseUrl
            : undefined,
      });
      return await provider.validateCredentials();
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Connection test failed.',
      };
    }
  });

  ipcMain.handle('settings:list-models', async (_event, rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== 'object') {
      return { ok: false, models: [], error: 'Invalid model discovery request.' };
    }
    const payload = rawPayload as { provider?: unknown; customBaseUrl?: unknown };
    if (!isValidProviderId(payload.provider)) {
      return { ok: false, models: [], error: 'Unsupported AI provider.' };
    }
    const providerId = payload.provider;

    if (providerId === 'openai-compatible' && typeof payload.customBaseUrl === 'string' && payload.customBaseUrl.trim()) {
      const urlCheck = validateEndpointUrl(payload.customBaseUrl);
      if (!urlCheck.valid) {
        return { ok: false, models: [], error: urlCheck.error };
      }
    }

    try {
      const settings = settingsService.getSettings();
      const provider = providerFactory.createProvider(providerId, settings, {
        customBaseUrlOverride:
          typeof payload.customBaseUrl === 'string' && payload.customBaseUrl.trim().length > 0
            ? payload.customBaseUrl
            : undefined,
      });
      const models = await provider.getModels();
      return { ok: true, models };
    } catch (err) {
      return {
        ok: false,
        models: [],
        error: err instanceof Error ? err.message : 'Failed to load models from provider.',
      };
    }
  });
}
