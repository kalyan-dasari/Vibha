import React, { useMemo, useState } from 'react';
import hljs from 'highlight.js/lib/common';
import { AlertCircle, Briefcase, Check, Copy, FileText, RefreshCw, Star, Zap } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import vibhaAvatar from '../../resources/icons/icon.png';
import { countCharactersAndWords, REFINEMENT_PROMPTS } from '../services/profilePromptService.ts';
import type { UIMessage } from '../types/index.ts';

interface MessageBubbleProps {
  message: UIMessage;
  isLastAssistant: boolean;
  isStreamingAny: boolean;
  onRegenerate: (assistantMessageId: string) => void;
  onRefine?: (refinementPrompt: string) => void;
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
    <div className="my-2.5 overflow-hidden rounded-xl border border-slate-800 bg-[#0A0E17] text-slate-100 shadow-md">
      <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-400">
        <span className="font-mono font-medium tracking-wide text-sky-400">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          <span className="text-[11px]">{copied ? 'Copied' : 'Copy'}</span>
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
  onRefine,
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
        <div className="max-w-[85%] space-y-2 rounded-2xl rounded-tr-xs bg-gradient-to-r from-sky-600 to-blue-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-md shadow-sky-500/10">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pb-1">
              {message.attachments.map((att) => (
                <div key={att.id} className="relative overflow-hidden rounded-lg border border-white/20">
                  <img
                    src={`data:${att.mimeType};base64,${att.base64Data}`}
                    alt={att.name}
                    className="max-h-36 max-w-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-1.5 py-0.5 text-[9px] font-mono text-white/90 truncate">
                    {att.name}
                  </div>
                </div>
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
      <div className="group w-full max-w-[95%] space-y-1.5">
        {/* Assistant Header Badge with Vibha Avatar */}
        <div className="flex items-center gap-1.5 pl-1">
          <div className="h-5 w-5 rounded-md overflow-hidden border border-slate-200/80 bg-slate-100 dark:border-white/10 dark:bg-slate-800 shrink-0 shadow-xs">
            <img src={vibhaAvatar} alt="Vibha" className="h-full w-full object-cover select-none pointer-events-none" />
          </div>
          <span className="text-[11px] font-semibold tracking-tight text-slate-800 dark:text-slate-200">
            Vibha
          </span>
          {message.status === 'streaming' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-sky-500 animate-pulse">
              <span className="h-1 w-1 rounded-full bg-sky-500" />
              generating...
            </span>
          )}
        </div>

        {/* Message Content Card */}
        <div className="rounded-2xl rounded-tl-xs border border-slate-200/80 bg-white/90 px-3.5 py-3 text-[13px] leading-relaxed text-slate-800 shadow-sm backdrop-blur-sm dark:border-white/8 dark:bg-[#121824]/90 dark:text-slate-100">
          {message.status === 'error' ? (
            <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold">Request failed</p>
                <p className="text-xs leading-normal break-words text-rose-700 dark:text-rose-300/90">
                  {message.errorMessage || 'An unexpected error occurred.'}
                </p>
              </div>
            </div>
          ) : message.content.length === 0 && message.status === 'streaming' ? (
            <div className="flex items-center gap-2 py-1.5 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky-500" />
              </div>
              <span className="text-[11px] text-slate-400">Thinking...</span>
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
                        className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-medium text-sky-700 dark:bg-white/10 dark:text-sky-300"
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
                <span className="ml-1 inline-block h-3.5 w-1.5 animate-pulse rounded-full bg-sky-500 align-middle" />
              )}
              {message.status === 'cancelled' && (
                <span className="mt-1.5 block text-[11px] text-slate-400 italic">Generation stopped.</span>
              )}
            </div>
          )}
        </div>

        {/* Message Actions */}
        {message.status !== 'streaming' && (
          <div className="flex flex-col gap-1.5 pl-1 text-[11px] text-slate-400 opacity-90 transition-opacity">
            <div className="flex items-center gap-2">
              {message.content && (
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200"
                >
                  {copiedMsg ? (
                    <Check className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  <span>{copiedMsg ? 'Copied' : 'Copy'}</span>
                </button>
              )}

              {message.content && (
                <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                  {countCharactersAndWords(message.content).chars} chars · {countCharactersAndWords(message.content).words} words
                </span>
              )}

              {(isLastAssistant || message.status === 'error') && !isStreamingAny && (
                <button
                  type="button"
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-200 ml-auto"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>{message.status === 'error' ? 'Retry' : 'Regenerate'}</span>
                </button>
              )}
            </div>

            {/* Quick Refinement Pills for Job Applications */}
            {isLastAssistant && !isStreamingAny && onRefine && message.content && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mr-0.5">Refine:</span>
                <button
                  type="button"
                  onClick={() => onRefine(REFINEMENT_PROMPTS.shorter)}
                  title="Make answer shorter (under 100 words)"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <Zap className="h-2.5 w-2.5 text-amber-500" />
                  <span>Shorter</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRefine(REFINEMENT_PROMPTS.detailed)}
                  title="Add more technical and impact details"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <FileText className="h-2.5 w-2.5 text-blue-500" />
                  <span>Detailed</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRefine(REFINEMENT_PROMPTS.formal)}
                  title="Make tone formal and executive"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <Briefcase className="h-2.5 w-2.5 text-indigo-500" />
                  <span>Formal</span>
                </button>
                <button
                  type="button"
                  onClick={() => onRefine(REFINEMENT_PROMPTS.star)}
                  title="Format as Situation, Task, Action, Result"
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:bg-sky-500/15 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                >
                  <Star className="h-2.5 w-2.5 text-amber-400" />
                  <span>STAR Format</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
