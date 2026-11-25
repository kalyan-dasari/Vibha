import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type {
  AIModelInfo,
  AIProviderId,
  AppSettings,
  DisplayInfo,
  ImageAttachment,
  SafeSettingsSnapshot,
  SettingsTabId,
  TestConnectionPayload,
  TestConnectionResult,
  UIMessage,
  WindowSourceInfo,
} from '../types/index.ts';
import { CaptureMenu } from './CaptureMenu.tsx';
import { ChatHeader } from './ChatHeader.tsx';
import { ChatInput } from './ChatInput.tsx';
import { MessageList } from './MessageList.tsx';
import { ScreenshotPreview } from './ScreenshotPreview.tsx';
import { SettingsPanel } from './SettingsPanel.tsx';
import { QuickSnippetDrawer } from './profile/QuickSnippetDrawer.tsx';

interface ChatPanelProps {
  snapshot: SafeSettingsSnapshot;
  messages: UIMessage[];
  pendingAttachments: ImageAttachment[];
  isStreaming: boolean;
  error: string | null;
  settingsOpen: boolean;
  activeSettingsTab: SettingsTabId;
  modelsByProvider: Partial<Record<AIProviderId, AIModelInfo[]>>;
  capturing: boolean;
  captureError: string | null;
  displays: DisplayInfo[];
  windows: WindowSourceInfo[];
  onToggleSettings: () => void;
  onChangeSettingsTab: (tab: SettingsTabId) => void;
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<{ ok: boolean; error?: string }>;
  onSaveCredential: (provider: AIProviderId, apiKey: string) => Promise<{ ok: boolean; error?: string }>;
  onDeleteCredential: (provider: AIProviderId) => Promise<{ ok: boolean; error?: string }>;
  onTestConnection: (payload: TestConnectionPayload) => Promise<TestConnectionResult>;
  onRefreshModels: (
    provider: AIProviderId,
    customBaseUrl?: string
  ) => Promise<{ ok: boolean; models: AIModelInfo[]; error?: string }>;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
  onRegenerate: (assistantMessageId: string) => void;
  onNewChat: () => void;
  onAddAttachment: (att: ImageAttachment) => void;
  onRemoveAttachment: (id: string) => void;
  onClearError: () => void;
  onClearCaptureError: () => void;
  onLoadDisplays: () => Promise<DisplayInfo[]>;
  onLoadWindows: () => Promise<WindowSourceInfo[]>;
  onCaptureFullscreen: (displayId?: number) => Promise<boolean>;
  onCaptureWindow: (sourceId: string) => Promise<boolean>;
  onCaptureArea: (displayId?: number) => Promise<boolean>;
  onMinimize: () => void;
  onCollapse: () => void;
  onBrowserDragDelta?: (dx: number, dy: number) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  snapshot,
  messages,
  pendingAttachments,
  isStreaming,
  error,
  settingsOpen,
  activeSettingsTab,
  modelsByProvider,
  capturing,
  captureError,
  displays,
  windows,
  onToggleSettings,
  onChangeSettingsTab,
  onUpdateSettings,
  onSaveCredential,
  onDeleteCredential,
  onTestConnection,
  onRefreshModels,
  onSend,
  onStop,
  onRegenerate,
  onNewChat,
  onAddAttachment,
  onRemoveAttachment,
  onClearError,
  onClearCaptureError,
  onLoadDisplays,
  onLoadWindows,
  onCaptureFullscreen,
  onCaptureWindow,
  onCaptureArea,
  onMinimize,
  onCollapse,
  onBrowserDragDelta,
}) => {
  const [captureMenuOpen, setCaptureMenuOpen] = useState(false);
  const [quickVaultOpen, setQuickVaultOpen] = useState(false);
  const [insertedText, setInsertedText] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const activeProvider = snapshot.settings.activeProvider;
  const activeModel = snapshot.settings.providers[activeProvider].model;
  const isConfigured = snapshot.credentials[activeProvider].configured;
  const bannerError = captureError || attachmentError || error;

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <section
        aria-label="Vibha Chat Panel"
        className="relative flex h-[550px] w-[400px] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 text-slate-900 shadow-[0_20px_50px_rgba(2,6,23,0.25)] backdrop-blur-2xl transition-all duration-200 dark:border-white/12 dark:bg-[#0B0F17]/96 dark:text-slate-100 dark:shadow-[0_22px_60px_rgba(0,0,0,0.7)]"
      >
        <ChatHeader
          activeProvider={activeProvider}
          activeModel={activeModel}
          isConfigured={isConfigured}
          isStreaming={isStreaming}
          settingsOpen={settingsOpen}
          quickVaultOpen={quickVaultOpen}
          hasMessages={messages.length > 0}
          onToggleSettings={() => {
            if (!settingsOpen) setQuickVaultOpen(false);
            onToggleSettings();
          }}
          onToggleQuickVault={() => {
            if (!quickVaultOpen && settingsOpen) onToggleSettings();
            setQuickVaultOpen((prev) => !prev);
          }}
          onNewChat={onNewChat}
          onMinimize={onMinimize}
          onCollapse={onCollapse}
          onBrowserDragDelta={onBrowserDragDelta}
        />

        {bannerError && (
          <div className="flex items-center justify-between gap-2 border-b border-rose-500/25 bg-rose-500/10 px-3.5 py-2 text-[11px] text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 min-w-0">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
              <span className="truncate">{bannerError}</span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {(bannerError.toLowerCase().includes('vision') ||
                bannerError.toLowerCase().includes('screenshot')) && (
                <button
                  type="button"
                  onClick={() => {
                    onChangeSettingsTab('providers');
                    if (!settingsOpen) onToggleSettings();
                  }}
                  className="rounded-md bg-rose-600/20 px-2 py-0.5 text-[10px] font-semibold text-rose-800 dark:text-rose-200 hover:bg-rose-600/30 transition-colors"
                >
                  Switch Model
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onClearError();
                  onClearCaptureError();
                  setAttachmentError(null);
                }}
                aria-label="Dismiss error"
                className="shrink-0 rounded-md p-0.5 hover:bg-rose-500/20 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {settingsOpen ? (
          <SettingsPanel
            snapshot={snapshot}
            activeTab={activeSettingsTab}
            modelsByProvider={modelsByProvider}
            displays={displays}
            onLoadDisplays={onLoadDisplays}
            onChangeTab={onChangeSettingsTab}
            onClose={onToggleSettings}
            onUpdateSettings={onUpdateSettings}
            onSaveCredential={onSaveCredential}
            onDeleteCredential={onDeleteCredential}
            onTestConnection={onTestConnection}
            onRefreshModels={onRefreshModels}
          />
        ) : (
          <>
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              isConfigured={isConfigured}
              activeProvider={activeProvider}
              activeModel={activeModel}
              shortcut={snapshot.settings.globalShortcut}
              onRegenerate={onRegenerate}
              onOpenSettings={() => {
                onChangeSettingsTab('providers');
                if (!settingsOpen) onToggleSettings();
              }}
              onOpenCapture={() => setCaptureMenuOpen(true)}
              onOpenQuickVault={() => setQuickVaultOpen(true)}
              onQuickPrompt={(prompt) => {
                void onSend(prompt);
              }}
            />

            <ScreenshotPreview
              attachments={pendingAttachments}
              onRemove={onRemoveAttachment}
              onRecapture={() => setCaptureMenuOpen(true)}
            />

            <CaptureMenu
              open={captureMenuOpen}
              capturing={capturing}
              displays={displays}
              windows={windows}
              onClose={() => setCaptureMenuOpen(false)}
              onLoadDisplays={onLoadDisplays}
              onLoadWindows={onLoadWindows}
              onCaptureFullscreen={onCaptureFullscreen}
              onCaptureWindow={onCaptureWindow}
              onCaptureArea={onCaptureArea}
            />

            <ChatInput
              isStreaming={isStreaming}
              hasPendingAttachments={pendingAttachments.length > 0}
              captureMenuOpen={captureMenuOpen}
              onToggleCaptureMenu={() => setCaptureMenuOpen((prev) => !prev)}
              onAddAttachment={onAddAttachment}
              onAttachmentError={(err) => setAttachmentError(err)}
              onSend={onSend}
              onStop={onStop}
              insertedText={insertedText}
              onClearInsertedText={() => setInsertedText(null)}
            />
          </>
        )}

        <QuickSnippetDrawer
          isOpen={quickVaultOpen}
          onClose={() => setQuickVaultOpen(false)}
          onOpenProfileSettings={() => {
            setQuickVaultOpen(false);
            onChangeSettingsTab('profile');
            if (!settingsOpen) onToggleSettings();
          }}
          onInsertIntoChat={(text) => {
            setInsertedText(text);
          }}
        />
      </section>
    </div>
  );
};
