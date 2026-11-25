import React, { useState } from 'react';
import { Camera, Maximize2, Sparkles, X } from 'lucide-react';
import { formatBytes } from '../services/imageService.ts';
import type { ImageAttachment } from '../types/index.ts';

interface ScreenshotPreviewProps {
  attachments: ImageAttachment[];
  onRemove: (id: string) => void;
  onRecapture: () => void;
  onAnswerWithProfile?: () => void;
}

export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  attachments,
  onRemove,
  onRecapture,
  onAnswerWithProfile,
}) => {
  const [zoomed, setZoomed] = useState<ImageAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="border-t border-slate-200/80 bg-slate-50/80 px-3 py-2 backdrop-blur-md dark:border-white/8 dark:bg-[#0D1118]/80">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
            Captured Screen ({attachments.length})
          </span>
          {onAnswerWithProfile && (
            <button
              type="button"
              onClick={onAnswerWithProfile}
              title="Auto-draft an answer to the question in this screenshot using your profile"
              className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-500 to-sky-600 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow-xs hover:from-indigo-400 hover:to-sky-500 active:scale-95 transition-all"
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span>Answer with Profile</span>
            </button>
          )}
        </div>
        <div className="floating-scroll flex items-center gap-2 overflow-x-auto pb-0.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex shrink-0 items-center gap-2 rounded-xl border border-slate-200/90 bg-white/95 p-1.5 pr-2.5 shadow-xs dark:border-white/10 dark:bg-[#151B25]"
            >
              <button
                type="button"
                onClick={() => setZoomed(att)}
                className="relative h-10 w-14 overflow-hidden rounded-lg border border-slate-200/90 dark:border-white/10 shrink-0"
                title="Inspect captured image"
              >
                <img
                  src={`data:${att.mimeType};base64,${att.base64Data}`}
                  alt={att.name}
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  <Maximize2 className="h-3 w-3 text-white" />
                </span>
              </button>

              <div className="min-w-0">
                <p className="max-w-[110px] truncate text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  {att.name}
                </p>
                <p className="font-mono text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
                  {att.width}×{att.height} · {formatBytes(att.sizeBytes)}
                </p>
              </div>

              <div className="flex items-center gap-0.5">
                {att.source === 'capture' && (
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(att.id);
                      onRecapture();
                    }}
                    title="Recapture screenshot"
                    aria-label="Recapture screenshot"
                    className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  title="Remove attachment"
                  aria-label="Remove attachment"
                  className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setZoomed(null)}
        >
          <div
            className="relative max-h-full max-w-full overflow-hidden rounded-2xl border border-white/20 bg-slate-950 p-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Close preview"
              className="absolute top-3 right-3 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={`data:${zoomed.mimeType};base64,${zoomed.base64Data}`}
              alt={zoomed.name}
              className="max-h-[80vh] max-w-[85vw] rounded-xl object-contain"
            />
            <div className="mt-2 flex items-center justify-between px-2 text-[11px] text-slate-400 font-mono">
              <span>{zoomed.name}</span>
              <span>
                {zoomed.width}×{zoomed.height} · {formatBytes(zoomed.sizeBytes)}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
