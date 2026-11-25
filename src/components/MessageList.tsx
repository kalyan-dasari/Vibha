import React, { useEffect, useRef } from 'react';
import { Camera, ClipboardList, FileText, KeyRound, Sparkles, Terminal } from 'lucide-react';
import vibhaAvatar from '../../resources/icons/icon.png';
import type { AIProviderId, UIMessage } from '../types/index.ts';
import { MessageBubble } from './MessageBubble.tsx';

interface MessageListProps {
  messages: UIMessage[];
  isStreaming: boolean;
  isConfigured: boolean;
  activeProvider: AIProviderId;
  activeModel: string;
  shortcut: string;
  onRegenerate: (assistantMessageId: string) => void;
  onOpenSettings: () => void;
  onOpenCapture: () => void;
  onOpenQuickVault?: () => void;
  onStartFormCopilot?: () => void;
  onRefine?: (refinementPrompt: string) => void;
  onQuickPrompt?: (prompt: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isStreaming,
  isConfigured,
  activeProvider,
  activeModel,
  shortcut,
  onRegenerate,
  onOpenSettings,
  onOpenCapture,
  onOpenQuickVault,
  onStartFormCopilot,
  onRefine,
  onQuickPrompt,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  // Clean formatted shortcut display (replace CommandOrControl with Ctrl)
  const displayShortcut = shortcut.replace(/CommandOrControl/gi, 'Ctrl');

  // Empty state: show Vibha avatar front and center before conversation starts
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-between px-5 py-6 text-center select-none overflow-y-auto floating-scroll">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {/* Prominent Vibha Avatar with Ambient Halo */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-sky-500/25 via-blue-500/20 to-indigo-500/20 blur-xl opacity-80 animate-pulse pointer-events-none" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-white/80 bg-gradient-to-b from-white to-slate-100 p-1 shadow-xl shadow-sky-500/10 backdrop-blur-md dark:border-white/15 dark:from-slate-800 dark:to-slate-900 dark:shadow-sky-500/20">
              <img
                src={vibhaAvatar}
                alt="Vibha"
                className="h-full w-full rounded-xl object-cover shadow-inner select-none pointer-events-none"
              />
              {/* Online status indicator */}
              <span
                className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white dark:border-[#0B0F17] ${
                  isConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                title={isConfigured ? 'Vibha is ready' : 'API Key needed'}
              >
                {isConfigured && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
          </div>

          {/* Greeting Typography */}
          <h2 className="font-display text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Hello, I'm Vibha
          </h2>
          <p className="mt-1 max-w-[280px] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Your always-on desktop AI companion. Ready to answer questions, capture screens, or review code.
          </p>

          {/* Quick Action Pills & Starter Prompts */}
          <div className="mt-4 flex flex-col items-center gap-2 w-full max-w-[310px]">
            {!isConfigured ? (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500 active:scale-[0.98]"
              >
                <KeyRound className="h-3.5 w-3.5" />
                <span>Configure API Key</span>
              </button>
            ) : null}

            <div className="flex flex-wrap items-center justify-center gap-1.5 w-full">
              <button
                type="button"
                onClick={onOpenCapture}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-sky-500/40 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/10 dark:hover:text-sky-300 active:scale-[0.97]"
              >
                <Camera className="h-3.5 w-3.5 text-sky-500" />
                <span>Capture Screen</span>
              </button>

              {onStartFormCopilot && (
                <button
                  type="button"
                  onClick={onStartFormCopilot}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/90 bg-indigo-50/80 px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300 dark:hover:bg-indigo-500/25 active:scale-[0.97]"
                >
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Form Copilot</span>
                </button>
              )}

              {onOpenQuickVault && (
                <button
                  type="button"
                  onClick={onOpenQuickVault}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-sky-500/40 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/10 dark:hover:text-sky-300 active:scale-[0.97]"
                >
                  <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                  <span>Application Vault</span>
                </button>
              )}

              {onQuickPrompt && (
                <>
                  <button
                    type="button"
                    onClick={() => onQuickPrompt('Explain this code or text simply:')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-sky-500/40 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/10 dark:hover:text-sky-300 active:scale-[0.97]"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Explain text</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickPrompt('Summarize key points from this:')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-sky-500/40 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/10 dark:hover:text-sky-300 active:scale-[0.97]"
                  >
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Summarize</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onQuickPrompt('Help me write or debug code:')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-all hover:border-sky-500/40 hover:bg-slate-50 hover:text-sky-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-sky-400/40 dark:hover:bg-white/10 dark:hover:text-sky-300 active:scale-[0.97]"
                  >
                    <Terminal className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Write code</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Subtle Footer Information */}
        <div className="pt-3 border-t border-slate-200/50 dark:border-white/6 w-full flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
          <span className="font-mono truncate max-w-[170px]" title={`${activeProvider} · ${activeModel}`}>
            {activeProvider} · {activeModel || 'default'}
          </span>
          <span className="font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
            {displayShortcut}
          </span>
        </div>
      </div>
    );
  }

  // Active conversation state: welcome avatar vanishes, conversation thread takes over
  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <div className="floating-scroll flex-1 space-y-3.5 overflow-y-auto px-3.5 py-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLastAssistant={msg.id === lastAssistantId}
          isStreamingAny={isStreaming}
          onRegenerate={onRegenerate}
          onRefine={onRefine}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
