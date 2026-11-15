import React, { useEffect, useState } from 'react';
import { getBridge } from '../services/electronBridge.ts';

interface DragBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const CaptureOverlayView: React.FC = () => {
  const [box, setBox] = useState<DragBox | null>(null);

  const params = new URLSearchParams(window.location.search);
  const displayId = Number(params.get('displayId') ?? 0);
  const scaleFactor = Number(params.get('scaleFactor') ?? 1);

  const cancelSelection = () => {
    const bridge = getBridge();
    bridge?.capture.submitAreaSelection(null);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelSelection();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const rect = box
    ? {
        x: Math.min(box.startX, box.currentX),
        y: Math.min(box.startY, box.currentY),
        width: Math.abs(box.currentX - box.startX),
        height: Math.abs(box.currentY - box.startY),
      }
    : null;

  return (
    <div
      className="fixed inset-0 cursor-crosshair bg-black/35 select-none"
      onContextMenu={(e) => {
        e.preventDefault();
        cancelSelection();
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setBox({
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
        });
      }}
      onPointerMove={(e) => {
        if (!box) return;
        setBox({
          ...box,
          currentX: e.clientX,
          currentY: e.clientY,
        });
      }}
      onPointerUp={() => {
        if (!rect) return;
        setBox(null);
        const bridge = getBridge();
        if (rect.width < 8 || rect.height < 8) {
          bridge?.capture.submitAreaSelection(null);
          return;
        }
        bridge?.capture.submitAreaSelection({
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          displayId,
          scaleFactor,
        });
      }}
    >
      <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 rounded-lg border border-white/15 bg-slate-950/90 px-3.5 py-1.5 text-xs text-slate-100 shadow-lg">
        Drag to select screen region · Press <span className="font-mono text-sky-400">Esc</span> or right-click to cancel
      </div>

      {rect && rect.width > 0 && rect.height > 0 && (
        <div
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
          className="pointer-events-none fixed border-2 border-sky-400 bg-sky-400/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
        >
          <span className="absolute -bottom-6 left-0 rounded bg-slate-950/90 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-sky-300">
            {Math.round(rect.width)} × {Math.round(rect.height)}
          </span>
        </div>
      )}
    </div>
  );
};
