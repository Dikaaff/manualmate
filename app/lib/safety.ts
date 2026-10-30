import type { HazardCategory, SafetyCategory, SafetyNextStep, SafetySource, RepairStep } from '../types';

type HazardRule = {
  category: HazardCategory;
  pattern: RegExp;
  reason: string;
  professional: string;
};

const HAZARD_RULES: HazardRule[] = [
  {
    category: 'electrical',
    pattern:
      /\b(electric(?:al|ity)?|wiring|wires?|outlets?|sockets?|breakers?|fuse(?:s|box)?|voltage|live\s+wire|batter(?:y|ies)|capacitors?|power\s+supply|mains)\b/i,
    reason: 'Electrical parts, wiring, or live power are involved.',
    professional: 'a licensed electrician',
  },
  {
    category: 'gas',
    pattern: /\b(gas|propane|butane|lpg|natural\s+gas|gas\s+leak)\b/i,
    reason: 'Gas or a gas-powered system is involved.',
    professional: 'a licensed gas technician or your gas supplier',
  },
  {
    category: 'pressure',
    pattern:
      /\b(pressuri[sz]ed?|hydraulic|compressor|gas\s+cylinder|steam\s+pipe|water\s+pipe|plumbing)\b/i,
    reason: 'A pressurized or plumbing system is involved.',
    professional: 'a licensed plumber or pressure-system technician',
  },
  {
    category: 'structural',
    pattern:
      /\b(load[- ]bearing|foundation|structural|joists?|rafters?|ceiling|roof|ladder|balcony|wall[- ]mounted|in(?:to)?\s+the\s+wall|drywall\s+anchor)\b/i,
    reason: 'This touches building structure or a load-bearing surface.',
    professional: 'a licensed contractor or structural engineer',
  },
  {
    category: 'vehicle',
    pattern: /\b(cars?|vehicles?|motorcycles?|brakes?|airbags?|engines?|tyres?|tires?|windshield)\b/i,
    reason: 'Vehicle systems carry safety-critical risk.',
    professional: 'a qualified vehicle mechanic',
  },
  {
    category: 'medical',
    pattern: /\b(medical|pacemakers?|insulin|medicines?|syringes?|prosthe(?:sis|tic)|implants?)\b/i,
    reason: 'Medical devices or supplies are involved.',
    professional: 'a healthcare professional',
  },
  {
    category: 'weapon',
    pattern:
      /\b(weapons?|firearms?|handguns?|pistols?|revolvers?|rifles?|shotguns?|ammunition|ammo|explosives?|grenades?)\b/i,
    reason: 'Weapons or ammunition are involved.',
    professional: 'law enforcement or a certified armorer',
  },
  {
    category: 'chemical',
    pattern:
      /\b(chemicals?|bleach|acids?|solvents?|pesticides?|fuel|paint\s+thinner|asbestos|mold|mould)\b/i,
    reason: 'Chemicals, hazardous materials, or contamination may be involved.',
    professional: 'a hazardous-materials or remediation specialist',
  },
];

const DANGEROUS_ACTION =
  /\b(remove|open|touch|unscrew|disconnect|cut|drill|pry|short|rewire|replace)\b[^.]{0,48}\b(wire|wiring|outlet|breaker|panel|battery|gas\s+line|pipe|beam|joist|wall|foundation|brake|airbag)\b/i;

const CATEGORY_PRIORITY: HazardCategory[] = [
  'weapon',
  'chemical',
  'gas',
  'electrical',
  'pressure',
  'structural',
  'vehicle',
  'medical',
  'unclear',
];

const HAZARD_OBJECT_CATEGORIES = new Set<string>([
  'electrical',
  'gas',
  'pressure',
  'structural',
  'vehicle',
  'medical',
  'weapon',
  'chemical',
]);

export type SafetyGateInput = {
  hint: string;
  objectCategory: string;
  observation: string;
  confidence: number;
  steps: Pick<RepairStep, 'title' | 'detail' | 'safety'>[];
  model: {
    blocked: boolean;
    category: SafetyCategory;
    reason: string;
    professional: string;
  };
};

export type SafetyGateDecision = {
  blocked: boolean;
  category: SafetyCategory;
  reason: string;
  professional: string;
  source: SafetySource;
  nextStep: SafetyNextStep;
};

function matchRule(text: string): { rule: HazardRule; term: string } | null {
  for (const category of CATEGORY_PRIORITY) {
    const rule = HAZARD_RULES.find((item) => item.category === category);
    if (!rule) continue;
    const match = rule.pattern.exec(text);
    if (match) return { rule, term: match[0] };
  }
  return null;
}

function ruleFor(category: SafetyCategory): HazardRule | undefined {
  return HAZARD_RULES.find((item) => item.category === category);
}

function unclearDecision(reason: string, source: SafetySource): SafetyGateDecision {
  return {
    blocked: true,
    category: 'unclear',
    reason,
    professional: 'a qualified repair professional or the manufacturer support team',
    source,
    nextStep: 'retake',
  };
}

export function preflightHint(hint: string): SafetyGateDecision | null {
  const text = hint.trim();
  if (!text) return null;

  const match = matchRule(text);
  if (!match) return null;

  return {
    blocked: true,
    category: match.rule.category,
    reason: `The request mentions "${match.term}". ${match.rule.reason}`,
    professional: match.rule.professional,
    source: 'preflight',
    nextStep: 'professional',
  };
}

export function evaluateSafety(input: SafetyGateInput): SafetyGateDecision {
  const { model } = input;

  if (model.blocked || model.category !== 'safe') {
    const category: SafetyCategory = model.category === 'safe' ? 'unclear' : model.category;
    const rule = ruleFor(category);
    return {
      blocked: true,
      category,
      reason: model.reason.trim() || rule?.reason || 'The model stopped before giving guidance.',
      professional:
        model.professional.trim() || rule?.professional || 'a qualified repair professional',
      source: 'model',
      nextStep: 'professional',
    };
  }

  if (HAZARD_OBJECT_CATEGORIES.has(input.objectCategory)) {
    const category = input.objectCategory as HazardCategory;
    const rule = ruleFor(category);
    return {
      blocked: true,
      category,
      reason: `The subject was identified as a ${category} item. ${rule?.reason ?? ''}`.trim(),
      professional: rule?.professional ?? 'a qualified professional',
      source: 'model',
      nextStep: 'professional',
    };
  }

  const match = matchRule(`${input.hint}\n${input.observation}`);
  if (match) {
    return {
      blocked: true,
      category: match.rule.category,
      reason: `The observation mentions "${match.term}". ${match.rule.reason}`,
      professional: match.rule.professional,
      source: 'keyword',
      nextStep: 'professional',
    };
  }

  const stepText = input.steps
    .map((step) => `${step.title} ${step.detail} ${step.safety}`)
    .join(' ');
  if (DANGEROUS_ACTION.test(stepText)) {
    const rule = ruleFor('structural');
    return {
      blocked: true,
      category: 'structural',
      reason:
        'The suggested checklist contains an action that could affect wiring, plumbing, or building structure.',
      professional: rule?.professional ?? 'a licensed contractor',
      source: 'keyword',
      nextStep: 'professional',
    };
  }

  if (input.objectCategory === 'unclear') {
    return unclearDecision(
      'The subject could not be identified with enough confidence. A clearer photo is needed before any guidance.',
      'confidence',
    );
  }

  if (input.confidence < 30) {
    return unclearDecision(
      `The model's self-rating is only ${input.confidence}/100. ManualMate stops when the visual evidence is weak.`,
      'confidence',
    );
  }

  return { blocked: false, category: 'safe', reason: '', professional: '', source: 'none', nextStep: 'none' };
}

export function blockedCategoryLabel(category: SafetyCategory): string {
  switch (category) {
    case 'electrical':
      return 'Electrical hazard';
    case 'gas':
      return 'Gas hazard';
    case 'pressure':
      return 'Pressurized system';
    case 'structural':
      return 'Structural risk';
    case 'vehicle':
      return 'Vehicle system';
    case 'medical':
      return 'Medical device';
    case 'weapon':
      return 'Weapon';
    case 'chemical':
      return 'Hazardous material';
    case 'unclear':
      return 'Photo not clear enough';
    default:
      return 'Safe category';
  }
}
