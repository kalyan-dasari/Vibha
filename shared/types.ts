export type AIProviderId = 'gemini' | 'groq' | 'openai-compatible';

export type ThemeMode = 'dark' | 'light';

export type CaptureMode = 'fullscreen' | 'window' | 'area';

export type ScreenshotQuality = 'standard' | 'high' | 'lossless';

export type WidgetPositionBehavior = 'remember-session' | 'snap-corner';

export interface ProviderCapabilities {
  streaming: boolean;
  vision: boolean;
  dynamicModelList: boolean;
  customEndpoint: boolean;
}

export interface AIModelInfo {
  id: string;
  name: string;
  provider: AIProviderId;
  supportsVision: boolean;
  contextWindow?: number;
  description?: string;
}

export interface ImageAttachment {
  id: string;
  name: string;
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
  base64Data: string;
  width: number;
  height: number;
  sizeBytes: number;
  source: 'capture' | 'file';
}

export interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ImageAttachment[];
}

export interface ChatStreamRequest {
  requestId: string;
  provider: AIProviderId;
  model: string;
  messages: ChatMessageInput[];
  supportsVisionOverride?: boolean;
}

export interface ChatStreamChunkEvent {
  requestId: string;
  delta: string;
}

export interface ChatStreamDoneEvent {
  requestId: string;
  fullText: string;
}

export interface ChatStreamErrorEvent {
  requestId: string;
  error: string;
  code?: string;
}

export interface ProviderCredentialStatus {
  provider: AIProviderId;
  configured: boolean;
  maskedHint: string | null;
  encryptionAvailable: boolean;
}

export interface ProviderConfig {
  provider: AIProviderId;
  model: string;
  customBaseUrl: string;
  customModelSupportsVision: boolean;
}

export interface AppSettings {
  theme: ThemeMode;
  globalShortcut: string;
  widgetPositionBehavior: WidgetPositionBehavior;
  launchOnStartup: boolean;
  hideFromTaskbar: boolean;
  activeProvider: AIProviderId;
  providers: Record<AIProviderId, ProviderConfig>;
  capture: {
    defaultDisplayId: number | null;
    quality: ScreenshotQuality;
    maxDimensionPx: 1280 | 1920 | 2560;
  };
}

export interface SafeSettingsSnapshot {
  settings: AppSettings;
  credentials: Record<AIProviderId, ProviderCredentialStatus>;
  platform: {
    os: string;
    appVersion: string;
    electronVersion: string;
    encryptionAvailable: boolean;
  };
}

export interface SaveCredentialPayload {
  provider: AIProviderId;
  apiKey: string;
}

export interface TestConnectionPayload {
  provider: AIProviderId;
  model?: string;
  customBaseUrl?: string;
  apiKeyOverride?: string;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  modelsCount?: number;
}

export interface DisplayInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  bounds: { x: number; y: number; width: number; height: number };
  workArea: { x: number; y: number; width: number; height: number };
  scaleFactor: number;
}

export interface WindowSourceInfo {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  appIconDataUrl?: string;
}

export interface CaptureFullscreenPayload {
  displayId?: number;
}

export interface CaptureWindowPayload {
  sourceId: string;
}

export interface CaptureAreaResult {
  x: number;
  y: number;
  width: number;
  height: number;
  displayId: number;
  scaleFactor: number;
}

export interface CaptureResponse {
  cancelled?: boolean;
  attachment?: ImageAttachment;
  error?: string;
}

export interface WindowExpandPayload {
  expanded: boolean;
}

export interface WindowMovePayload {
  deltaX: number;
  deltaY: number;
}

export interface FloatingAIBridge {
  window: {
    setExpanded: (expanded: boolean) => Promise<void>;
    moveBy: (deltaX: number, deltaY: number) => Promise<void>;
    hide: () => Promise<void>;
    minimize: () => Promise<void>;
    getState: () => Promise<{ expanded: boolean }>;
    onExpandedChange: (cb: (expanded: boolean) => void) => () => void;
    onFocusInput: (cb: () => void) => () => void;
  };
  chat: {
    sendMessageStream: (request: ChatStreamRequest) => Promise<{ accepted: boolean; error?: string }>;
    cancelRequest: (requestId: string) => Promise<void>;
    onStreamChunk: (cb: (event: ChatStreamChunkEvent) => void) => () => void;
    onStreamDone: (cb: (event: ChatStreamDoneEvent) => void) => () => void;
    onStreamError: (cb: (event: ChatStreamErrorEvent) => void) => () => void;
  };
  settings: {
    getSnapshot: () => Promise<SafeSettingsSnapshot>;
    update: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; snapshot: SafeSettingsSnapshot; error?: string }>;
    saveCredential: (payload: SaveCredentialPayload) => Promise<{ ok: boolean; status: ProviderCredentialStatus; error?: string }>;
    deleteCredential: (provider: AIProviderId) => Promise<{ ok: boolean; status: ProviderCredentialStatus; error?: string }>;
    testConnection: (payload: TestConnectionPayload) => Promise<TestConnectionResult>;
    listModels: (provider: AIProviderId, customBaseUrl?: string) => Promise<{ ok: boolean; models: AIModelInfo[]; error?: string }>;
  };
  capture: {
    getDisplays: () => Promise<DisplayInfo[]>;
    getWindows: () => Promise<WindowSourceInfo[]>;
    captureFullscreen: (payload?: CaptureFullscreenPayload) => Promise<CaptureResponse>;
    captureWindow: (payload: CaptureWindowPayload) => Promise<CaptureResponse>;
    captureArea: (displayId?: number) => Promise<CaptureResponse>;
    submitAreaSelection: (selection: CaptureAreaResult | null) => void;
  };
}
