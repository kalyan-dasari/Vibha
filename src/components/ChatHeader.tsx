import React from 'react';
import { ClipboardList, Minimize2, Minus, RotateCcw, Settings, Sparkles } from 'lucide-react';
import vibhaAvatar from '../../resources/icons/icon.png';
import { useWindowDrag } from '../hooks/useWindowDrag.ts';
import type { AIProviderId } from '../types/index.ts';

interface ChatHeaderProps {
  activeProvider: AIProviderId;
  activeModel: string;
  isConfigured: boolean;
  isStreaming: boolean;
  settingsOpen: boolean;
  quickVaultOpen?: boolean;
  hasMessages: boolean;
  onToggleSettings: () => void;
  onToggleQuickVault?: () => void;
  onNewChat: () => void;
  onMinimize: () => void;
  onCollapse: () => void;
  onBrowserDragDelta?: (dx: number, dy: number) => void;
}

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  'openai-compatible': 'OpenAI',
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeProvider,
  activeModel,
  isConfigured,
  isStreaming,
  settingsOpen,
  quickVaultOpen,
  hasMessages,
  onToggleSettings,
  onToggleQuickVault,
  onNewChat,
  onMinimize,
  onCollapse,
  onBrowserDragDelta,
}) => {
  const dragHandlers = useWindowDrag({ onBrowserDragDelta });

  const statusText = isStreaming
    ? 'Streaming'
    : isConfigured
      ? 'Ready'
      : 'Key needed';

  return (
    <header
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      onPointerCancel={dragHandlers.onPointerCancel}
      className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2.5 select-none dark:border-white/8 touch-none bg-white/50 dark:bg-[#0B0F17]/50 backdrop-blur-md"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {/* Avatar with indicator */}
        <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200/90 bg-white dark:border-white/10 dark:bg-slate-800 shadow-xs">
          <img src={vibhaAvatar} alt="Vibha" className="h-full w-full object-cover select-none pointer-events-none" />
          <span
            className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white dark:border-[#0B0F17] ${
              isStreaming
                ? 'bg-sky-400 animate-pulse'
                : isConfigured
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
            }`}
            title={statusText}
          />
        </div>

        {/* Title & Model Info */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="truncate font-display text-xs font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Vibha
            </h1>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[9px] font-semibold tracking-wide uppercase ${
                isStreaming
                  ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                  : isConfigured
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
              }`}
            >
              {statusText}
            </span>
          </div>
          <button
            type="button"
            data-no-drag="true"
            onClick={onToggleSettings}
            title="Click to change model or provider"
            className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors truncate text-left"
          >
            <Sparkles className="h-2.5 w-2.5 shrink-0 text-sky-500" />
            <span className="truncate">
              {PROVIDER_LABELS[activeProvider]} · {activeModel || 'Select model'}
            </span>
          </button>
        </div>
      </div>

      {/* Header Window Actions */}
      <div className="flex shrink-0 items-center gap-0.5" data-no-drag="true">
        {hasMessages && !settingsOpen && (
          <button
            type="button"
            onClick={onNewChat}
            title="New conversation (clears RAM)"
            aria-label="New conversation"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}

        {onToggleQuickVault && (
          <button
            type="button"
            onClick={onToggleQuickVault}
            title={quickVaultOpen ? 'Close application vault' : 'Application Vault & Snippets'}
            aria-label={quickVaultOpen ? 'Close application vault' : 'Open application vault'}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
              quickVaultOpen
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
                : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSettings}
          title={settingsOpen ? 'Back to chat' : 'Settings'}
          aria-label={settingsOpen ? 'Back to chat' : 'Open settings'}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            settingsOpen
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold'
              : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onMinimize}
          title="Hide widget to tray (reopen with shortcut or tray)"
          aria-label="Hide widget to tray"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onCollapse}
          title="Collapse to floating orb"
          aria-label="Collapse to floating orb"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
