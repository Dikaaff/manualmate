import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { runAnalysis } from '../app/lib/analysis';
import { ProviderError } from '../app/lib/meta';

const raw = {
  object: { label: 'Wooden chair', category: 'chair' },
  safety: { blocked: false, category: 'safe', reason: '', professional: '' },
  observation: 'The rear-left leg joint appears loose.', confidence: 88,
  regions: [{ label: 'Left leg joint', box_2d: [520, 300, 760, 520], severity: 'medium' }],
  repair: { difficulty: 'Easy', estimatedTime: '10-15 min', tools: ['Matching wrench'], parts: ['Fastener'],
    steps: [
      { title: 'Turn the chair over', detail: 'Use a flat surface.', safety: 'Stop if it is unstable.' },
      { title: 'Tighten the fastener', detail: 'Use light pressure.', safety: 'Stop if the wood cracks.' },
    ], note: 'Visible areas only.' },
};

type Captured = { url: string; authorization: string | undefined; body: { model: string; messages: Array<{ role: string; content: unknown }> } };

function startMock(handler: (index: number, response: import('node:http').ServerResponse) => void) {
  let captured: Captured | null = null; let requests = 0;
  const server: Server = createServer((request, response) => { let body = ''; request.on('data', (chunk) => { body += chunk; }); request.on('end', () => { requests += 1; captured = { url: request.url ?? '', authorization: request.headers.authorization, body: JSON.parse(body) as Captured['body'] }; handler(requests, response); }); });
  return { server, get captured() { return captured; }, get requests() { return requests; } };
}
async function listen(server: Server): Promise<string> { await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve)); const address = server.address() as AddressInfo; return `http://127.0.0.1:${address.port}/v1`; }
function successPayload() { return { choices: [{ message: { role: 'assistant', content: JSON.stringify(raw) }, finish_reason: 'stop' }] }; }
function setMetaEnv(baseUrl: string, model = 'test-model', fallbacks = '') { process.env.MODEL_API_KEY = 'test-key'; process.env.MODEL_NAME = model; process.env.MODEL_FALLBACK_MODELS = fallbacks; process.env.MODEL_BASE_URL = baseUrl; }

test('runs the full pipeline against the Meta chat completions endpoint', async () => {
  const mock = startMock((_index, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(successPayload())); }); const baseUrl = await listen(mock.server); setMetaEnv(baseUrl);
  try { const image = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01, 0x02]); const result = await runAnalysis({ image, mimeType: 'image/jpeg', hint: 'wobbly chair' }); assert.equal(result.provider, 'meta'); assert.equal(result.model, 'test-model'); assert.equal(result.steps.length, 2); assert.equal(result.grounding.status, 'verified'); assert.equal(mock.captured?.url, '/v1/chat/completions'); assert.equal(mock.captured?.authorization, 'Bearer test-key'); assert.equal(mock.captured?.body.model, 'test-model'); assert.equal(mock.captured?.body.messages[0].role, 'system'); assert.equal(mock.captured?.body.messages[1].role, 'user'); const content = mock.captured?.body.messages[1].content as Array<{ type: string; text?: string; image_url?: { url: string } }>; assert.equal(content[0].text?.includes('wobbly chair'), true); assert.equal(content[1].image_url?.url, `data:image/jpeg;base64,${Buffer.from(image).toString('base64')}`); }
  finally { await new Promise<void>((resolve) => mock.server.close(() => resolve())); }
});

test('retries once when the model returns malformed JSON', async () => { const mock = startMock((index, response) => { response.writeHead(200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(index === 1 ? { choices: [{ message: { content: 'not json' } }] } : successPayload())); }); const baseUrl = await listen(mock.server); setMetaEnv(baseUrl); try { const result = await runAnalysis({ image: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg', hint: 'chair' }); assert.equal(result.provider, 'meta'); assert.equal(mock.requests, 2); } finally { await new Promise<void>((resolve) => mock.server.close(() => resolve())); } });
test('maps an invalid API key to an auth error without retrying', async () => { const mock = startMock((_index, response) => { response.writeHead(401, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: 'Unauthorized' } })); }); const baseUrl = await listen(mock.server); setMetaEnv(baseUrl); try { await assert.rejects(runAnalysis({ image: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg', hint: 'chair' }), (error: unknown) => { assert.ok(error instanceof ProviderError); assert.equal(error.code, 'auth'); return true; }); assert.equal(mock.requests, 1); } finally { await new Promise<void>((resolve) => mock.server.close(() => resolve())); } });
test('falls back to the next model when the primary is unavailable', async () => { const mock = startMock((index, response) => { response.writeHead(index === 1 ? 503 : 200, { 'Content-Type': 'application/json' }); response.end(JSON.stringify(index === 1 ? { error: { message: 'High demand' } } : successPayload())); }); const baseUrl = await listen(mock.server); setMetaEnv(baseUrl, 'primary-model', 'fallback-model'); try { const result = await runAnalysis({ image: new Uint8Array([1, 2, 3]), mimeType: 'image/jpeg', hint: 'chair' }); assert.equal(result.provider, 'meta'); assert.equal(result.model, 'fallback-model'); assert.equal(mock.requests, 2); } finally { await new Promise<void>((resolve) => mock.server.close(() => resolve())); } });
