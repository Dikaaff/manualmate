export const APP_VERSION = '1.0.0';
export const DEFAULT_MODEL = 'gemini-3.6-flash';
export const DEFAULT_FALLBACK_MODELS: string[] = ['gemini-3.7-flash', 'gemini-3.5-flash'];
export const DEFAULT_MODEL_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export type AnalysisMode = 'model' | 'unconfigured';

export function modelApiKey(): string | undefined {
  return process.env.MODEL_API_KEY?.trim() || undefined;
}

export function hasModelKey(): boolean {
  return Boolean(modelApiKey());
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

export function modelBaseUrl(): string {
  const override = process.env.MODEL_BASE_URL?.trim();
  return override ? override.replace(/\/+$/, '') : DEFAULT_MODEL_BASE_URL;
}

export function resolveMode(): AnalysisMode {
  return hasModelKey() ? 'model' : 'unconfigured';
}
