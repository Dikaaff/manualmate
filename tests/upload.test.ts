import assert from 'node:assert/strict';
import test from 'node:test';
import { detectImageMime, MAX_UPLOAD_BYTES, validateUpload } from '../app/lib/upload';

const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

test('detects image signatures instead of trusting a filename', () => {
  assert.equal(detectImageMime(jpeg), 'image/jpeg');
  assert.equal(detectImageMime(png), 'image/png');
  assert.equal(detectImageMime(webp), 'image/webp');
  assert.equal(detectImageMime(new Uint8Array([1, 2, 3, 4])), null);
});

test('accepts a valid upload', () => {
  assert.equal(validateUpload(jpeg.byteLength, 'image/jpeg', jpeg), null);
  assert.equal(validateUpload(png.byteLength, 'image/png', png), null);
});

test('rejects an empty file', () => {
  assert.match(String(validateUpload(0, 'image/jpeg', new Uint8Array())), /empty/i);
});

test('rejects a file over the size limit', () => {
  assert.match(String(validateUpload(MAX_UPLOAD_BYTES + 1, 'image/jpeg', jpeg)), /8 MB/);
});

test('rejects a declared type that does not match the bytes', () => {
  assert.match(String(validateUpload(jpeg.byteLength, 'image/png', jpeg)), /do not match/i);
});

test('rejects an unsupported file type', () => {
  assert.match(String(validateUpload(4, 'image/gif', new Uint8Array([1, 2, 3, 4]))), /JPG, PNG, or WebP/);
});
