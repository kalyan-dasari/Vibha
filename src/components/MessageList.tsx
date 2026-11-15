import React, { useEffect, useRef } from 'react';
import { Camera, KeyRound } from 'lucide-react';
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
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5">
          <svg width="20" height="20" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle
              cx="14"
              cy="14"
              r="10"
              className="stroke-sky-500 dark:stroke-sky-400"
              strokeWidth="2"
              strokeDasharray="44 16"
              strokeLinecap="round"
            />
            <circle cx="14" cy="14" r="3.5" className="fill-sky-500 dark:fill-sky-400" />
          </svg>
        </div>

        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100">
          Ready on your desktop
        </h2>
        <p className="mt-1 max-w-[270px] text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          Ask anything or capture a screen region. Conversations stay strictly in memory and clear on close.
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {!isConfigured && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-500"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>Configure API Key</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCapture}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Capture Screen</span>
          </button>
        </div>

        <p className="mt-5 font-mono text-[11px] text-slate-400 dark:text-slate-500">
          {activeProvider} · {activeModel} · {shortcut.replace('CommandOrControl', 'Ctrl')}
        </p>
      </div>
    );
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  return (
    <div className="floating-scroll flex-1 space-y-3 overflow-y-auto px-3.5 py-3">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLastAssistant={msg.id === lastAssistantId}
          isStreamingAny={isStreaming}
          onRegenerate={onRegenerate}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
