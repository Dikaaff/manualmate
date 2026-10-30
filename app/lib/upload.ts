export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function detectImageMime(bytes: Uint8Array): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((value, index) => bytes[index] === value)) {
    return 'image/png';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export function validateUpload(size: number, declaredMime: string, bytes: Uint8Array): string | null {
  if (size === 0) return 'The uploaded file is empty.';
  if (size > MAX_UPLOAD_BYTES) return 'The image is larger than 8 MB.';

  const detected = detectImageMime(bytes);
  if (!detected) return 'Only JPG, PNG, or WebP images are supported.';

  const declared = declaredMime.toLowerCase();
  const normalized = declared === 'image/jpg' ? 'image/jpeg' : declared;
  if (normalized && ALLOWED_MIME.has(normalized) && normalized !== detected) {
    return 'The file contents do not match the declared image type.';
  }

  return null;
}
