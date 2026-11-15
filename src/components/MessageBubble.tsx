import React, { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import { AlertCircle, Check, Copy, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { UIMessage } from '../types/index.ts';

interface MessageBubbleProps {
  message: UIMessage;
  isLastAssistant: boolean;
  isStreamingAny: boolean;
  onRegenerate: (assistantMessageId: string) => void;
}

const CodeBlock: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className,
  children,
}) => {
  const [copied, setCopied] = useState(false);
  const rawCode = String(children ?? '').replace(/\n$/, '');
  const langMatch = /language-([a-zA-Z0-9_-]+)/.exec(className || '');
  const language = langMatch?.[1] ?? '';

  const highlightedHtml = useMemo(() => {
    try {
      if (language && hljs.getLanguage(language)) {
        return hljs.highlight(rawCode, { language }).value;
      }
      return hljs.highlightAuto(rawCode).value;
    } catch {
      return '';
    }
  }, [language, rawCode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard write unavailable
    }
  };

  return (
    <div className="my-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-950 text-slate-100 dark:border-white/10 dark:bg-[#090C12]">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="floating-scroll overflow-x-auto p-3 text-[12px] leading-relaxed font-mono">
        {highlightedHtml ? (
          <code
            className={`hljs ${className ?? ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <code>{rawCode}</code>
        )}
      </pre>
    </div>
  );
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLastAssistant,
  isStreamingAny,
  onRegenerate,
}) => {
  const [copiedMsg, setCopiedMsg] = useState(false);

  const handleCopyMessage = async () => {
    if (!message.content) return;
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 1600);
    } catch {
      // Ignore clipboard failure
    }
  };

  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-br-sm bg-sky-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {message.attachments.map((att) => (
                <img
                  key={att.id}
                  src={`data:${att.mimeType};base64,${att.base64Data}`}
                  alt={att.name}
                  className="max-h-36 max-w-full rounded-lg border border-white/20 object-cover"
                />
              ))}
            </div>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="group w-full max-w-[92%] space-y-2">
        <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-800 dark:border-white/8 dark:bg-[#141A24] dark:text-slate-100">
          {message.status === 'error' ? (
            <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium">Request failed</p>
                <p className="text-xs leading-normal break-words text-rose-700 dark:text-rose-300/90">
                  {message.errorMessage || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
          ) : message.content.length === 0 && message.status === 'streaming' ? (
            <div className="flex items-center gap-1.5 py-1 text-xs text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
            </div>
          ) : (
            <div className="prose prose-sm max-w-none break-words text-slate-800 dark:prose-invert dark:text-slate-100 [&>p]:my-1.5 [&>p:first-child]:mt-0 [&>p:last-child]:mb-0 [&>ul]:my-1.5 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:my-1.5 [&>ol]:list-decimal [&>ol]:pl-4 [&>h1]:text-sm [&>h1]:font-semibold [&>h2]:text-[13px] [&>h2]:font-semibold [&>h3]:text-[13px] [&>h3]:font-medium">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...props }) {
                    const isBlock = Boolean(className?.includes('language-')) || String(children).includes('\n');
                    if (isBlock) {
                      return <CodeBlock className={className}>{children}</CodeBlock>;
                    }
                    return (
                      <code
                        className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[12px] text-slate-900 dark:bg-white/10 dark:text-sky-200"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.status === 'streaming' && (
                <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-sky-500 align-middle" />
              )}
              {message.status === 'cancelled' && (
                <span className="mt-1 block text-[11px] text-slate-400">Generation stopped.</span>
              )}
            </div>
          )}
        </div>

        {/* Message actions */}
        {message.status !== 'streaming' && (
          <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
            {message.content && (
              <button
                type="button"
                onClick={handleCopyMessage}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:hover:bg-white/8 dark:hover:text-slate-100"
              >
                {copiedMsg ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{copiedMsg ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {(isLastAssistant || message.status === 'error') && !isStreamingAny && (
              <button
                type="button"
                onClick={() => onRegenerate(message.id)}
                className="flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:hover:bg-white/8 dark:hover:text-slate-100"
              >
                <RefreshCw className="h-3 w-3" />
                <span>{message.status === 'error' ? 'Retry' : 'Regenerate'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
