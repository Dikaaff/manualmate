import type { Box2D, GroundingRegion, GroundingStatus, Severity } from '../types';

export type RawRegionInput = {
  label?: unknown;
  box_2d?: unknown;
  severity?: unknown;
};

export type GroundingValidation = {
  regions: GroundingRegion[];
  status: GroundingStatus;
  note: string;
};

const MIN_SPAN = 10;
const BROAD_AREA_RATIO = 0.55;
const FULL_IMAGE_AREA_RATIO = 0.92;

function clamp(value: number): number {
  return Math.min(1000, Math.max(0, Math.round(value)));
}

function toSeverity(value: unknown): Severity {
  return value === 'high' || value === 'medium' ? value : 'low';
}

export function validateGrounding(raw: RawRegionInput[]): GroundingValidation {
  const regions: GroundingRegion[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  let broad = 0;

  for (const item of raw.slice(0, 4)) {
    const coords = Array.isArray(item.box_2d) ? item.box_2d : null;
    if (!coords || coords.length !== 4) {
      dropped += 1;
      continue;
    }

    const numbers = coords.map((value) => Number(value));
    if (numbers.some((value) => !Number.isFinite(value))) {
      dropped += 1;
      continue;
    }

    const ymin = clamp(numbers[0]);
    const xmin = clamp(numbers[1]);
    const ymax = clamp(numbers[2]);
    const xmax = clamp(numbers[3]);

    if (ymax - ymin < MIN_SPAN || xmax - xmin < MIN_SPAN) {
      dropped += 1;
      continue;
    }

    const areaRatio = ((ymax - ymin) * (xmax - xmin)) / 1_000_000;
    if (areaRatio > FULL_IMAGE_AREA_RATIO) {
      dropped += 1;
      continue;
    }

    const box: Box2D = [ymin, xmin, ymax, xmax];
    const key = box.join(':');
    if (seen.has(key)) continue;
    seen.add(key);

    if (areaRatio > BROAD_AREA_RATIO) broad += 1;

    const label = String(item.label ?? '').trim().slice(0, 90) || 'Inspection area';
    regions.push({ label, box_2d: box, severity: toSeverity(item.severity) });
  }

  if (regions.length === 0) {
    return {
      regions,
      status: 'ungrounded',
      note: dropped
        ? 'The model returned markers that could not be validated. Treat the observation as unverified.'
        : 'The model did not return a usable marker. Treat the observation as unverified.',
    };
  }

  if (dropped > 0 || broad > 0) {
    const reasons: string[] = [];
    if (dropped > 0) reasons.push(`${dropped} marker${dropped === 1 ? ' was' : 's were'} discarded as invalid or too broad`);
    if (broad > 0) reasons.push('the highlighted area is larger than a precise inspection point');
    return {
      regions,
      status: 'partial',
      note: `${reasons.join('; ')}. Confirm the marked area visually before acting.`,
    };
  }

  return {
    regions,
    status: 'verified',
    note: `Marker coordinates are valid and inside the photo (${regions.length} region${regions.length === 1 ? '' : 's'}). Model boxes are approximate, so confirm the area visually.`,
  };
}
