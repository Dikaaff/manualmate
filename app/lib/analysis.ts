import { randomUUID } from 'node:crypto';
import type { AnalysisResult } from '../types';
import { analyzeWithModel } from './vision';
import { validateGrounding } from './grounding';
import type { RawAnalysis } from './model-schema';
import { blockedCategoryLabel, evaluateSafety, preflightHint, type SafetyGateDecision } from './safety';

export type AnalyzeInput = {
  image: Uint8Array;
  mimeType: string;
  hint: string;
};

function preflightResult(decision: SafetyGateDecision): AnalysisResult {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    objectLabel: blockedCategoryLabel(decision.category),
    objectCategory: decision.category,
    observation: decision.reason,
    confidence: 100,
    difficulty: 'Professional required',
    estimatedTime: 'Not provided',
    tools: [],
    parts: [],
    steps: [],
    note: 'No repair steps are shown for this category. Contact the named professional.',
    blocked: true,
    safety: {
      category: decision.category,
      reason: decision.reason,
      professional: decision.professional,
      source: decision.source,
      nextStep: decision.nextStep,
    },
    regions: [],
    grounding: {
      status: 'ungrounded',
      note: 'No photo marker is produced when a category is blocked before analysis.',
    },
    provider: 'safety-pregate',
    model: 'none',
    latencyMs: 0,
  };
}

export function finalizeAnalysis(
  raw: RawAnalysis,
  provider: AnalysisResult['provider'],
  model: string,
  latencyMs: number,
  hint: string,
): AnalysisResult {
  const decision = evaluateSafety({
    hint,
    objectCategory: raw.object.category,
    observation: raw.observation,
    confidence: raw.confidence,
    steps: raw.repair.steps,
    model: raw.safety,
  });
  const grounding = validateGrounding(raw.regions);
  const blocked = decision.blocked;

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    objectLabel: raw.object.label,
    objectCategory: raw.object.category,
    observation: raw.observation,
    confidence: raw.confidence,
    difficulty: blocked ? 'Professional required' : raw.repair.difficulty,
    estimatedTime: blocked ? 'Not provided' : raw.repair.estimatedTime,
    tools: blocked ? [] : raw.repair.tools,
    parts: blocked ? [] : raw.repair.parts,
    steps: blocked ? [] : raw.repair.steps,
    note: blocked
      ? 'No repair steps are shown for this category. Contact the named professional.'
      : raw.repair.note,
    blocked,
    safety: {
      category: decision.category,
      reason: decision.reason,
      professional: decision.professional,
      source: decision.source,
      nextStep: decision.nextStep,
    },
    regions: grounding.regions,
    grounding: {
      status: grounding.status,
      note: grounding.note,
    },
    provider,
    model,
    latencyMs,
  };
}

export async function runAnalysis(input: AnalyzeInput): Promise<AnalysisResult> {
  const preflight = preflightHint(input.hint);
  if (preflight) return preflightResult(preflight);

  const { raw, model, latencyMs } = await analyzeWithModel({
    image: input.image,
    mimeType: input.mimeType,
    hint: input.hint,
  });

  return finalizeAnalysis(raw, 'model', model, latencyMs, input.hint);
}
