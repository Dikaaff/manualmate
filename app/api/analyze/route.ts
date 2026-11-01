import { NextResponse } from 'next/server';
import { runAnalysis } from '../../lib/analysis';
import { ProviderError } from '../../lib/vision';
import { detectImageMime, validateUpload } from '../../lib/upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const buckets = new Map<string, number[]>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'local';
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    buckets.set(key, recent);
    return true;
  }
  recent.push(now);
  buckets.set(key, recent);
  if (buckets.size > 500) {
    for (const [entryKey, times] of buckets) {
      if (times.every((time) => now - time >= WINDOW_MS)) buckets.delete(entryKey);
    }
  }
  return false;
}

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: Request) {
  if (isRateLimited(clientKey(request))) {
    return json({ error: 'Too many analyses. Wait a minute and try again.', code: 'rate_limited' }, 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Send the photo as multipart form data.', code: 'bad_request' }, 400);
  }

  const file = form.get('image');
  if (!(file instanceof File)) {
    return json({ error: 'A photo is required.', code: 'bad_request' }, 400);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const uploadError = validateUpload(bytes.byteLength, file.type, bytes);
  if (uploadError) {
    return json({ error: uploadError, code: 'invalid_image' }, 415);
  }

  const hint = String(form.get('hint') ?? '').trim().slice(0, 300);
  const detectedMime = detectImageMime(bytes) ?? 'image/jpeg';

  try {
    const result = await runAnalysis({
      image: bytes,
      mimeType: detectedMime,
      hint,
    });

    return json({
      result,
      meta: {
        provider: result.provider,
        model: result.model,
        latencyMs: result.latencyMs,
        grounding: result.grounding.status,
        safety: result.safety.category,
        modelCalled: result.provider === 'model',
      },
    });
  } catch (error) {
    if (error instanceof ProviderError) {
      console.error(`[analyze] provider error: ${error.code}`);
      return json({ error: error.message, code: error.code }, error.status);
    }

    console.error('[analyze] unexpected error');
    return json({ error: 'The analysis failed. Try another photo.', code: 'internal' }, 500);
  }
}
