import React from 'react';
import { useWindowDrag } from '../hooks/useWindowDrag.ts';

interface FloatingOrbProps {
  isStreaming: boolean;
  hasError: boolean;
  isConfigured: boolean;
  onExpand: () => void;
  onBrowserDragDelta?: (dx: number, dy: number) => void;
}

export const FloatingOrb: React.FC<FloatingOrbProps> = ({
  isStreaming,
  hasError,
  isConfigured,
  onExpand,
  onBrowserDragDelta,
}) => {
  const dragHandlers = useWindowDrag({
    onClick: onExpand,
    onBrowserDragDelta,
  });

  return (
    <div className="flex h-full w-full items-center justify-center p-2 select-none">
      <button
        type="button"
        aria-label="Open Floating AI assistant"
        title="Floating AI — Click to expand, drag to move (Ctrl+Space)"
        onPointerDown={dragHandlers.onPointerDown}
        onPointerMove={dragHandlers.onPointerMove}
        onPointerUp={dragHandlers.onPointerUp}
        className="group relative flex h-[60px] w-[60px] cursor-grab active:cursor-grabbing items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.22)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.05] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-white/14 dark:bg-[#0D121B]/95 dark:text-slate-100 dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)]"
      >
        {/* Subtle concentric accent ring */}
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-[3px] rounded-full border transition-colors duration-200 ${
            hasError
              ? 'border-rose-500/60'
              : isStreaming
                ? 'border-sky-400/75 animate-pulse'
                : isConfigured
                  ? 'border-sky-500/30 group-hover:border-sky-400/60'
                  : 'border-slate-400/20 group-hover:border-slate-400/40'
          }`}
        />

        {/* Custom geometric Floating AI aperture icon */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative z-10 transition-transform duration-200 group-hover:scale-105"
          aria-hidden="true"
        >
          <circle
            cx="14"
            cy="14"
            r="10.5"
            className="stroke-sky-500 dark:stroke-sky-400"
            strokeWidth="1.75"
            strokeDasharray="48 18"
            strokeLinecap="round"
          />
          <circle
            cx="14"
            cy="14"
            r="5"
            className="fill-sky-500/15 stroke-slate-800 dark:fill-sky-400/20 dark:stroke-slate-100"
            strokeWidth="1.75"
          />
          <circle cx="14" cy="14" r="2" className="fill-sky-500 dark:fill-sky-400" />
        </svg>
      </button>
    </div>
  );
};
