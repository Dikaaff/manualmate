import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateSafety, preflightHint } from '../app/lib/safety';

const base = {
  hint: 'Wobbly wooden chair',
  objectCategory: 'chair',
  observation: 'The left leg joint looks loose.',
  confidence: 82,
  steps: [
    { title: 'Turn the chair over', detail: 'Place it on a flat floor.', safety: 'Stop if it feels unstable.' },
  ],
  model: {
    blocked: false,
    category: 'safe' as const,
    reason: '',
    professional: '',
  },
};

test('preflight blocks an electrical hint before the model runs', () => {
  const decision = preflightHint('Electrical panel in the hallway');
  assert.ok(decision);
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'electrical');
  assert.equal(decision.source, 'preflight');
  assert.equal(decision.nextStep, 'professional');
});

test('preflight allows a normal furniture hint', () => {
  assert.equal(preflightHint('loose table leg'), null);
});

test('model safety classification blocks even when steps look harmless', () => {
  const decision = evaluateSafety({
    ...base,
    model: {
      blocked: true,
      category: 'electrical',
      reason: 'The panel has exposed wiring.',
      professional: 'a licensed electrician',
    },
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'electrical');
  assert.equal(decision.source, 'model');
});

test('hazard object category blocks a model that claims safety', () => {
  const decision = evaluateSafety({ ...base, objectCategory: 'gas' });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'gas');
});

test('keyword backstop catches a hazard in the observation', () => {
  const decision = evaluateSafety({
    ...base,
    observation: 'The outlet and exposed wires are behind the shelf.',
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'electrical');
  assert.equal(decision.source, 'keyword');
});

test('dangerous action in a checklist blocks the result', () => {
  const decision = evaluateSafety({
    ...base,
    steps: [
      {
        title: 'Open the breaker panel',
        detail: 'Remove the cover and inspect the wire.',
        safety: 'None',
      },
    ],
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'structural');
  assert.equal(decision.source, 'keyword');
});

test('low confidence fails closed as unclear', () => {
  const decision = evaluateSafety({ ...base, confidence: 12 });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'unclear');
  assert.equal(decision.source, 'confidence');
  assert.equal(decision.nextStep, 'retake');
});

test('unclear object fails closed even with high confidence', () => {
  const decision = evaluateSafety({ ...base, objectCategory: 'unclear', confidence: 91 });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'unclear');
});

test('safe furniture passes the gate', () => {
  const decision = evaluateSafety(base);
  assert.equal(decision.blocked, false);
  assert.equal(decision.category, 'safe');
  assert.equal(decision.source, 'none');
  assert.equal(decision.nextStep, 'none');
});

test('preflight allows common repair tools', () => {
  assert.equal(preflightHint('staple gun for upholstery'), null);
});

test('common repair tools are not treated as weapons', () => {
  const decision = evaluateSafety({
    ...base,
    observation: 'A staple gun and a glue gun rest on the armrest.',
  });
  assert.equal(decision.blocked, false);
  assert.equal(decision.category, 'safe');
});

test('a firearm in the observation still blocks', () => {
  const decision = evaluateSafety({
    ...base,
    observation: 'A handgun is lying on the shelf.',
  });
  assert.equal(decision.blocked, true);
  assert.equal(decision.category, 'weapon');
  assert.equal(decision.source, 'keyword');
});
