import { useCallback, useEffect, useState } from 'react';
import { CaptureOverlayView } from './components/CaptureOverlayView.tsx';
import { ChatPanel } from './components/ChatPanel.tsx';
import { FloatingOrb } from './components/FloatingOrb.tsx';
import { useCapture } from './hooks/useCapture.ts';
import { useChat } from './hooks/useChat.ts';
import { useSettings } from './hooks/useSettings.ts';
import { isElectronRuntime } from './services/electronBridge.ts';

export default function App() {
  const isCaptureOverlay =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('view') === 'capture-overlay';

  if (isCaptureOverlay) {
    return <CaptureOverlayView />;
  }

  return <FloatingAIWidget />;
}

function FloatingAIWidget() {
  const inElectron = isElectronRuntime();
  const {
    snapshot,
    settings,
    credentials,
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
    minimizeWindow,
  } = useSettings();

  const {
    messages,
    pendingAttachments,
    isStreaming,
    error,
    addPendingAttachment,
    removePendingAttachment,
    sendMessage,
    stopGeneration,
    regenerateMessage,
    clearConversation,
    clearError,
  } = useChat();

  const {
    capturing,
    captureError,
    clearCaptureError,
    displays,
    windows,
    loadDisplays,
    loadWindows,
    captureFullscreen,
    captureWindow,
    captureArea,
  } = useCapture();

  // Browser-preview-only draggable position offset
  const [previewOffset, setPreviewOffset] = useState({ x: 0, y: 0 });
  const handleBrowserDragDelta = useCallback((dx: number, dy: number) => {
    setPreviewOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }, []);

  // Support Ctrl+Space shortcut during browser preview inspection
  useEffect(() => {
    if (inElectron) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        void toggleExpanded(!expanded);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [expanded, inElectron, toggleExpanded]);

  const activeProvider = settings.activeProvider;
  const isConfigured = credentials[activeProvider].configured;

  if (inElectron) {
    return (
      <main className="h-full w-full overflow-hidden bg-transparent">
        {expanded ? (
          <ChatPanel
            snapshot={snapshot}
            messages={messages}
            pendingAttachments={pendingAttachments}
            isStreaming={isStreaming}
            error={error}
            settingsOpen={settingsOpen}
            activeSettingsTab={activeTab}
            modelsByProvider={modelsByProvider}
            capturing={capturing}
            captureError={captureError}
            displays={displays}
            windows={windows}
            onToggleSettings={() => setSettingsOpen(!settingsOpen)}
            onChangeSettingsTab={setActiveTab}
            onUpdateSettings={updateSettings}
            onSaveCredential={async (provider, apiKey) => saveCredential({ provider, apiKey })}
            onDeleteCredential={deleteCredential}
            onTestConnection={testConnection}
            onRefreshModels={refreshModels}
            onSend={sendMessage}
            onStop={() => void stopGeneration()}
            onRegenerate={(id) => void regenerateMessage(id)}
            onNewChat={clearConversation}
            onAddAttachment={addPendingAttachment}
            onRemoveAttachment={removePendingAttachment}
            onClearError={clearError}
            onClearCaptureError={clearCaptureError}
            onLoadDisplays={loadDisplays}
            onLoadWindows={loadWindows}
            onCaptureFullscreen={captureFullscreen}
            onCaptureWindow={captureWindow}
            onCaptureArea={captureArea}
            onMinimize={() => void minimizeWindow()}
            onCollapse={() => void toggleExpanded(false)}
          />
        ) : (
          <FloatingOrb
            isStreaming={isStreaming}
            hasError={Boolean(error)}
            isConfigured={isConfigured}
            onExpand={() => void toggleExpanded(true)}
          />
        )}
      </main>
    );
  }

  // Browser preview host (non-Electron): clearly states desktop runtime boundary while keeping widget interactive
  return (
    <main className="relative flex min-h-screen w-full flex-col justify-between bg-slate-100 p-6 text-slate-900 dark:bg-[#070A10] dark:text-slate-100">
      <div className="max-w-lg space-y-1.5">
        <h1 className="font-display text-base font-semibold tracking-tight">
          Vibha — Desktop Widget Preview
        </h1>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          This web preview renders the Vibha widget UI. Native Electron desktop features—always-on-top framing,{' '}
          <span className="font-mono">safeStorage</span> DPAPI encryption, <span className="font-mono">desktopCapturer</span> screen capture,{' '}
          <span className="font-mono">Ctrl+Space</span> global hotkey, and main-process BYOK requests—execute in the Windows Electron runtime via{' '}
          <span className="font-mono text-sky-600 dark:text-sky-400">npm run dev:electron</span>.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        <div
          style={{
            transform: `translate(${previewOffset.x}px, ${previewOffset.y}px)`,
          }}
          className="transition-transform duration-75"
        >
          {expanded ? (
            <ChatPanel
              snapshot={snapshot}
              messages={messages}
              pendingAttachments={pendingAttachments}
              isStreaming={isStreaming}
              error={error}
              settingsOpen={settingsOpen}
              activeSettingsTab={activeTab}
              modelsByProvider={modelsByProvider}
              capturing={capturing}
              captureError={captureError}
              displays={displays}
              windows={windows}
              onToggleSettings={() => setSettingsOpen(!settingsOpen)}
              onChangeSettingsTab={setActiveTab}
              onUpdateSettings={updateSettings}
              onSaveCredential={async (provider, apiKey) => saveCredential({ provider, apiKey })}
              onDeleteCredential={deleteCredential}
              onTestConnection={testConnection}
              onRefreshModels={refreshModels}
              onSend={sendMessage}
              onStop={() => void stopGeneration()}
              onRegenerate={(id) => void regenerateMessage(id)}
              onNewChat={clearConversation}
              onAddAttachment={addPendingAttachment}
              onRemoveAttachment={removePendingAttachment}
              onClearError={clearError}
              onClearCaptureError={clearCaptureError}
              onLoadDisplays={loadDisplays}
              onLoadWindows={loadWindows}
              onCaptureFullscreen={captureFullscreen}
              onCaptureWindow={captureWindow}
              onCaptureArea={captureArea}
              onMinimize={() => void minimizeWindow()}
              onCollapse={() => void toggleExpanded(false)}
              onBrowserDragDelta={handleBrowserDragDelta}
            />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <FloatingOrb
                isStreaming={isStreaming}
                hasError={Boolean(error)}
                isConfigured={isConfigured}
                onExpand={() => void toggleExpanded(true)}
                onBrowserDragDelta={handleBrowserDragDelta}
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Click orb or press <span className="font-mono">Ctrl+Space</span> to expand · Drag to reposition
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
