import type {
  AIProviderId,
  AppSettings,
  ChatStreamRequest,
  ImageAttachment,
} from '../../../shared/types.ts';

const VALID_PROVIDERS: ReadonlySet<string> = new Set([
  'gemini',
  'groq',
  'openai-compatible',
]);

const VALID_MIME_TYPES: ReadonlySet<string> = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB per attachment
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

export function isValidProviderId(value: unknown): value is AIProviderId {
  return typeof value === 'string' && VALID_PROVIDERS.has(value);
}

/**
 * Validates custom OpenAI-compatible base URLs to prevent unsafe schemes
 * (file:, javascript:, data:) and cloud metadata SSRF endpoints.
 */
export function validateEndpointUrl(rawUrl: string): { valid: boolean; normalized?: string; error?: string } {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { valid: false, error: 'Base URL cannot be empty.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format. Example: https://api.openai.com/v1' };
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname === '[::1]';

  if (parsed.protocol === 'https:') {
    // Allowed
  } else if (parsed.protocol === 'http:' && isLocalhost) {
    // Allow local model servers such as Ollama / LM Studio / vLLM
  } else {
    return {
      valid: false,
      error: 'Only HTTPS endpoints are allowed (HTTP is permitted only for localhost/127.0.0.1).',
    };
  }

  // Block cloud metadata / link-local addresses
  if (
    hostname === '169.254.169.254' ||
    hostname.startsWith('169.254.') ||
    hostname === 'metadata.google.internal'
  ) {
    return { valid: false, error: 'Link-local and metadata IP addresses are blocked.' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs must not embed credentials.' };
  }

  const normalized = trimmed.replace(/\/+$/, '');
  return { valid: true, normalized };
}

export function validateAttachment(att: unknown): att is ImageAttachment {
  if (!att || typeof att !== 'object') return false;
  const candidate = att as Record<string, unknown>;
  if (typeof candidate.id !== 'string' || candidate.id.length === 0) return false;
  if (typeof candidate.name !== 'string') return false;
  if (typeof candidate.mimeType !== 'string' || !VALID_MIME_TYPES.has(candidate.mimeType)) return false;
  if (typeof candidate.base64Data !== 'string' || candidate.base64Data.length === 0) return false;

  const estimatedBytes = Math.ceil((candidate.base64Data.length * 3) / 4);
  if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) return false;

  return true;
}

export function validateChatStreamRequest(payload: unknown): { valid: boolean; error?: string; data?: ChatStreamRequest } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Invalid chat request payload.' };
  }
  const req = payload as Partial<ChatStreamRequest>;

  if (typeof req.requestId !== 'string' || req.requestId.trim().length === 0 || req.requestId.length > 128) {
    return { valid: false, error: 'Missing or invalid requestId.' };
  }
  if (!isValidProviderId(req.provider)) {
    return { valid: false, error: 'Unsupported AI provider.' };
  }
  if (typeof req.model !== 'string' || req.model.trim().length === 0 || req.model.length > 200) {
    return { valid: false, error: 'Model identifier is required.' };
  }
  if (!Array.isArray(req.messages) || req.messages.length === 0 || req.messages.length > 100) {
    return { valid: false, error: 'Conversation must include between 1 and 100 messages.' };
  }

  for (const msg of req.messages) {
    if (!msg || typeof msg !== 'object') {
      return { valid: false, error: 'Malformed message entry.' };
    }
    if (msg.role !== 'user' && msg.role !== 'assistant') {
      return { valid: false, error: 'Invalid message role.' };
    }
    if (typeof msg.content !== 'string') {
      return { valid: false, error: 'Message content must be text.' };
    }
    if (msg.attachments !== undefined) {
      if (!Array.isArray(msg.attachments) || msg.attachments.length > MAX_ATTACHMENTS_PER_MESSAGE) {
        return { valid: false, error: `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} image attachments allowed per message.` };
      }
      for (const att of msg.attachments) {
        if (!validateAttachment(att)) {
          return { valid: false, error: 'Invalid or oversized image attachment (max 10 MB, PNG/JPEG/WebP).' };
        }
      }
    }
  }

  return { valid: true, data: req as ChatStreamRequest };
}

export function validateGlobalShortcut(shortcut: string): boolean {
  if (typeof shortcut !== 'string') return false;
  const trimmed = shortcut.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return false;
  // Require at least one modifier + key
  return /^(CommandOrControl|Ctrl|Control|Alt|Option|Shift|Super|Meta)(\+(CommandOrControl|Ctrl|Control|Alt|Option|Shift|Super|Meta))*\+[A-Za-z0-9SpaceF]+$/i.test(
    trimmed
  );
}

export function sanitizePartialSettings(
  partial: unknown,
  current: AppSettings
): { valid: boolean; next?: AppSettings; error?: string } {
  if (!partial || typeof partial !== 'object') {
    return { valid: false, error: 'Invalid settings update.' };
  }
  const input = partial as Partial<AppSettings>;
  const next: AppSettings = structuredClone(current);

  if (input.theme !== undefined) {
    if (input.theme !== 'dark' && input.theme !== 'light') {
      return { valid: false, error: 'Invalid theme mode.' };
    }
    next.theme = input.theme;
  }

  if (input.globalShortcut !== undefined) {
    if (!validateGlobalShortcut(input.globalShortcut)) {
      return { valid: false, error: 'Invalid keyboard shortcut format (e.g., CommandOrControl+Space).' };
    }
    next.globalShortcut = input.globalShortcut.trim();
  }

  if (input.widgetPositionBehavior !== undefined) {
    if (input.widgetPositionBehavior !== 'remember-session' && input.widgetPositionBehavior !== 'snap-corner') {
      return { valid: false, error: 'Invalid widget position behavior.' };
    }
    next.widgetPositionBehavior = input.widgetPositionBehavior;
  }

  if (typeof input.launchOnStartup === 'boolean') {
    next.launchOnStartup = input.launchOnStartup;
  }

  if (typeof input.hideFromTaskbar === 'boolean') {
    next.hideFromTaskbar = input.hideFromTaskbar;
  }

  if (input.activeProvider !== undefined) {
    if (!isValidProviderId(input.activeProvider)) {
      return { valid: false, error: 'Invalid active provider.' };
    }
    next.activeProvider = input.activeProvider;
  }

  if (input.providers && typeof input.providers === 'object') {
    for (const pid of ['gemini', 'groq', 'openai-compatible'] as AIProviderId[]) {
      const incoming = input.providers[pid];
      if (!incoming) continue;
      if (typeof incoming.model === 'string') {
        next.providers[pid].model = incoming.model.trim().slice(0, 200);
      }
      if (typeof incoming.customModelSupportsVision === 'boolean') {
        next.providers[pid].customModelSupportsVision = incoming.customModelSupportsVision;
      }
      if (pid === 'openai-compatible' && typeof incoming.customBaseUrl === 'string') {
        if (incoming.customBaseUrl.trim() === '') {
          next.providers[pid].customBaseUrl = '';
        } else {
          const check = validateEndpointUrl(incoming.customBaseUrl);
          if (!check.valid || !check.normalized) {
            return { valid: false, error: check.error };
          }
          next.providers[pid].customBaseUrl = check.normalized;
        }
      }
    }
  }

  if (input.capture && typeof input.capture === 'object') {
    if (input.capture.defaultDisplayId === null || typeof input.capture.defaultDisplayId === 'number') {
      next.capture.defaultDisplayId = input.capture.defaultDisplayId;
    }
    if (
      input.capture.quality === 'standard' ||
      input.capture.quality === 'high' ||
      input.capture.quality === 'lossless'
    ) {
      next.capture.quality = input.capture.quality;
    }
    if (
      input.capture.maxDimensionPx === 1280 ||
      input.capture.maxDimensionPx === 1920 ||
      input.capture.maxDimensionPx === 2560
    ) {
      next.capture.maxDimensionPx = input.capture.maxDimensionPx;
    }
  }

  return { valid: true, next };
}
