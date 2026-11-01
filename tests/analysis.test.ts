import assert from 'node:assert/strict';
import test from 'node:test';
import { finalizeAnalysis, runAnalysis } from '../app/lib/analysis';
import { ProviderError } from '../app/lib/vision';
import type { RawAnalysis } from '../app/lib/model-schema';

const safeRaw: RawAnalysis = {
  object: { label: 'Wooden chair', category: 'chair' },
  safety: { blocked: false, category: 'safe', reason: '', professional: '' },
  observation: 'The rear-left leg joint appears loose.',
  confidence: 86,
  regions: [{ label: 'Left leg joint', box_2d: [520, 300, 760, 520], severity: 'medium' }],
  repair: {
    difficulty: 'Easy',
    estimatedTime: '10-15 min',
    tools: ['Matching wrench'],
    parts: ['Fastener'],
    steps: [
      { title: 'Turn the chair over', detail: 'Use a flat surface.', safety: 'Stop if it is unstable.' },
      { title: 'Tighten the fastener', detail: 'Use light pressure.', safety: 'Stop if the wood cracks.' },
    ],
    note: 'Visible areas only.',
  },
};

test('safe model output keeps steps and a verified marker', () => {
  const result = finalizeAnalysis(safeRaw, 'model', 'test-model', 1234, 'chair');
  assert.equal(result.blocked, false);
  assert.equal(result.steps.length, 2);
  assert.equal(result.tools.length, 1);
  assert.equal(result.grounding.status, 'verified');
  assert.equal(result.provider, 'model');
  assert.equal(result.model, 'test-model');
});

test('blocked model output is stripped server-side even if the model wrote steps', () => {
  const blockedRaw: RawAnalysis = {
    ...safeRaw,
    safety: {
      blocked: true,
      category: 'electrical',
      reason: 'The panel has exposed wiring.',
      professional: 'a licensed electrician',
    },
  };
  const result = finalizeAnalysis(blockedRaw, 'model', 'test-model', 900, 'chair');
  assert.equal(result.blocked, true);
  assert.equal(result.steps.length, 0);
  assert.equal(result.tools.length, 0);
  assert.equal(result.parts.length, 0);
  assert.equal(result.difficulty, 'Professional required');
  assert.equal(result.safety.category, 'electrical');
});

test('refuses to run without a configured model key', async () => {
  const modelKey = process.env.MODEL_API_KEY;
  delete process.env.MODEL_API_KEY;

  try {
    await assert.rejects(
      runAnalysis({
        image: new Uint8Array([1, 2, 3]),
        mimeType: 'image/jpeg',
        hint: 'chair',
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProviderError);
        assert.equal(error.code, 'missing_key');
        assert.equal(error.status, 503);
        return true;
      },
    );
  } finally {
    if (modelKey !== undefined) process.env.MODEL_API_KEY = modelKey;
  }
});

test('preflight block skips the model entirely', async () => {
  const result = await runAnalysis({
    image: new Uint8Array([1, 2, 3]),
    mimeType: 'image/jpeg',
    hint: 'Electrical panel',
  });
  assert.equal(result.provider, 'safety-pregate');
  assert.equal(result.model, 'none');
  assert.equal(result.blocked, true);
  assert.equal(result.steps.length, 0);
  assert.equal(result.latencyMs, 0);
});
