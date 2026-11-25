import { contextBridge, ipcRenderer } from 'electron';
import type {
  AIProviderId,
  AppSettings,
  CaptureAreaResult,
  CaptureFullscreenPayload,
  CaptureWindowPayload,
  ChatStreamChunkEvent,
  ChatStreamDoneEvent,
  ChatStreamErrorEvent,
  ChatStreamRequest,
  FloatingAIBridge,
  SaveCredentialPayload,
  TestConnectionPayload,
} from '../../shared/types.ts';

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => {
    cb(payload);
  };
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

const floatingAIBridge: FloatingAIBridge = {
  window: {
    setExpanded: (expanded: boolean) => ipcRenderer.invoke('window:set-expanded', { expanded }),
    moveBy: (deltaX: number, deltaY: number) => ipcRenderer.invoke('window:move-by', { deltaX, deltaY }),
    hide: () => ipcRenderer.invoke('window:hide'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    getState: () => ipcRenderer.invoke('window:get-state'),
    onExpandedChange: (cb) => subscribe<boolean>('window:expanded-changed', cb),
    onFocusInput: (cb) => subscribe<void>('window:focus-input', () => cb()),
    onOpenSettings: (cb) => subscribe<void>('window:open-settings', () => cb()),
  },
  chat: {
    sendMessageStream: (request: ChatStreamRequest) => ipcRenderer.invoke('chat:send-stream', request),
    cancelRequest: (requestId: string) => ipcRenderer.invoke('chat:cancel', requestId),
    onStreamChunk: (cb) => subscribe<ChatStreamChunkEvent>('chat:stream-chunk', cb),
    onStreamDone: (cb) => subscribe<ChatStreamDoneEvent>('chat:stream-done', cb),
    onStreamError: (cb) => subscribe<ChatStreamErrorEvent>('chat:stream-error', cb),
  },
  settings: {
    getSnapshot: () => ipcRenderer.invoke('settings:get-snapshot'),
    update: (partial: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', partial),
    saveCredential: (payload: SaveCredentialPayload) => ipcRenderer.invoke('settings:save-credential', payload),
    deleteCredential: (provider: AIProviderId) => ipcRenderer.invoke('settings:delete-credential', provider),
    testConnection: (payload: TestConnectionPayload) => ipcRenderer.invoke('settings:test-connection', payload),
    listModels: (provider: AIProviderId, customBaseUrl?: string) =>
      ipcRenderer.invoke('settings:list-models', { provider, customBaseUrl }),
  },
  capture: {
    getDisplays: () => ipcRenderer.invoke('capture:get-displays'),
    getWindows: () => ipcRenderer.invoke('capture:get-windows'),
    captureFullscreen: (payload?: CaptureFullscreenPayload) =>
      ipcRenderer.invoke('capture:fullscreen', payload),
    captureWindow: (payload: CaptureWindowPayload) =>
      ipcRenderer.invoke('capture:window', payload),
    captureArea: (displayId?: number) => ipcRenderer.invoke('capture:area', displayId),
    submitAreaSelection: (selection: CaptureAreaResult | null) => {
      ipcRenderer.send('capture:submit-area', selection);
    },
  },
  profile: {
    get: () => ipcRenderer.invoke('profile:get'),
    update: (partial) => ipcRenderer.invoke('profile:update', partial),
  },
};

contextBridge.exposeInMainWorld('floatingAI', floatingAIBridge);
