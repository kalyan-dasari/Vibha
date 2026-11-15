import { BrowserWindow, screen } from 'electron';
import type { SettingsService } from '../services/security/settingsService.ts';
import {
  CHAT_WINDOW_SIZE,
  ORB_WINDOW_SIZE,
  type RectBounds,
  clampBoundsToWorkArea,
  computeCollapsedBounds,
  computeExpandedBounds,
  getDefaultOrbBounds,
} from '../windows/chatWindow.ts';
import { createWidgetWindow } from '../windows/widgetWindow.ts';

export class WindowManager {
  private widgetWindow: BrowserWindow | null = null;
  private expanded = false;
  private lastOrbBounds: RectBounds | null = null;
  private temporarilyHidden = false;

  private readonly preloadPath: string;
  private readonly rendererDevUrl?: string;
  private readonly rendererDistHtml: string;
  private readonly settingsService: SettingsService;

  constructor(deps: {
    preloadPath: string;
    rendererDevUrl?: string;
    rendererDistHtml: string;
    settingsService: SettingsService;
  }) {
    this.preloadPath = deps.preloadPath;
    this.rendererDevUrl = deps.rendererDevUrl;
    this.rendererDistHtml = deps.rendererDistHtml;
    this.settingsService = deps.settingsService;
  }

  initWidget(): BrowserWindow {
    if (this.widgetWindow && !this.widgetWindow.isDestroyed()) {
      return this.widgetWindow;
    }

    const primary = screen.getPrimaryDisplay();
    const initialOrb = getDefaultOrbBounds(primary.workArea);
    this.lastOrbBounds = initialOrb;
    const settings = this.settingsService.getSettings();

    this.widgetWindow = createWidgetWindow({
      preloadPath: this.preloadPath,
      rendererDevUrl: this.rendererDevUrl,
      rendererDistHtml: this.rendererDistHtml,
      hideFromTaskbar: settings.hideFromTaskbar,
      initialBounds: initialOrb,
    });

    this.widgetWindow.on('closed', () => {
      this.widgetWindow = null;
    });

    this.registerDisplayListeners();
    return this.widgetWindow;
  }

  getWidgetWindow(): BrowserWindow | null {
    return this.widgetWindow && !this.widgetWindow.isDestroyed() ? this.widgetWindow : null;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  isWidgetVisible(): boolean {
    const win = this.getWidgetWindow();
    return Boolean(win && win.isVisible());
  }

  getWidgetMediaSourceIdPrefix(): string | null {
    const win = this.getWidgetWindow();
    return win ? win.getMediaSourceId() : null;
  }

  setExpanded(nextExpanded: boolean): void {
    const win = this.getWidgetWindow();
    if (!win) return;

    const currentBounds = win.getBounds();
    const display = screen.getDisplayMatching(currentBounds);
    const behavior = this.settingsService.getSettings().widgetPositionBehavior;

    if (nextExpanded === this.expanded) {
      if (nextExpanded) {
        win.show();
        win.focus();
      }
      return;
    }

    if (nextExpanded) {
      this.lastOrbBounds = {
        x: currentBounds.x,
        y: currentBounds.y,
        width: ORB_WINDOW_SIZE.width,
        height: ORB_WINDOW_SIZE.height,
      };
      const target = computeExpandedBounds(this.lastOrbBounds, display.workArea);
      this.expanded = true;
      // Use explicit setBounds with fixed width/height to prevent Windows DPI drift
      win.setBounds(target, false);
      win.show();
      win.focus();
      win.webContents.send('window:expanded-changed', true);
      win.webContents.send('window:focus-input');
    } else {
      const orbAnchor =
        behavior === 'snap-corner' ? getDefaultOrbBounds(display.workArea) : this.lastOrbBounds;
      const target = computeCollapsedBounds(currentBounds, orbAnchor, display.workArea);
      this.lastOrbBounds = target;
      this.expanded = false;
      win.setBounds(target, false);
      win.webContents.send('window:expanded-changed', false);
    }
  }

  moveBy(deltaX: number, deltaY: number): void {
    const win = this.getWidgetWindow();
    if (!win) return;
    if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return;

    const current = win.getBounds();
    const expectedSize = this.expanded ? CHAT_WINDOW_SIZE : ORB_WINDOW_SIZE;
    const nextRaw: RectBounds = {
      x: Math.round(current.x + deltaX),
      y: Math.round(current.y + deltaY),
      width: expectedSize.width,
      height: expectedSize.height,
    };

    const display = screen.getDisplayNearestPoint({ x: nextRaw.x, y: nextRaw.y });
    const clamped = clampBoundsToWorkArea(nextRaw, display.workArea);

    // Explicitly preserve width/height in setBounds to guard against Windows 125%/150% DPI scaling drift
    win.setBounds(clamped, false);

    if (!this.expanded) {
      this.lastOrbBounds = clamped;
    }
  }

  hide(): void {
    const win = this.getWidgetWindow();
    if (!win) return;
    win.hide();
  }

  minimizeToOrb(): void {
    this.setExpanded(false);
  }

  toggleFromShortcut(): void {
    const win = this.getWidgetWindow();
    if (!win) {
      this.initWidget();
      this.setExpanded(true);
      return;
    }

    if (!win.isVisible()) {
      this.clampCurrentWindowToNearestDisplay();
      win.show();
      this.setExpanded(true);
      return;
    }

    if (!this.expanded) {
      this.setExpanded(true);
      return;
    }

    if (win.isFocused()) {
      this.setExpanded(false);
    } else {
      win.show();
      win.focus();
      win.webContents.send('window:focus-input');
    }
  }

  restoreOrExpand(): void {
    const win = this.getWidgetWindow();
    if (!win) return;
    this.clampCurrentWindowToNearestDisplay();
    win.show();
    this.setExpanded(true);
  }

  applyTaskbarVisibility(hideFromTaskbar: boolean): void {
    const win = this.getWidgetWindow();
    if (!win) return;
    win.setSkipTaskbar(hideFromTaskbar);
  }

  hideWidgetTemporarily(): void {
    const win = this.getWidgetWindow();
    if (!win || !win.isVisible()) return;
    this.temporarilyHidden = true;
    win.hide();
  }

  restoreWidgetAfterCapture(): void {
    const win = this.getWidgetWindow();
    if (!win || !this.temporarilyHidden) return;
    this.temporarilyHidden = false;
    win.show();
    if (this.expanded) {
      win.focus();
    }
  }

  clampCurrentWindowToNearestDisplay(): void {
    const win = this.getWidgetWindow();
    if (!win) return;
    const current = win.getBounds();
    const expectedSize = this.expanded ? CHAT_WINDOW_SIZE : ORB_WINDOW_SIZE;
    const display = screen.getDisplayMatching(current);
    const clamped = clampBoundsToWorkArea(
      {
        x: current.x,
        y: current.y,
        width: expectedSize.width,
        height: expectedSize.height,
      },
      display.workArea
    );
    win.setBounds(clamped, false);
  }

  private registerDisplayListeners(): void {
    const reclamp = () => this.clampCurrentWindowToNearestDisplay();
    screen.on('display-added', reclamp);
    screen.on('display-removed', reclamp);
    screen.on('display-metrics-changed', reclamp);
  }
}
