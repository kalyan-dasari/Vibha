import fs from 'node:fs';
import path from 'node:path';
import type { AppSettings } from '../../../shared/types.ts';
import { sanitizePartialSettings } from './validators.ts';

export const DEFAULT_APP_SETTINGS: AppSettings = {
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

/**
 * Persists only non-secret application preferences in userData/settings.json.
 * Never stores API keys or conversation history.
 */
export class SettingsService {
  private readonly filePath: string;
  private cache: AppSettings;

  constructor(userDataDir: string) {
    this.filePath = path.join(userDataDir, 'settings.json');
    this.cache = this.loadFromDisk();
  }

  getSettings(): AppSettings {
    return structuredClone(this.cache);
  }

  updateSettings(partial: unknown): { ok: boolean; settings: AppSettings; error?: string } {
    const result = sanitizePartialSettings(partial, this.cache);
    if (!result.valid || !result.next) {
      return {
        ok: false,
        settings: this.getSettings(),
        error: result.error,
      };
    }

    this.cache = result.next;
    this.writeToDisk(this.cache);
    return {
      ok: true,
      settings: this.getSettings(),
    };
  }

  private loadFromDisk(): AppSettings {
    try {
      if (!fs.existsSync(this.filePath)) {
        return structuredClone(DEFAULT_APP_SETTINGS);
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      const merged = sanitizePartialSettings(parsed, structuredClone(DEFAULT_APP_SETTINGS));
      const settings = merged.valid && merged.next ? merged.next : structuredClone(DEFAULT_APP_SETTINGS);
      if (
        settings.providers.groq.model.includes('llama-4-scout') ||
        settings.providers.groq.model === 'llama-3.3-70b-versatile'
      ) {
        settings.providers.groq.model = 'llama-3.1-8b-instant';
        this.writeToDisk(settings);
      }
      return settings;
    } catch {
      return structuredClone(DEFAULT_APP_SETTINGS);
    }
  }

  private writeToDisk(settings: AppSettings): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf8');
  }
}
