import React, { useState } from 'react';
import { Camera, Maximize2, X } from 'lucide-react';
import { formatBytes } from '../services/imageService.ts';
import type { ImageAttachment } from '../types/index.ts';

interface ScreenshotPreviewProps {
  attachments: ImageAttachment[];
  onRemove: (id: string) => void;
  onRecapture: () => void;
}

export const ScreenshotPreview: React.FC<ScreenshotPreviewProps> = ({
  attachments,
  onRemove,
  onRecapture,
}) => {
  const [zoomed, setZoomed] = useState<ImageAttachment | null>(null);

  if (attachments.length === 0) return null;

  return (
    <>
      <div className="border-t border-slate-200 bg-slate-50/70 px-3 py-2 dark:border-white/8 dark:bg-[#0D1118]/80">
        <div className="floating-scroll flex items-center gap-2 overflow-x-auto pb-0.5">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="group relative flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white p-1.5 pr-2 dark:border-white/10 dark:bg-[#151B25]"
            >
              <button
                type="button"
                onClick={() => setZoomed(att)}
                className="relative h-10 w-14 overflow-hidden rounded border border-slate-200 dark:border-white/10"
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
                <p className="max-w-[110px] truncate text-[11px] font-medium text-slate-800 dark:text-slate-200">
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
                    className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100"
                  >
                    <Camera className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(att.id)}
                  title="Remove attachment"
                  aria-label="Remove attachment"
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-rose-500/15 hover:text-rose-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {zoomed && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(null)}
        >
          <div
            className="relative max-h-full max-w-full overflow-hidden rounded-xl border border-white/15 bg-slate-950 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomed(null)}
              aria-label="Close preview"
              className="absolute top-3 right-3 rounded-lg bg-black/70 p-1.5 text-white hover:bg-black"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={`data:${zoomed.mimeType};base64,${zoomed.base64Data}`}
              alt={zoomed.name}
              className="max-h-[420px] max-w-full rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};
