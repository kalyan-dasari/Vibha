import type { ImageAttachment } from '../types/index.ts';

const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_UPLOAD_DIMENSION = 2048;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Loads a user-selected local image file, normalizes oversized dimensions on an offscreen canvas,
 * and returns an in-memory ImageAttachment without storing anything to disk or localStorage.
 */
export async function processImageFile(file: File): Promise<ImageAttachment> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Unsupported image format. Please choose PNG, JPEG, or WebP.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image exceeds the 10 MB attachment limit.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Failed to decode selected image file.'));
      el.src = objectUrl;
    });

    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = longest > MAX_UPLOAD_DIMENSION ? MAX_UPLOAD_DIMENSION / longest : 1;
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize canvas for image preprocessing.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    const outputMime: 'image/png' | 'image/jpeg' | 'image/webp' =
      file.type === 'image/png' ? 'image/png' : file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

    const dataUrl = canvas.toDataURL(outputMime, outputMime === 'image/png' ? undefined : 0.9);
    const base64Data = dataUrl.split(',')[1] ?? '';
    const sizeBytes = Math.ceil((base64Data.length * 3) / 4);

    return {
      id: crypto.randomUUID(),
      name: file.name,
      mimeType: outputMime,
      base64Data,
      width,
      height,
      sizeBytes,
      source: 'file',
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
