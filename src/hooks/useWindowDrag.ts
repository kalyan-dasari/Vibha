import { useCallback, useRef } from 'react';
import { getBridge } from '../services/electronBridge.ts';

interface UseWindowDragOptions {
  onClick?: () => void;
  onBrowserDragDelta?: (dx: number, dy: number) => void;
}

/**
 * Provides smooth pointer-delta window dragging that cleanly distinguishes
 * a click (< 4px travel) from a drag gesture, avoiding -webkit-app-region: drag
 * click-swallowing issues on the floating orb.
 */
export function useWindowDrag(options: UseWindowDragOptions = {}) {
  const dragStateRef = useRef<{
    active: boolean;
    startScreenX: number;
    startScreenY: number;
    lastScreenX: number;
    lastScreenY: number;
    moved: boolean;
  }>({
    active: false,
    startScreenX: 0,
    startScreenY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    moved: false,
  });

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    // Ignore clicks on interactive buttons inside a draggable header
    const target = e.target as HTMLElement;
    if (target.closest('button, input, textarea, select, a, [data-no-drag="true"]')) {
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startScreenX: e.screenX,
      startScreenY: e.screenY,
      lastScreenX: e.screenX,
      lastScreenY: e.screenY,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragStateRef.current;
      if (!state.active) return;

      const totalDx = Math.abs(e.screenX - state.startScreenX);
      const totalDy = Math.abs(e.screenY - state.startScreenY);
      if (totalDx > 4 || totalDy > 4) {
        state.moved = true;
      }

      const deltaX = e.screenX - state.lastScreenX;
      const deltaY = e.screenY - state.lastScreenY;
      if (deltaX === 0 && deltaY === 0) return;

      state.lastScreenX = e.screenX;
      state.lastScreenY = e.screenY;

      const bridge = getBridge();
      if (bridge) {
        void bridge.window.moveBy(deltaX, deltaY);
      } else if (options.onBrowserDragDelta) {
        options.onBrowserDragDelta(deltaX, deltaY);
      }
    },
    [options]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const state = dragStateRef.current;
      if (!state.active) return;
      state.active = false;
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore if capture already released
      }

      if (!state.moved && options.onClick) {
        options.onClick();
      }
    },
    [options]
  );

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
