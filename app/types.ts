export type SafetyCategory =
  | 'safe'
  | 'electrical'
  | 'gas'
  | 'pressure'
  | 'structural'
  | 'vehicle'
  | 'medical'
  | 'weapon'
  | 'chemical'
  | 'unclear';

export type HazardCategory = Exclude<SafetyCategory, 'safe'>;

export type SafetySource = 'preflight' | 'model' | 'keyword' | 'confidence' | 'none';

export type SafetyNextStep = 'none' | 'professional' | 'retake';

export type Severity = 'low' | 'medium' | 'high';

export type GroundingStatus = 'verified' | 'partial' | 'ungrounded';

export type Box2D = [number, number, number, number];

export type GroundingRegion = {
  label: string;
  box_2d: Box2D;
  severity: Severity;
};

export type RepairStep = {
  title: string;
  detail: string;
  safety: string;
};

export type AnalysisResult = {
  id: string;
  createdAt: string;
  objectLabel: string;
  objectCategory: string;
  observation: string;
  confidence: number;
  difficulty: 'Easy' | 'Moderate' | 'Hard' | 'Professional required';
  estimatedTime: string;
  tools: string[];
  parts: string[];
  steps: RepairStep[];
  note: string;
  blocked: boolean;
  safety: {
    category: SafetyCategory;
    reason: string;
    professional: string;
    source: SafetySource;
    nextStep: SafetyNextStep;
  };
  regions: GroundingRegion[];
  grounding: {
    status: GroundingStatus;
    note: string;
  };
  provider: 'meta' | 'safety-pregate';
  model: string;
  latencyMs: number;
};

export type HistoryEntry = {
  id: string;
  createdAt: string;
  objectLabel: string;
  observation: string;
  blocked: boolean;
  safetyCategory: SafetyCategory;
  image: string;
  thumb: string;
  result: AnalysisResult;
};

export type HealthResponse = {
  ok: boolean;
  configured: boolean;
  provider: 'meta' | 'unconfigured';
  model: string;
  version: string;
};

export type ServiceState = 'checking' | 'ready' | 'unavailable';
