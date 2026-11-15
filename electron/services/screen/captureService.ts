import crypto from 'node:crypto';
import { desktopCapturer, nativeImage, type NativeImage } from 'electron';
import type {
  CaptureResponse,
  DisplayInfo,
  ImageAttachment,
  ScreenshotQuality,
  WindowSourceInfo,
} from '../../../shared/types.ts';
import type { WindowManager } from '../../main/windowManager.ts';
import { openCaptureOverlay } from '../../windows/captureOverlay.ts';
import { computeScaledDimensions, dipRectToPhysicalRect } from './cropService.ts';
import type { MonitorService } from './monitorService.ts';

export interface CaptureConfig {
  quality: ScreenshotQuality;
  maxDimensionPx: 1280 | 1920 | 2560;
  defaultDisplayId: number | null;
}

function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CaptureService {
  private readonly monitorService: MonitorService;
  private readonly windowManager: WindowManager;
  private readonly preloadPath: string;
  private readonly rendererDevUrl?: string;
  private readonly rendererDistHtml: string;

  constructor(deps: {
    monitorService: MonitorService;
    windowManager: WindowManager;
    preloadPath: string;
    rendererDevUrl?: string;
    rendererDistHtml: string;
  }) {
    this.monitorService = deps.monitorService;
    this.windowManager = deps.windowManager;
    this.preloadPath = deps.preloadPath;
    this.rendererDevUrl = deps.rendererDevUrl;
    this.rendererDistHtml = deps.rendererDistHtml;
  }

  getDisplays(): DisplayInfo[] {
    return this.monitorService.getAllDisplays();
  }

  async getWindowSources(): Promise<WindowSourceInfo[]> {
    const widgetId = this.windowManager.getWidgetMediaSourceIdPrefix();
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    });

    return sources
      .filter((src) => {
        if (!src.name || src.name === 'Vibha' || src.name === 'Floating AI') return false;
        if (widgetId && src.id === widgetId) return false;
        return !src.thumbnail.isEmpty();
      })
      .map((src) => ({
        id: src.id,
        name: src.name,
        thumbnailDataUrl: src.thumbnail.toDataURL(),
        appIconDataUrl: src.appIcon && !src.appIcon.isEmpty() ? src.appIcon.toDataURL() : undefined,
      }));
  }

  async captureFullscreen(config: CaptureConfig, displayId?: number): Promise<CaptureResponse> {
    const targetDisplay = this.monitorService.getTargetDisplay(displayId ?? config.defaultDisplayId);

    return this.withWidgetTemporarilyHidden(async () => {
      const physicalWidth = Math.round(targetDisplay.bounds.width * targetDisplay.scaleFactor);
      const physicalHeight = Math.round(targetDisplay.bounds.height * targetDisplay.scaleFactor);

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: physicalWidth, height: physicalHeight },
      });

      const matched =
        sources.find((s) => s.display_id === String(targetDisplay.id)) ??
        sources[0];

      if (!matched || matched.thumbnail.isEmpty()) {
        return { error: 'No screen source was available for capture.' };
      }

      const attachment = this.encodeNativeImage(
        matched.thumbnail,
        `fullscreen-${targetDisplay.id}`,
        config
      );
      return { attachment };
    });
  }

  async captureWindow(sourceId: string, config: CaptureConfig): Promise<CaptureResponse> {
    if (!sourceId || typeof sourceId !== 'string') {
      return { error: 'Invalid window source selected.' };
    }

    return this.withWidgetTemporarilyHidden(async () => {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: config.maxDimensionPx, height: config.maxDimensionPx },
      });

      const matched = sources.find((s) => s.id === sourceId);
      if (!matched || matched.thumbnail.isEmpty()) {
        return { error: 'Selected window is no longer available or minimized.' };
      }

      const safeTitle = matched.name.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 32) || 'window';
      const attachment = this.encodeNativeImage(matched.thumbnail, `window-${safeTitle}`, config);
      return { attachment };
    });
  }

  async captureArea(config: CaptureConfig, displayId?: number): Promise<CaptureResponse> {
    const targetDisplay = this.monitorService.getTargetDisplay(displayId ?? config.defaultDisplayId);
    const wasVisible = this.windowManager.isWidgetVisible();

    try {
      if (wasVisible) {
        this.windowManager.hideWidgetTemporarily();
        await waitMs(110);
      }

      const selection = await openCaptureOverlay({
        display: targetDisplay,
        preloadPath: this.preloadPath,
        rendererDevUrl: this.rendererDevUrl,
        rendererDistHtml: this.rendererDistHtml,
      });

      if (!selection) {
        return { cancelled: true };
      }

      // Allow overlay window to tear down before snapping underlying screen
      await waitMs(90);

      const physicalWidth = Math.round(targetDisplay.bounds.width * targetDisplay.scaleFactor);
      const physicalHeight = Math.round(targetDisplay.bounds.height * targetDisplay.scaleFactor);

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: physicalWidth, height: physicalHeight },
      });

      const matched =
        sources.find((s) => s.display_id === String(targetDisplay.id)) ??
        sources[0];

      if (!matched || matched.thumbnail.isEmpty()) {
        return { error: 'Unable to capture screen region.' };
      }

      const imgSize = matched.thumbnail.getSize();
      const physicalRect = dipRectToPhysicalRect(
        {
          x: selection.x,
          y: selection.y,
          width: selection.width,
          height: selection.height,
        },
        targetDisplay.scaleFactor,
        imgSize.width,
        imgSize.height
      );

      const cropped = matched.thumbnail.crop(physicalRect);
      const attachment = this.encodeNativeImage(cropped, 'area-capture', config);
      return { attachment };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Area capture failed.',
      };
    } finally {
      if (wasVisible) {
        this.windowManager.restoreWidgetAfterCapture();
      }
    }
  }

  private async withWidgetTemporarilyHidden(
    fn: () => Promise<CaptureResponse>
  ): Promise<CaptureResponse> {
    const wasVisible = this.windowManager.isWidgetVisible();
    try {
      if (wasVisible) {
        this.windowManager.hideWidgetTemporarily();
        await waitMs(130);
      }
      return await fn();
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Screen capture failed.',
      };
    } finally {
      if (wasVisible) {
        this.windowManager.restoreWidgetAfterCapture();
      }
    }
  }

  private encodeNativeImage(
    image: NativeImage,
    namePrefix: string,
    config: CaptureConfig
  ): ImageAttachment {
    const originalSize = image.getSize();
    const scaled = computeScaledDimensions(
      originalSize.width,
      originalSize.height,
      config.maxDimensionPx
    );

    const finalImage = scaled.resized
      ? image.resize({ width: scaled.width, height: scaled.height, quality: 'good' })
      : image;

    let buffer: Buffer | null = null;
    let mimeType: 'image/png' | 'image/jpeg' = 'image/jpeg';

    if (config.quality === 'lossless') {
      buffer = finalImage.toPNG();
      mimeType = 'image/png';
    } else {
      const jpegQuality = config.quality === 'high' ? 92 : 80;
      buffer = finalImage.toJPEG(jpegQuality);
      mimeType = 'image/jpeg';
    }

    // Fallback to empty-safe image re-read if resize produced invalid handle
    const outSize = finalImage.getSize();
    const base64Data = buffer.toString('base64');
    const sizeBytes = buffer.byteLength;

    // Explicitly release temporary buffer reference for GC
    buffer = null;
    void nativeImage;

    return {
      id: crypto.randomUUID(),
      name: `${namePrefix}.${mimeType === 'image/png' ? 'png' : 'jpg'}`,
      mimeType,
      base64Data,
      width: outSize.width,
      height: outSize.height,
      sizeBytes,
      source: 'capture',
    };
  }
}
