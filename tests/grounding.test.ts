import assert from 'node:assert/strict';
import test from 'node:test';
import { validateGrounding } from '../app/lib/grounding';

test('accepts a valid normalized box', () => {
  const result = validateGrounding([{ label: 'Loose joint', box_2d: [100, 200, 300, 400], severity: 'high' }]);
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.regions[0].box_2d, [100, 200, 300, 400]);
  assert.equal(result.regions[0].severity, 'high');
});

test('clamps coordinates into the 0-1000 range', () => {
  const result = validateGrounding([{ label: 'Edge', box_2d: [-40, 500, 1200, 2000], severity: 'low' }]);
  assert.equal(result.status, 'verified');
  assert.deepEqual(result.regions[0].box_2d, [0, 500, 1000, 1000]);
});

test('rejects a full-frame marker', () => {
  const result = validateGrounding([{ label: 'Everything', box_2d: [0, 0, 1000, 1000], severity: 'low' }]);
  assert.equal(result.status, 'ungrounded');
  assert.equal(result.regions.length, 0);
});

test('rejects markers that are too small to be useful', () => {
  const result = validateGrounding([{ label: 'Dot', box_2d: [500, 500, 505, 505], severity: 'low' }]);
  assert.equal(result.status, 'ungrounded');
});

test('reports partial when one marker is discarded', () => {
  const result = validateGrounding([
    { label: 'Good', box_2d: [100, 100, 400, 400], severity: 'medium' },
    { label: 'Bad', box_2d: [0, 0, 1000, 1000], severity: 'low' },
  ]);
  assert.equal(result.status, 'partial');
  assert.equal(result.regions.length, 1);
  assert.match(result.note, /discarded/);
});

test('reports partial for a very broad marker', () => {
  const result = validateGrounding([{ label: 'Broad', box_2d: [100, 100, 900, 900], severity: 'low' }]);
  assert.equal(result.status, 'partial');
  assert.equal(result.regions.length, 1);
});

test('deduplicates identical boxes and falls back to a default label', () => {
  const result = validateGrounding([
    { label: '', box_2d: [100, 100, 400, 400], severity: 'low' },
    { label: 'duplicate', box_2d: [100, 100, 400, 400], severity: 'high' },
  ]);
  assert.equal(result.regions.length, 1);
  assert.equal(result.regions[0].label, 'Inspection area');
});

test('invalid data never becomes a marker', () => {
  const result = validateGrounding([
    { label: 'NaN', box_2d: [100, Number.NaN, 400, 500], severity: 'low' },
    { label: 'Short', box_2d: [100, 100, 200], severity: 'low' },
  ]);
  assert.equal(result.status, 'ungrounded');
  assert.equal(result.regions.length, 0);
});
