import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  AIModelInfo,
  AIProviderId,
  AppSettings,
  DisplayInfo,
  SafeSettingsSnapshot,
  ScreenshotQuality,
  SettingsTabId,
  TestConnectionPayload,
  TestConnectionResult,
} from '../types/index.ts';

interface SettingsPanelProps {
  snapshot: SafeSettingsSnapshot;
  activeTab: SettingsTabId;
  modelsByProvider: Partial<Record<AIProviderId, AIModelInfo[]>>;
  displays: DisplayInfo[];
  onLoadDisplays: () => Promise<DisplayInfo[]>;
  onChangeTab: (tab: SettingsTabId) => void;
  onClose: () => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; error?: string }>;
  onSaveCredential: (provider: AIProviderId, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCredential: (provider: AIProviderId) => Promise<{ ok: boolean; error?: string }>;
  onTestConnection: (payload: TestConnectionPayload) => Promise<TestConnectionResult>;
  onRefreshModels: (
    provider: AIProviderId,
    customBaseUrl?: string
  ) => Promise<{ ok: boolean; models: AIModelInfo[]; error?: string }>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  snapshot,
  activeTab,
  modelsByProvider,
  displays,
  onLoadDisplays,
  onChangeTab,
  onClose,
  onUpdateSettings,
  onSaveCredential,
  onDeleteCredential,
  onTestConnection,
  onRefreshModels,
}) => {
  const { settings, credentials, platform } = snapshot;
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(settings.activeProvider);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState(
    settings.providers['openai-compatible'].customBaseUrl
  );
  const [modelInput, setModelInput] = useState(settings.providers[settings.activeProvider].model);
  const [shortcutDraft, setShortcutDraft] = useState(settings.globalShortcut);
  const [testing, setTesting] = useState(false);
  const [refreshingModels, setRefreshingModels] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setModelInput(settings.providers[selectedProvider].model);
    if (selectedProvider === 'openai-compatible') {
      setCustomBaseUrl(settings.providers['openai-compatible'].customBaseUrl);
    }
    setApiKeyInput('');
    setFeedback(null);
  }, [selectedProvider, settings.providers]);

  useEffect(() => {
    if (activeTab === 'capture') {
      void onLoadDisplays();
    }
  }, [activeTab, onLoadDisplays]);

  const currentCred = credentials[selectedProvider];
  const providerModels = modelsByProvider[selectedProvider] ?? [];

  const handleSaveProviderConfig = async () => {
    setFeedback(null);
    if (apiKeyInput.trim()) {
      const credRes = await onSaveCredential(selectedProvider, apiKeyInput.trim());
      if (!credRes.ok) {
        setFeedback({ ok: false, text: credRes.error ?? 'Failed to save encrypted API key.' });
        return;
      }
      setApiKeyInput('');
    }

    const updatedProviders = {
      ...settings.providers,
      [selectedProvider]: {
        ...settings.providers[selectedProvider],
        model: modelInput.trim() || settings.providers[selectedProvider].model,
        customBaseUrl:
          selectedProvider === 'openai-compatible'
            ? customBaseUrl.trim()
            : settings.providers[selectedProvider].customBaseUrl,
      },
    };

    const res = await onUpdateSettings({
      activeProvider: selectedProvider,
      providers: updatedProviders,
    });

    if (res.ok) {
      setFeedback({ ok: true, text: 'Provider configuration saved securely.' });
    } else {
      setFeedback({ ok: false, text: res.error ?? 'Failed to save configuration.' });
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await onTestConnection({
        provider: selectedProvider,
        model: modelInput,
        customBaseUrl: selectedProvider === 'openai-compatible' ? customBaseUrl : undefined,
        apiKeyOverride: apiKeyInput.trim() || undefined,
      });
      setFeedback({ ok: res.ok, text: res.message });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshModels = async () => {
    setRefreshingModels(true);
    setFeedback(null);
    try {
      const res = await onRefreshModels(
        selectedProvider,
        selectedProvider === 'openai-compatible' ? customBaseUrl : undefined
      );
      if (res.ok) {
        setFeedback({ ok: true, text: `Loaded ${res.models.length} models.` });
      } else {
        setFeedback({ ok: false, text: res.error ?? 'Failed to fetch models.' });
      }
    } finally {
      setRefreshingModels(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Sub-header & Tabs */}
      <div className="border-b border-slate-200 px-3.5 py-2 dark:border-white/8">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Chat</span>
          </button>
          <span className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Settings
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
          {(['general', 'providers', 'capture', 'about'] as SettingsTabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setFeedback(null);
                onChangeTab(tab);
              }}
              className={`rounded-md py-1 text-[11px] font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-[#1A2230] dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="floating-scroll flex-1 space-y-4 overflow-y-auto p-3.5 text-xs">
        {feedback && (
          <div
            className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] ${
              feedback.ok
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.ok ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span className="leading-snug">{feedback.text}</span>
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block font-medium text-slate-700 dark:text-slate-300">
                AI Provider
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'gemini', label: 'Gemini' },
                    { id: 'groq', label: 'Groq' },
                    { id: 'openai-compatible', label: 'OpenAI-Compat' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProvider(p.id)}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors ${
                      selectedProvider === p.id
                        ? 'border-sky-500 bg-sky-500/12 text-sky-600 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/4 dark:text-slate-300 dark:hover:bg-white/8'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedProvider === 'openai-compatible' && (
              <div>
                <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                  API Base URL
                </label>
                <input
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
                />
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-slate-700 dark:text-slate-300">API Key (BYOK)</label>
                {currentCred.configured ? (
                  <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Encrypted ({currentCred.maskedHint})
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Not configured</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      currentCred.configured
                        ? `Saved (${currentCred.maskedHint}) — enter new key to replace`
                        : 'Paste your API key...'
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-2.5 font-mono text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    aria-label={showKey ? 'Hide API key' : 'Show API key'}
                    className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {currentCred.configured && (
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await onDeleteCredential(selectedProvider);
                      setFeedback({
                        ok: res.ok,
                        text: res.ok ? 'Credential removed from safeStorage.' : res.error ?? 'Failed to remove key.',
                      });
                    }}
                    title="Remove saved API key"
                    aria-label="Remove saved API key"
                    className="rounded-lg border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-500/10 dark:border-white/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="font-medium text-slate-700 dark:text-slate-300">Model</label>
                <button
                  type="button"
                  onClick={handleRefreshModels}
                  disabled={refreshingModels}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:underline disabled:opacity-50 dark:text-sky-400"
                >
                  <RefreshCw className={`h-3 w-3 ${refreshingModels ? 'animate-spin' : ''}`} />
                  <span>Refresh models</span>
                </button>
              </div>

              {providerModels.length > 0 && (
                <select
                  value={providerModels.some((m) => m.id === modelInput) ? modelInput : '__custom__'}
                  onChange={(e) => {
                    if (e.target.value !== '__custom__') {
                      setModelInput(e.target.value);
                    }
                  }}
                  className="mb-1.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
                >
                  {providerModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} {m.supportsVision ? '(Vision + Text)' : '(Text only)'}
                    </option>
                  ))}
                  <option value="__custom__">Custom model ID...</option>
                </select>
              )}

              <input
                type="text"
                value={modelInput}
                onChange={(e) => setModelInput(e.target.value)}
                placeholder="Enter model identifier"
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 focus:border-sky-500 focus:outline-none dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
              />

              {selectedProvider === 'openai-compatible' && (
                <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.providers['openai-compatible'].customModelSupportsVision}
                    onChange={(e) =>
                      void onUpdateSettings({
                        providers: {
                          ...settings.providers,
                          'openai-compatible': {
                            ...settings.providers['openai-compatible'],
                            customModelSupportsVision: e.target.checked,
                          },
                        },
                      })
                    }
                    className="rounded border-slate-300 accent-sky-600"
                  />
                  <span>Custom model supports image inputs</span>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                {testing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Test Connection</span>
              </button>

              <button
                type="button"
                onClick={() => void handleSaveProviderConfig()}
                className="flex-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
              >
                Save & Use Provider
              </button>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1.5 block font-medium text-slate-700 dark:text-slate-300">
                Theme
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['dark', 'light'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => void onUpdateSettings({ theme: mode })}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium capitalize ${
                      settings.theme === mode
                        ? 'border-sky-500 bg-sky-500/12 text-sky-600 dark:text-sky-300'
                        : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/4 dark:text-slate-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Global Shortcut
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={shortcutDraft}
                  onChange={(e) => setShortcutDraft(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-[11px] text-slate-900 dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const res = await onUpdateSettings({ globalShortcut: shortcutDraft });
                    setFeedback({
                      ok: res.ok,
                      text: res.ok ? 'Global shortcut updated.' : res.error ?? 'Invalid shortcut.',
                    });
                  }}
                  className="rounded-lg bg-sky-600 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-sky-500"
                >
                  Apply
                </button>
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                Default: CommandOrControl+Space
              </p>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Widget Position
              </label>
              <select
                value={settings.widgetPositionBehavior}
                onChange={(e) =>
                  void onUpdateSettings({
                    widgetPositionBehavior: e.target.value as AppSettings['widgetPositionBehavior'],
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
              >
                <option value="remember-session">Remember position during session</option>
                <option value="snap-corner">Snap back to bottom-right corner</option>
              </select>
            </div>

            <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-white/8">
              <label className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                <span>Launch on Windows startup</span>
                <input
                  type="checkbox"
                  checked={settings.launchOnStartup}
                  onChange={(e) => void onUpdateSettings({ launchOnStartup: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>

              <label className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                <span>Hide from Windows taskbar</span>
                <input
                  type="checkbox"
                  checked={settings.hideFromTaskbar}
                  onChange={(e) => void onUpdateSettings({ hideFromTaskbar: e.target.checked })}
                  className="h-4 w-4 accent-sky-600"
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'capture' && (
          <div className="space-y-3.5">
            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Default Monitor
              </label>
              <select
                value={settings.capture.defaultDisplayId ?? ''}
                onChange={(e) =>
                  void onUpdateSettings({
                    capture: {
                      ...settings.capture,
                      defaultDisplayId: e.target.value ? Number(e.target.value) : null,
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
              >
                <option value="">Primary / Active Display</option>
                {displays.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label} ({d.bounds.width}×{d.bounds.height})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Screenshot Quality
              </label>
              <select
                value={settings.capture.quality}
                onChange={(e) =>
                  void onUpdateSettings({
                    capture: {
                      ...settings.capture,
                      quality: e.target.value as ScreenshotQuality,
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
              >
                <option value="standard">Standard (JPEG 80% — Fastest)</option>
                <option value="high">High (JPEG 92% — Recommended)</option>
                <option value="lossless">Lossless (PNG — Crisp Text)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block font-medium text-slate-700 dark:text-slate-300">
                Max Image Dimension
              </label>
              <select
                value={settings.capture.maxDimensionPx}
                onChange={(e) =>
                  void onUpdateSettings({
                    capture: {
                      ...settings.capture,
                      maxDimensionPx: Number(e.target.value) as 1280 | 1920 | 2560,
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#0D121A] dark:text-slate-100"
              >
                <option value={1280}>1280 px (Lowest token size)</option>
                <option value={1920}>1920 px (Full HD balanced)</option>
                <option value={2560}>2560 px (High-DPI detail)</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/8 dark:bg-white/4">
              <div className="flex justify-between">
                <span className="text-slate-500">Application</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Floating AI v{platform.appVersion}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Runtime</span>
                <span className="font-mono text-[11px] tabular-nums">
                  Electron {platform.electronVersion} · {platform.os}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Credential Encryption</span>
                <span className="font-medium">
                  {platform.encryptionAvailable ? 'OS safeStorage Active' : 'Unavailable in Browser'}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 leading-relaxed">
              <p className="font-medium text-slate-900 dark:text-slate-100">Privacy & Security</p>
              <p>
                API keys are encrypted in the Electron main process via OS-level DPAPI/safeStorage and are never sent to the renderer or stored in plaintext.
              </p>
              <p>
                Conversations exist only in volatile memory (RAM) for the active session. Screenshots are captured strictly on demand and cleared when dismissed or closed.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
