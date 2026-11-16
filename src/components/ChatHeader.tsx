import React from 'react';
import { Minimize2, Minus, RotateCcw, Settings } from 'lucide-react';
import vibhaAvatar from '../../resources/icons/icon.png';
import { useWindowDrag } from '../hooks/useWindowDrag.ts';
import type { AIProviderId } from '../types/index.ts';

interface ChatHeaderProps {
  activeProvider: AIProviderId;
  activeModel: string;
  isConfigured: boolean;
  isStreaming: boolean;
  settingsOpen: boolean;
  hasMessages: boolean;
  onToggleSettings: () => void;
  onNewChat: () => void;
  onMinimize: () => void;
  onCollapse: () => void;
  onBrowserDragDelta?: (dx: number, dy: number) => void;
}

const PROVIDER_LABELS: Record<AIProviderId, string> = {
  gemini: 'Gemini',
  groq: 'Groq',
  'openai-compatible': 'OpenAI-Compat',
};

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  activeProvider,
  activeModel,
  isConfigured,
  isStreaming,
  settingsOpen,
  hasMessages,
  onToggleSettings,
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
      className="flex cursor-grab active:cursor-grabbing items-center justify-between gap-2 border-b border-slate-200 px-3.5 py-2.5 select-none dark:border-white/8 touch-none"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <img src={vibhaAvatar} alt="Vibha" className="h-full w-full object-cover select-none pointer-events-none" />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate font-display text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              Vibha
            </h1>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isStreaming
                  ? 'bg-sky-400 animate-pulse'
                  : isConfigured
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
              }`}
              title={statusText}
            />
          </div>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
            {PROVIDER_LABELS[activeProvider]} · {activeModel || 'No model'} · {statusText}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5" data-no-drag="true">
        {hasMessages && !settingsOpen && (
          <button
            type="button"
            onClick={onNewChat}
            title="New conversation (clears RAM)"
            aria-label="New conversation"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={onToggleSettings}
          title={settingsOpen ? 'Back to chat' : 'Settings'}
          aria-label={settingsOpen ? 'Back to chat' : 'Open settings'}
          className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
            settingsOpen
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onMinimize}
          title="Hide widget (reopen with global shortcut)"
          aria-label="Hide widget"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={onCollapse}
          title="Collapse to floating orb"
          aria-label="Collapse to floating orb"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Minimize2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </header>
  );
};
