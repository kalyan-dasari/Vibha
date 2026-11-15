import { useCallback, useEffect } from 'react';
import { getBridge } from '../services/electronBridge.ts';
import { useSettingsStore } from '../stores/settingsStore.ts';
import type {
  AIProviderId,
  AppSettings,
  SaveCredentialPayload,
  TestConnectionPayload,
} from '../types/index.ts';

export function useSettings() {
  const snapshot = useSettingsStore((s) => s.snapshot);
  const loading = useSettingsStore((s) => s.loading);
  const settingsOpen = useSettingsStore((s) => s.settingsOpen);
  const activeTab = useSettingsStore((s) => s.activeTab);
  const modelsByProvider = useSettingsStore((s) => s.modelsByProvider);
  const expanded = useSettingsStore((s) => s.expanded);

  const setSnapshot = useSettingsStore((s) => s.setSnapshot);
  const setLoading = useSettingsStore((s) => s.setLoading);
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  const setActiveTab = useSettingsStore((s) => s.setActiveTab);
  const setModelsForProvider = useSettingsStore((s) => s.setModelsForProvider);
  const setExpanded = useSettingsStore((s) => s.setExpanded);

  const reloadSnapshot = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) return;
    setLoading(true);
    try {
      const next = await bridge.settings.getSnapshot();
      setSnapshot(next);
      const state = await bridge.window.getState();
      setExpanded(state.expanded);
    } finally {
      setLoading(false);
    }
  }, [setExpanded, setLoading, setSnapshot]);

  useEffect(() => {
    void reloadSnapshot();
    const bridge = getBridge();
    if (!bridge) return;
    return bridge.window.onExpandedChange((isExpanded) => {
      setExpanded(isExpanded);
    });
  }, [reloadSnapshot, setExpanded]);

  const updateSettings = useCallback(
    async (partial: Partial<AppSettings>): Promise<{ ok: boolean; error?: string }> => {
      const bridge = getBridge();
      if (!bridge) {
        // Update theme & active provider in-memory for browser layout inspection only
        const merged = {
          ...snapshot.settings,
          ...partial,
          providers: partial.providers
            ? { ...snapshot.settings.providers, ...partial.providers }
            : snapshot.settings.providers,
          capture: partial.capture
            ? { ...snapshot.settings.capture, ...partial.capture }
            : snapshot.settings.capture,
        };
        setSnapshot({ ...snapshot, settings: merged });
        return { ok: true };
      }

      const res = await bridge.settings.update(partial);
      setSnapshot(res.snapshot);
      return { ok: res.ok, error: res.error };
    },
    [setSnapshot, snapshot]
  );

  const saveCredential = useCallback(
    async (payload: SaveCredentialPayload) => {
      const bridge = getBridge();
      if (!bridge) {
        return {
          ok: false,
          error: 'Credential encryption requires the Electron Windows desktop runtime (safeStorage).',
        };
      }
      const res = await bridge.settings.saveCredential(payload);
      if (res.ok) {
        const nextSnap = await bridge.settings.getSnapshot();
        setSnapshot(nextSnap);
      }
      return { ok: res.ok, error: res.error };
    },
    [setSnapshot]
  );

  const deleteCredential = useCallback(
    async (provider: AIProviderId) => {
      const bridge = getBridge();
      if (!bridge) return { ok: false, error: 'Electron runtime required.' };
      const res = await bridge.settings.deleteCredential(provider);
      if (res.ok) {
        const nextSnap = await bridge.settings.getSnapshot();
        setSnapshot(nextSnap);
      }
      return { ok: res.ok, error: res.error };
    },
    [setSnapshot]
  );

  const testConnection = useCallback(async (payload: TestConnectionPayload) => {
    const bridge = getBridge();
    if (!bridge) {
      return {
        ok: false,
        message: 'Connection testing runs in the Electron main process. Launch with Electron to test your API key.',
      };
    }
    return bridge.settings.testConnection(payload);
  }, []);

  const refreshModels = useCallback(
    async (provider: AIProviderId, customBaseUrl?: string) => {
      const bridge = getBridge();
      if (!bridge) {
        return {
          ok: false,
          models: modelsByProvider[provider] ?? [],
          error: 'Dynamic model discovery requires the Electron main process.',
        };
      }
      const res = await bridge.settings.listModels(provider, customBaseUrl);
      if (res.ok && res.models.length > 0) {
        setModelsForProvider(provider, res.models);
      }
      return res;
    },
    [modelsByProvider, setModelsForProvider]
  );

  const toggleExpanded = useCallback(
    async (next: boolean) => {
      const bridge = getBridge();
      setExpanded(next);
      if (bridge) {
        await bridge.window.setExpanded(next);
      }
    },
    [setExpanded]
  );

  const hideWindow = useCallback(async () => {
    const bridge = getBridge();
    if (bridge) {
      await bridge.window.hide();
    } else {
      setExpanded(false);
    }
  }, [setExpanded]);

  const minimizeWindow = useCallback(async () => {
    const bridge = getBridge();
    setExpanded(false);
    if (bridge) {
      await bridge.window.minimize();
    }
  }, [setExpanded]);

  return {
    snapshot,
    settings: snapshot.settings,
    credentials: snapshot.credentials,
    platform: snapshot.platform,
    loading,
    settingsOpen,
    activeTab,
    modelsByProvider,
    expanded,
    setSettingsOpen,
    setActiveTab,
    updateSettings,
    saveCredential,
    deleteCredential,
    testConnection,
    refreshModels,
    toggleExpanded,
    hideWindow,
    minimizeWindow,
    reloadSnapshot,
  };
}
