import React, { useEffect, useState } from 'react';
import { AppWindow, ChevronLeft, Crop, Loader2, Monitor } from 'lucide-react';
import type { DisplayInfo, WindowSourceInfo } from '../types/index.ts';

interface CaptureMenuProps {
  open: boolean;
  capturing: boolean;
  displays: DisplayInfo[];
  windows: WindowSourceInfo[];
  onClose: () => void;
  onLoadDisplays: () => Promise<DisplayInfo[]>;
  onLoadWindows: () => Promise<WindowSourceInfo[]>;
  onCaptureFullscreen: (displayId?: number) => Promise<boolean>;
  onCaptureWindow: (sourceId: string) => Promise<boolean>;
  onCaptureArea: (displayId?: number) => Promise<boolean>;
}

type SubView = 'root' | 'displays-full' | 'displays-area' | 'windows';

export const CaptureMenu: React.FC<CaptureMenuProps> = ({
  open,
  capturing,
  displays,
  windows,
  onClose,
  onLoadDisplays,
  onLoadWindows,
  onCaptureFullscreen,
  onCaptureWindow,
  onCaptureArea,
}) => {
  const [subView, setSubView] = useState<SubView>('root');
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    if (!open) {
      setSubView('root');
    }
  }, [open]);

  if (!open) return null;

  const handleFullscreenClick = async () => {
    setLoadingList(true);
    try {
      const list = await onLoadDisplays();
      if (list.length > 1) {
        setSubView('displays-full');
      } else {
        onClose();
        await onCaptureFullscreen(list[0]?.id);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleAreaClick = async () => {
    setLoadingList(true);
    try {
      const list = await onLoadDisplays();
      if (list.length > 1) {
        setSubView('displays-area');
      } else {
        onClose();
        await onCaptureArea(list[0]?.id);
      }
    } finally {
      setLoadingList(false);
    }
  };

  const handleWindowsClick = async () => {
    setSubView('windows');
    setLoadingList(true);
    try {
      await onLoadWindows();
    } finally {
      setLoadingList(false);
    }
  };

  return (
    <div
      className="absolute right-3 bottom-[64px] z-30 w-[270px] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/98 shadow-2xl backdrop-blur-xl dark:border-white/12 dark:bg-[#131923]/98 animate-in fade-in zoom-in-95 duration-150"
      role="dialog"
      aria-label="Screen capture modes"
    >
      {subView === 'root' && (
        <div className="p-1.5">
          <p className="px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Screen Capture
          </p>

          <button
            type="button"
            disabled={capturing || loadingList}
            onClick={handleFullscreenClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-100 dark:hover:bg-white/8"
          >
            <Monitor className="h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0">
              <div className="font-medium">Full Screen</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Capture entire monitor
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={capturing || loadingList}
            onClick={handleWindowsClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-100 dark:hover:bg-white/8"
          >
            <AppWindow className="h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0">
              <div className="font-medium">Active Window</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose an open application
              </div>
            </div>
          </button>

          <button
            type="button"
            disabled={capturing || loadingList}
            onClick={handleAreaClick}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:text-slate-100 dark:hover:bg-white/8"
          >
            <Crop className="h-4 w-4 shrink-0 text-sky-500" />
            <div className="min-w-0">
              <div className="font-medium">Select Area</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                Drag a custom screen region
              </div>
            </div>
          </button>
        </div>
      )}

      {(subView === 'displays-full' || subView === 'displays-area') && (
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => setSubView('root')}
            className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Select Monitor</span>
          </button>
          <div className="max-h-52 space-y-1 overflow-y-auto floating-scroll">
            {displays.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={async () => {
                  onClose();
                  if (subView === 'displays-full') {
                    await onCaptureFullscreen(d.id);
                  } else {
                    await onCaptureArea(d.id);
                  }
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/8"
              >
                <span className="truncate font-medium">{d.label}</span>
                <span className="ml-2 shrink-0 font-mono text-[10px] tabular-nums text-slate-400">
                  {d.bounds.width}×{d.bounds.height}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {subView === 'windows' && (
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => setSubView('root')}
            className="mb-1 flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/8 dark:hover:text-slate-100"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span>Choose Window</span>
          </button>

          {loadingList ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading windows...</span>
            </div>
          ) : windows.length === 0 ? (
            <p className="px-2.5 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
              No captureable windows found.
            </p>
          ) : (
            <div className="floating-scroll max-h-56 space-y-1 overflow-y-auto">
              {windows.map((win) => (
                <button
                  key={win.id}
                  type="button"
                  onClick={async () => {
                    onClose();
                    await onCaptureWindow(win.id);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg p-1.5 text-left text-xs text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-white/8"
                >
                  <img
                    src={win.thumbnailDataUrl}
                    alt={win.name}
                    className="h-8 w-12 shrink-0 rounded border border-slate-200 object-cover dark:border-white/10"
                  />
                  <span className="truncate font-medium">{win.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
