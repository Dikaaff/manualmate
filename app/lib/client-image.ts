export const MAX_CLIENT_UPLOAD_BYTES = 8 * 1024 * 1024;

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type PreparedImage = {
  blob: Blob;
  dataUrl: string;
  historyImage: string;
  thumb: string;
  width: number;
  height: number;
};

export function validateClientFile(file: File): string | null {
  if (!file.size) return 'That file is empty. Choose another photo.';
  if (file.size > MAX_CLIENT_UPLOAD_BYTES) return 'The photo is larger than 8 MB. Choose a smaller file.';
  if (!ACCEPTED_TYPES.has(file.type)) {
    return 'Use a JPG, PNG, or WebP photo. HEIC files from some phones are not supported.';
  }
  return null;
}

async function loadImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, width: bitmap.width, height: bitmap.height };
    } catch {
      // Fall back to an <img> decode below.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('This photo could not be decoded. Try another file.'));
      element.src = url;
    });
    return { source: image, width: image.naturalWidth, height: image.naturalHeight };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function renderDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  quality: number,
): string {
  const scale = Math.min(1, maxEdge / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot process images.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('The photo could not be compressed.'))),
      'image/jpeg',
      quality,
    );
  });
}

export async function prepareImage(file: File, maxEdge = 1280, quality = 0.86): Promise<PreparedImage> {
  const { source, width, height } = await loadImage(file);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot process images.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, targetWidth, targetHeight);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const blob = await canvasToBlob(canvas, quality);

  return {
    blob,
    dataUrl,
    historyImage: renderDataUrl(source, width, height, 640, 0.78),
    thumb: renderDataUrl(source, width, height, 180, 0.7),
    width: targetWidth,
    height: targetHeight,
  };
}
