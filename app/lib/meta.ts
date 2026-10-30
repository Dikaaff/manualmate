import { configuredModel, fallbackModels, metaBaseUrl } from './config';
import { buildUserPrompt, rawAnalysisSchema, systemPrompt, type RawAnalysis } from './model-schema';

export type ProviderErrorCode =
  | 'missing_key'
  | 'timeout'
  | 'rate_limited'
  | 'auth'
  | 'bad_request'
  | 'model_refusal'
  | 'invalid_output'
  | 'upstream'
  | 'network';

export class ProviderError extends Error {
  readonly code: ProviderErrorCode;
  readonly status: number;
  readonly retryable: boolean;

  constructor(code: ProviderErrorCode, message: string, status = 502, retryable = false) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export type MetaInput = {
  image: Uint8Array;
  mimeType: string;
  hint: string;
};

export type MetaOutput = {
  raw: RawAnalysis;
  model: string;
  latencyMs: number;
};

type MetaTextPart = { type: 'text'; text: string };
type MetaImagePart = { type: 'image_url'; image_url: { url: string } };
type MetaContentPart = MetaTextPart | MetaImagePart;

type MetaPayload = {
  choices?: Array<{
    message?: { content?: string | MetaContentPart[] | null; refusal?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string; code?: string; type?: string };
};

const ATTEMPT_TIMEOUT_MS = 40_000;
const TOTAL_BUDGET_MS = 55_000;
const MAX_ATTEMPTS = 2;

const JSON_CONTRACT = `Respond with a single JSON object and nothing else. Required keys:
{"object":{"label":string,"category":string},"safety":{"blocked":boolean,"category":string,"reason":string,"professional":string},"observation":string,"confidence":number,"regions":[{"label":string,"box_2d":[number,number,number,number],"severity":"low"|"medium"|"high"}],"repair":{"difficulty":"Easy"|"Moderate"|"Hard","estimatedTime":string,"tools":string[],"parts":string[],"steps":[{"title":string,"detail":string,"safety":string}],"note":string}}`;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeJson(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
  return (fenced ? fenced[1] : text).trim();
}

function partText(part: MetaContentPart): string {
  if (part.type === 'text') return part.text;
  return '';
}

function extractText(payload: MetaPayload): string {
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part): part is MetaTextPart => part.type === 'text')
      .map(partText)
      .join('')
      .trim();
  }
  return '';
}

function mapHttpError(status: number, payload: MetaPayload | null): ProviderError {
  if (status === 429) {
    return new ProviderError(
      'rate_limited',
      'The model is receiving too many requests. Wait a moment and retry.',
      429,
      true,
    );
  }
  if (status === 401 || status === 403) {
    return new ProviderError('auth', 'The model credentials were rejected.', 502, false);
  }
  if (status === 400) {
    const message = (payload?.error?.message ?? '').toLowerCase();
    if (
      message.includes('api key') ||
      message.includes('credential') ||
      message.includes('permission') ||
      message.includes('unauthorized')
    ) {
      return new ProviderError('auth', 'The model credentials were rejected.', 502, false);
    }
    return new ProviderError('bad_request', 'The model rejected the request format.', 502, false);
  }
  const detail = payload?.error?.type || payload?.error?.code;
  return new ProviderError(
    'upstream',
    `The model provider returned an error${detail ? ` (${detail})` : ''}.`,
    502,
    status >= 500,
  );
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error;
  return new ProviderError('upstream', 'The analysis failed unexpectedly.', 502, false);
}

async function attemptOnce(
  apiKey: string,
  model: string,
  input: MetaInput,
  timeoutMs: number,
): Promise<{ raw: RawAnalysis }> {
  const url = `${metaBaseUrl()}/chat/completions`;
  const body = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: `${buildUserPrompt(input.hint)}\n\n${JSON_CONTRACT}` },
          {
            type: 'image_url',
            image_url: { url: `data:${input.mimeType};base64,${Buffer.from(input.image).toString('base64')}` },
          },
        ],
      },
    ],
    temperature: 0.2,
    max_tokens: 2048,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  let bodyText: string;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });
    bodyText = await response.text();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ProviderError('timeout', 'The model took too long to answer.', 504, false);
    }
    throw new ProviderError('network', 'Could not reach the model provider.', 502, true);
  } finally {
    clearTimeout(timer);
  }

  let payload: MetaPayload | null = null;
  try {
    payload = bodyText ? (JSON.parse(bodyText) as MetaPayload) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw mapHttpError(response.status, payload);
  }

  const choice = payload?.choices?.[0];
  if (choice?.message?.refusal) {
    throw new ProviderError('model_refusal', 'The provider declined to analyze this image.', 422, false);
  }
  if (choice?.finish_reason === 'content_filter') {
    throw new ProviderError('model_refusal', 'The provider declined to analyze this image.', 422, false);
  }

  const text = extractText(payload ?? {});
  if (!text) {
    throw new ProviderError('invalid_output', 'The model returned an empty answer.', 502, true);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizeJson(text));
  } catch {
    throw new ProviderError('invalid_output', 'The model returned malformed JSON.', 502, true);
  }

  const validated = rawAnalysisSchema.safeParse(parsed);
  if (!validated.success) {
    throw new ProviderError('invalid_output', 'The model returned an analysis that failed validation.', 502, true);
  }

  return { raw: validated.data };
}

export async function analyzeWithMeta(input: MetaInput): Promise<MetaOutput> {
  const apiKey = process.env.MODEL_API_KEY?.trim();
  if (!apiKey) {
    throw new ProviderError('missing_key', 'Model credentials are not configured.', 503, false);
  }

  const models = [configuredModel(), ...fallbackModels()];
  const startedAt = Date.now();
  const deadline = startedAt + TOTAL_BUDGET_MS;
  let lastError: ProviderError | null = null;

  for (const model of models) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const remaining = deadline - Date.now();
      if (remaining < 5_000) break;

      try {
        const { raw } = await attemptOnce(apiKey, model, input, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
        return { raw, model, latencyMs: Date.now() - startedAt };
      } catch (error) {
        const providerError = toProviderError(error);
        lastError = providerError;

        if (
          providerError.code === 'auth' ||
          providerError.code === 'bad_request' ||
          providerError.code === 'missing_key' ||
          providerError.code === 'model_refusal'
        ) {
          throw providerError;
        }

        const moveToNextModel =
          providerError.code === 'upstream' ||
          providerError.code === 'rate_limited' ||
          providerError.code === 'timeout' ||
          providerError.code === 'network';
        if (moveToNextModel) break;
        if (!providerError.retryable || attempt === MAX_ATTEMPTS - 1) break;
        await sleep(500);
      }
    }
  }

  throw lastError ?? new ProviderError('upstream', 'The analysis failed.', 502, false);
}
