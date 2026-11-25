import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Camera, Paperclip, Sparkles, Square, X } from 'lucide-react';
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
  insertedText?: string | null;
  onClearInsertedText?: () => void;
  formAssistantActive?: boolean;
  onToggleFormAssistant?: () => void;
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
  insertedText,
  onClearInsertedText,
  formAssistantActive,
  onToggleFormAssistant,
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (insertedText) {
      setText((prev) => (prev ? `${prev}\n\n${insertedText}` : insertedText));
      onClearInsertedText?.();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 50);
    }
  }, [insertedText, onClearInsertedText]);

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
    <div className="border-t border-slate-200/80 bg-white/60 p-2.5 backdrop-blur-md dark:border-white/8 dark:bg-[#0B0F17]/70">
      {formAssistantActive && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="truncate">Form Copilot Active · Cross-referencing Profile</span>
          </div>
          {onToggleFormAssistant && (
            <button
              type="button"
              onClick={onToggleFormAssistant}
              className="rounded p-0.5 text-indigo-400 hover:bg-indigo-500/20 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
              title="Disable Form Copilot"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200/90 bg-white/95 px-2.5 py-1.5 shadow-xs transition-all focus-within:border-sky-500/60 focus-within:ring-2 focus-within:ring-sky-500/10 dark:border-white/10 dark:bg-[#121822]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach image (PNG, JPEG, WebP)"
          aria-label="Attach image"
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Screen Capture button */}
        <button
          type="button"
          onClick={onToggleCaptureMenu}
          title="Screen capture modes (Area, Window, Fullscreen)"
          aria-label="Screen capture"
          className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl transition-all ${
            captureMenuOpen
              ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
          }`}
        >
          <Camera className="h-4 w-4" />
        </button>

        {/* Form Copilot Toggle button */}
        {onToggleFormAssistant && (
          <button
            type="button"
            onClick={onToggleFormAssistant}
            title={
              formAssistantActive
                ? 'Form Copilot Active (Click to disable)'
                : 'Form Copilot: Answer application questions using your profile'
            }
            aria-label="Form Copilot"
            className={`flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl transition-all ${
              formAssistantActive
                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100'
            }`}
          >
            <Sparkles className={`h-4 w-4 ${formAssistantActive ? 'text-indigo-500' : ''}`} />
          </button>
        )}

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            hasPendingAttachments
              ? 'Add instructions or press Enter to send...'
              : formAssistantActive
                ? 'Type or snip a form question (answers from profile)...'
                : 'Ask Vibha anything... (Enter to send)'
          }
          rows={1}
          className="floating-scroll max-h-[110px] min-h-[26px] flex-1 resize-none bg-transparent py-1 text-xs leading-relaxed text-slate-900 placeholder-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder-slate-500"
        />

        {/* Send / Stop button */}
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            title="Stop generation"
            aria-label="Stop generation"
            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-xs shadow-rose-500/20 transition-all hover:bg-rose-600 active:scale-95"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSend}
            title="Send message"
            aria-label="Send message"
            className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-xs shadow-sky-500/20 transition-all hover:from-sky-400 hover:to-blue-500 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ArrowUp className="h-4 w-4 stroke-[2.5]" />
          </button>
        )}
      </div>
    </div>
  );
};
