export interface DipRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhysicalRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const MIN_CROP_DIMENSION_PX = 8;

/**
 * Converts a DIP (device-independent pixel) selection rectangle from a display overlay
 * into physical image pixel coordinates clamped to the captured frame dimensions.
 */
export function dipRectToPhysicalRect(
  rect: DipRectangle,
  scaleFactor: number,
  imageWidth: number,
  imageHeight: number
): PhysicalRectangle {
  const safeScale = Number.isFinite(scaleFactor) && scaleFactor > 0 ? scaleFactor : 1;

  const rawX = Math.round(rect.x * safeScale);
  const rawY = Math.round(rect.y * safeScale);
  const rawW = Math.round(rect.width * safeScale);
  const rawH = Math.round(rect.height * safeScale);

  const clampedX = Math.max(0, Math.min(rawX, Math.max(0, imageWidth - 1)));
  const clampedY = Math.max(0, Math.min(rawY, Math.max(0, imageHeight - 1)));

  const maxW = Math.max(0, imageWidth - clampedX);
  const maxH = Math.max(0, imageHeight - clampedY);

  const clampedWidth = Math.max(0, Math.min(rawW, maxW));
  const clampedHeight = Math.max(0, Math.min(rawH, maxH));

  if (clampedWidth < MIN_CROP_DIMENSION_PX || clampedHeight < MIN_CROP_DIMENSION_PX) {
    throw new Error(`Selection area is too small (minimum ${MIN_CROP_DIMENSION_PX}x${MIN_CROP_DIMENSION_PX} pixels).`);
  }

  return {
    x: clampedX,
    y: clampedY,
    width: clampedWidth,
    height: clampedHeight,
  };
}

/**
 * Computes target dimensions preserving aspect ratio when downscaling oversized screenshots.
 */
export function computeScaledDimensions(
  width: number,
  height: number,
  maxDimension: number
): { width: number; height: number; resized: boolean } {
  if (width <= 0 || height <= 0) {
    return { width: 1, height: 1, resized: false };
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height, resized: false };
  }
  const ratio = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    resized: true,
  };
}
