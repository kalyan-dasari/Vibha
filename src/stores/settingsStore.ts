import { create } from 'zustand';
import type {
  AIModelInfo,
  AIProviderId,
  AppSettings,
  SafeSettingsSnapshot,
  SettingsTabId,
} from '../types/index.ts';

const FALLBACK_SETTINGS: AppSettings = {
  theme: 'dark',
  globalShortcut: 'CommandOrControl+Space',
  widgetPositionBehavior: 'remember-session',
  launchOnStartup: false,
  hideFromTaskbar: true,
  activeProvider: 'gemini',
  providers: {
    gemini: {
      provider: 'gemini',
      model: 'gemini-4-hydrogen',
      customBaseUrl: '',
      customModelSupportsVision: true,
    },
    groq: {
      provider: 'groq',
      model: 'llama-3.1-8b-instant',
      customBaseUrl: '',
      customModelSupportsVision: false,
    },
    'openai-compatible': {
      provider: 'openai-compatible',
      model: 'gpt-4o-mini',
      customBaseUrl: 'https://api.openai.com/v1',
      customModelSupportsVision: true,
    },
  },
  capture: {
    defaultDisplayId: null,
    quality: 'high',
    maxDimensionPx: 1920,
  },
};

const FALLBACK_SNAPSHOT: SafeSettingsSnapshot = {
  settings: FALLBACK_SETTINGS,
  credentials: {
    gemini: { provider: 'gemini', configured: false, maskedHint: null, encryptionAvailable: false },
    groq: { provider: 'groq', configured: false, maskedHint: null, encryptionAvailable: false },
    'openai-compatible': {
      provider: 'openai-compatible',
      configured: false,
      maskedHint: null,
      encryptionAvailable: false,
    },
  },
  shortcutStatus: {
    registered: true,
    currentShortcut: 'CommandOrControl+Space',
    suggestedAlternatives: [
      'CommandOrControl+Shift+Space',
      'Alt+Space',
      'CommandOrControl+Alt+Space',
    ],
  },
  platform: {
    os: 'browser-preview',
    appVersion: '1.0.0',
    electronVersion: 'none',
    encryptionAvailable: false,
  },
};

interface SettingsState {
  snapshot: SafeSettingsSnapshot;
  loading: boolean;
  settingsOpen: boolean;
  activeTab: SettingsTabId;
  modelsByProvider: Partial<Record<AIProviderId, AIModelInfo[]>>;
  expanded: boolean;

  setSnapshot: (snapshot: SafeSettingsSnapshot) => void;
  setLoading: (loading: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setActiveTab: (tab: SettingsTabId) => void;
  setModelsForProvider: (provider: AIProviderId, models: AIModelInfo[]) => void;
  setExpanded: (expanded: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  snapshot: FALLBACK_SNAPSHOT,
  loading: false,
  settingsOpen: false,
  activeTab: 'providers',
  modelsByProvider: {
    gemini: [
      {
        id: 'gemini-4-hydrogen',
        name: 'Gemini 4 Hydrogen',
        provider: 'gemini',
        supportsVision: true,
      },
      {
        id: 'gemini-4-argon',
        name: 'Gemini 4 Argon',
        provider: 'gemini',
        supportsVision: true,
      },
      {
        id: 'gemini-3.1-flash-lite',
        name: 'Gemini 3.1 Flash Lite',
        provider: 'gemini',
        supportsVision: true,
      },
    ],
    groq: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile (Flagship Text)',
        provider: 'groq',
        supportsVision: false,
      },
      {
        id: 'llama-3.2-11b-vision-preview',
        name: 'Llama 3.2 11B Vision (Multimodal & Screenshots)',
        provider: 'groq',
        supportsVision: true,
      },
      {
        id: 'llama-3.2-90b-vision-preview',
        name: 'Llama 3.2 90B Vision (Large Multimodal)',
        provider: 'groq',
        supportsVision: true,
      },
      {
        id: 'llama-3.1-8b-instant',
        name: 'Llama 3.1 8B Instant (Ultra-fast)',
        provider: 'groq',
        supportsVision: false,
      },
    ],
    'openai-compatible': [
      {
        id: 'gpt-4o-mini',
        name: 'gpt-4o-mini',
        provider: 'openai-compatible',
        supportsVision: true,
      },
    ],
  },
  expanded: false,

  setSnapshot: (snapshot) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', snapshot.settings.theme === 'dark');
    }
    set({ snapshot });
  },
  setLoading: (loading) => set({ loading }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setActiveTab: (activeTab) => set({ activeTab }),
  setModelsForProvider: (provider, models) =>
    set((state) => ({
      modelsByProvider: {
        ...state.modelsByProvider,
        [provider]: models,
      },
    })),
  setExpanded: (expanded) => set({ expanded }),
}));
