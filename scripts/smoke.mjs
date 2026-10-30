#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';

const [, , baseArg, imageArg, hintArg] = process.argv;
const base = (baseArg || process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const imagePath = imageArg || process.env.IMAGE_PATH;

if (!imagePath) {
  console.error('Usage: node scripts/smoke.mjs <base-url> <image-path> [hint]');
  process.exit(1);
}

const extension = extname(imagePath).toLowerCase();
const mimeType =
  extension === '.png' ? 'image/png' : extension === '.webp' ? 'image/webp' : 'image/jpeg';

const bytes = await readFile(imagePath);
const form = new FormData();
form.append('image', new Blob([bytes], { type: mimeType }), basename(imagePath));
form.append('hint', hintArg || '');

const startedAt = Date.now();
const response = await fetch(`${base}/api/analyze`, { method: 'POST', body: form });
const payload = await response.json().catch(() => null);

console.log(
  JSON.stringify(
    {
      status: response.status,
      elapsedMs: Date.now() - startedAt,
      provider: payload?.meta?.provider,
      model: payload?.meta?.model,
      object: payload?.result?.objectLabel,
      objectCategory: payload?.result?.objectCategory,
      observation: payload?.result?.observation,
      confidence: payload?.result?.confidence,
      blocked: payload?.result?.blocked,
      safety: payload?.result?.safety?.category,
      safetySource: payload?.result?.safety?.source,
      safetyReason: payload?.result?.safety?.reason,
      nextStep: payload?.result?.safety?.nextStep,
      grounding: payload?.result?.grounding?.status,
      regions: payload?.result?.regions?.map((region) => ({
        label: region.label,
        box: region.box_2d,
      })),
      difficulty: payload?.result?.difficulty,
      steps: payload?.result?.steps?.map((step) => step.title),
      code: payload?.code,
      error: payload?.error,
    },
    null,
    2,
  ),
);

if (!response.ok || !payload?.result) process.exitCode = 1;
