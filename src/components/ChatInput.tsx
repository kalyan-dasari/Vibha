import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, Paperclip, Square } from 'lucide-react';
import { getBridge } from '../services/electronBridge.ts';
import { processImageFile } from '../services/imageService.ts';
import type { ImageAttachment } from '../types/index.ts';

interface ChatInputProps {
  isStreaming: boolean;
  hasPendingAttachments: boolean;
  captureMenuOpen: boolean;
  onToggleCaptureMenu: () => void;
  onAddAttachment: (att: ImageAttachment) => void;
  onAttachmentError: (err: string) => void;
  onSend: (text: string) => Promise<boolean>;
  onStop: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  isStreaming,
  hasPendingAttachments,
  captureMenuOpen,
  onToggleCaptureMenu,
  onAddAttachment,
  onAttachmentError,
  onSend,
  onStop,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;
    return bridge.window.onFocusInput(() => {
      textareaRef.current?.focus();
    });
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const handleSubmit = async () => {
    if (isStreaming) return;
    const trimmed = text.trim();
    if (!trimmed && !hasPendingAttachments) return;
    const ok = await onSend(trimmed);
    if (ok) {
      setText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    for (const file of files) {
      try {
        const processed = await processImageFile(file);
        onAddAttachment(processed);
      } catch (err) {
        onAttachmentError(err instanceof Error ? err.message : 'Failed to attach image.');
      }
    }
  };

  const canSend = !isStreaming && (text.trim().length > 0 || hasPendingAttachments);

  return (
    <div className="border-t border-slate-200 p-3 dark:border-white/8">
      <div className="flex items-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 focus-within:border-sky-500/60 dark:border-white/10 dark:bg-[#121721]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach image"
          aria-label="Attach image"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onToggleCaptureMenu}
          disabled={isStreaming}
          title="Capture screen"
          aria-label="Capture screen"
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${
            captureMenuOpen
              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
              : 'text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
          }`}
        >
          <Camera className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasPendingAttachments ? 'Ask about this screenshot...' : 'Ask anything... (Shift+Enter for newline)'
          }
          className="floating-scroll max-h-[120px] min-h-[32px] flex-1 resize-none bg-transparent py-1.5 text-[13px] leading-snug text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop generating"
            aria-label="Stop generating"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white transition-colors hover:bg-rose-600"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSend}
            title="Send message (Enter)"
            aria-label="Send message"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-white/10 dark:disabled:text-slate-500"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
