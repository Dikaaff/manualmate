export const APP_VERSION = '1.0.0';
export const DEFAULT_MODEL = 'muse-spark-1.3';
export const DEFAULT_FALLBACK_MODELS: string[] = [];
export const DEFAULT_META_BASE_URL = 'https://api.meta.ai/v1';

export type AnalysisMode = 'meta' | 'unconfigured';

export function hasModelKey(): boolean {
  return Boolean(process.env.MODEL_API_KEY?.trim());
}

export function configuredModel(): string {
  return process.env.MODEL_NAME?.trim() || DEFAULT_MODEL;
}

export function fallbackModels(): string[] {
  const raw = process.env.MODEL_FALLBACK_MODELS;
  const candidates =
    raw === undefined
      ? DEFAULT_FALLBACK_MODELS
      : raw.split(',').map((model) => model.trim()).filter(Boolean);
  const primary = configuredModel();
  return [...new Set(candidates)].filter((model) => model !== primary);
}

export function metaBaseUrl(): string {
  const override = process.env.MODEL_BASE_URL?.trim();
  return override ? override.replace(/\/+$/, '') : DEFAULT_META_BASE_URL;
}

export function resolveMode(): AnalysisMode {
  return hasModelKey() ? 'meta' : 'unconfigured';
}
