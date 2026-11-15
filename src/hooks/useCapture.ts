import { useCallback, useState } from 'react';
import { getBridge } from '../services/electronBridge.ts';
import { useChatStore } from '../stores/chatStore.ts';
import type { DisplayInfo, WindowSourceInfo } from '../types/index.ts';

export function useCapture() {
  const [capturing, setCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [displays, setDisplays] = useState<DisplayInfo[]>([]);
  const [windows, setWindows] = useState<WindowSourceInfo[]>([]);
  const addPendingAttachment = useChatStore((s) => s.addPendingAttachment);

  const loadDisplays = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) {
      setDisplays([]);
      return [];
    }
    const list = await bridge.capture.getDisplays();
    setDisplays(list);
    return list;
  }, []);

  const loadWindows = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) {
      setWindows([]);
      return [];
    }
    const list = await bridge.capture.getWindows();
    setWindows(list);
    return list;
  }, []);

  const captureFullscreen = useCallback(
    async (displayId?: number) => {
      const bridge = getBridge();
      if (!bridge) {
        setCaptureError('Screen capture requires the Electron desktop runtime (desktopCapturer).');
        return false;
      }
      setCapturing(true);
      setCaptureError(null);
      try {
        const res = await bridge.capture.captureFullscreen({ displayId });
        if (res.error) {
          setCaptureError(res.error);
          return false;
        }
        if (res.attachment) {
          addPendingAttachment(res.attachment);
          return true;
        }
        return false;
      } finally {
        setCapturing(false);
      }
    },
    [addPendingAttachment]
  );

  const captureWindow = useCallback(
    async (sourceId: string) => {
      const bridge = getBridge();
      if (!bridge) {
        setCaptureError('Window capture requires the Electron desktop runtime.');
        return false;
      }
      setCapturing(true);
      setCaptureError(null);
      try {
        const res = await bridge.capture.captureWindow({ sourceId });
        if (res.error) {
          setCaptureError(res.error);
          return false;
        }
        if (res.attachment) {
          addPendingAttachment(res.attachment);
          return true;
        }
        return false;
      } finally {
        setCapturing(false);
      }
    },
    [addPendingAttachment]
  );

  const captureArea = useCallback(
    async (displayId?: number) => {
      const bridge = getBridge();
      if (!bridge) {
        setCaptureError('Area selection capture requires the Electron desktop runtime.');
        return false;
      }
      setCapturing(true);
      setCaptureError(null);
      try {
        const res = await bridge.capture.captureArea(displayId);
        if (res.cancelled) {
          return false;
        }
        if (res.error) {
          setCaptureError(res.error);
          return false;
        }
        if (res.attachment) {
          addPendingAttachment(res.attachment);
          return true;
        }
        return false;
      } finally {
        setCapturing(false);
      }
    },
    [addPendingAttachment]
  );

  return {
    capturing,
    captureError,
    clearCaptureError: () => setCaptureError(null),
    displays,
    windows,
    loadDisplays,
    loadWindows,
    captureFullscreen,
    captureWindow,
    captureArea,
  };
}
