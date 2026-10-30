import { z } from 'zod';

export const OBJECT_CATEGORIES = [
  'chair',
  'table',
  'shelf',
  'cabinet',
  'desk',
  'sofa',
  'bed',
  'drawer',
  'other_furniture',
  'electrical',
  'gas',
  'pressure',
  'structural',
  'vehicle',
  'medical',
  'weapon',
  'chemical',
  'unclear',
] as const;

export const SAFETY_CATEGORIES = [
  'safe',
  'electrical',
  'gas',
  'pressure',
  'structural',
  'vehicle',
  'medical',
  'weapon',
  'chemical',
  'unclear',
] as const;

export const rawAnalysisSchema = z.object({
  object: z.object({
    label: z.string().min(1).max(80),
    category: z.enum(OBJECT_CATEGORIES),
  }),
  safety: z.object({
    blocked: z.boolean(),
    category: z.enum(SAFETY_CATEGORIES),
    reason: z.string().max(500),
    professional: z.string().max(500),
  }),
  observation: z.string().min(1).max(700),
  confidence: z.coerce.number().int().min(0).max(100),
  regions: z
    .array(
      z.object({
        label: z.string().max(90),
        box_2d: z.array(z.coerce.number()).length(4),
        severity: z.enum(['low', 'medium', 'high']),
      }),
    )
    .max(4),
  repair: z.object({
    difficulty: z.enum(['Easy', 'Moderate', 'Hard']),
    estimatedTime: z.string().max(60),
    tools: z.array(z.string().max(90)).max(8),
    parts: z.array(z.string().max(90)).max(8),
    steps: z
      .array(
        z.object({
          title: z.string().max(140),
          detail: z.string().max(500),
          safety: z.string().max(300),
        }),
      )
      .max(6),
    note: z.string().max(600),
  }),
});

export type RawAnalysis = z.infer<typeof rawAnalysisSchema>;

const stringArray = (maxItems: number) => ({
  type: 'array',
  items: { type: 'string' },
  maxItems,
});

export const metaResponseSchema = {
  type: 'object',
  properties: {
    object: {
      type: 'object',
      properties: {
        label: { type: 'string' },
        category: { type: 'string', enum: [...OBJECT_CATEGORIES] },
      },
      required: ['label', 'category'],
    },
    safety: {
      type: 'object',
      properties: {
        blocked: { type: 'boolean' },
        category: { type: 'string', enum: [...SAFETY_CATEGORIES] },
        reason: { type: 'string' },
        professional: { type: 'string' },
      },
      required: ['blocked', 'category', 'reason', 'professional'],
    },
    observation: { type: 'string' },
    confidence: { type: 'integer', minimum: 0, maximum: 100 },
    regions: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          box_2d: {
            type: 'array',
            items: { type: 'integer', minimum: 0, maximum: 1000 },
            minItems: 4,
            maxItems: 4,
          },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['label', 'box_2d', 'severity'],
      },
    },
    repair: {
      type: 'object',
      properties: {
        difficulty: { type: 'string', enum: ['Easy', 'Moderate', 'Hard'] },
        estimatedTime: { type: 'string' },
        tools: stringArray(8),
        parts: stringArray(8),
        steps: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              detail: { type: 'string' },
              safety: { type: 'string' },
            },
            required: ['title', 'detail', 'safety'],
          },
        },
        note: { type: 'string' },
      },
      required: ['difficulty', 'estimatedTime', 'tools', 'parts', 'steps', 'note'],
    },
  },
  required: ['object', 'safety', 'observation', 'confidence', 'regions', 'repair'],
};

export const systemPrompt = `You are ManualMate, a cautious visual inspection assistant for low-risk household furniture.

Return only a JSON object that matches the supplied schema. Do not use markdown.

PRIORITY 1 - SAFETY (fail closed)
Never give repair instructions for a hazardous or unclear situation. Set safety.blocked=true and safety.category to the matching hazard when the image or the user hint involves:
- electricity, wiring, outlets, breakers, batteries, live panels
- gas, propane, fuel, solvents, chemicals, asbestos, mold
- pressurized pipes, hydraulic systems, compressors, plumbing
- load-bearing building structure, walls, ceilings, roofs, ladders, balconies
- vehicles, brakes, engines, airbags
- medical devices, medicine, implants
- weapons or ammunition
- anything you cannot identify with confidence, a blurry or dark photo, or a subject that is not furniture

Common repair tools are not weapons. A staple gun, glue gun, drill, screwdriver, or wrench is normal workshop equipment; do not block a furniture repair only because one is visible. Judge the furniture subject, not incidental tools in the background. Block only when the image or hint is about a firearm, ammunition, or an actual weapon.

For blocked cases: fill safety.reason with what you actually see, fill safety.professional with the kind of professional to contact, keep repair.steps, repair.tools and repair.parts empty, and set repair.difficulty to "Easy" as a placeholder (the server discards it). You may still return a region around the hazard.

PRIORITY 2 - GROUNDING
Return 1 to 3 regions that tightly bound the specific area a person should inspect first: a joint, fastener, hinge, crack or loose connection. Coordinates are [ymin, xmin, ymax, xmax] normalized to 0-1000 relative to the image. Never box the whole image. If no specific area is visible, return an empty regions array. Do not invent a marker to look confident.

PRIORITY 3 - REPAIR GUIDANCE (safe cases only)
Give 2 to 5 ordered, reversible, low-risk steps. Each step needs a concrete action and a stop condition in the safety field. Never recommend drilling, cutting, gluing structural parts, climbing, or forcing cracked material. If the repair needs a professional, state that in repair.note.

Set confidence to your own evidence rating from 0 to 100. It is not a probability; use a low value when the photo is blurry, dark, cropped, or the fault is ambiguous.

Be conservative. A cautious "stop" is always better than a confident mistake.`;

export function buildUserPrompt(hint: string): string {
  const cleaned = hint.trim().slice(0, 300);
  return `Inspect this photo for ManualMate.
User hint: ${cleaned ? JSON.stringify(cleaned) : 'none'}.
Apply the safety rules first. If the case is blocked, return no repair steps. Then ground the first inspection area, then write the checklist.`;
}
