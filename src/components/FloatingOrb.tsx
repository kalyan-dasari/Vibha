import React from 'react';
import vibhaAvatar from '../../resources/icons/icon.png';
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
        aria-label="Open Vibha assistant"
        title="Vibha — Click to expand, drag to move (Ctrl+Space)"
        data-drag-handle="true"
        onPointerDown={dragHandlers.onPointerDown}
        onPointerMove={dragHandlers.onPointerMove}
        onPointerUp={dragHandlers.onPointerUp}
        onPointerCancel={dragHandlers.onPointerCancel}
        className="group relative flex h-[60px] w-[60px] cursor-grab active:cursor-grabbing items-center justify-center rounded-full border border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_10px_28px_rgba(2,6,23,0.22)] transition-transform duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.05] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 dark:border-white/14 dark:bg-[#0D121B]/95 dark:text-slate-100 dark:shadow-[0_12px_32px_rgba(0,0,0,0.55)] touch-none"
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

        {/* Primary Vibha Avatar image */}
        <img
          src={vibhaAvatar}
          alt="Vibha"
          className="relative z-10 h-10 w-10 rounded-full object-cover shadow-sm transition-transform duration-200 group-hover:scale-105 pointer-events-none select-none"
        />
      </button>
    </div>
  );
};
