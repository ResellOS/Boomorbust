export type CallRecommendation =
  | 'Buy Now'
  | 'Buy Window'
  | 'Sell Now'
  | 'Sell Window'
  | 'Start'
  | 'Sit';

export type CallConfidence = 'Lean' | 'Strong' | 'Smash';

export type CallResult = 'WIN' | 'LOSS' | 'PUSH' | 'PENDING' | 'INVALIDATED';

export type CallFilter =
  | 'all'
  | 'buy_sell'
  | 'start_sit'
  | 'wins'
  | 'losses'
  | 'pending';

export interface PerformanceStats {
  totalCalls: number;
  bobAccuracy: number | null;
  consensusAccuracy: number | null;
  ktcAccuracy: number | null;
  edge: number | null;
  seasonRecord: { wins: number; losses: number; pending: number };
  hitRate: number | null;
  hasSeasonData: boolean;
}

export interface ConsensusComparison {
  bob: number | null;
  fantasyPros: number | null;
  ktc: number | null;
  random: number;
}

export interface WeeklyAccuracyPoint {
  week: number;
  bobAccuracy: number;
  consensusAccuracy: number;
}

export interface CategoryAccuracy {
  buyNow: number | null;
  buyWindow: number | null;
  sellNow: number | null;
  sellWindow: number | null;
  startCalls: number | null;
  sitCalls: number | null;
}

export interface ConfidenceTierRow {
  tier: CallConfidence;
  label: string;
  range: string;
  calls: number | null;
  accuracy: number | null;
}

export interface BobCall {
  id: string;
  callDate: string;
  playerName: string;
  position: string;
  recommendation: CallRecommendation;
  confidence: CallConfidence;
  confidencePct: number | null;
  result: CallResult;
  bobRating?: number | null;
  marketRank?: string | null;
  marketImpact?: string | null;
  missedBy?: string | null;
  outcomePct?: number | null;
}

export interface ModelEvolutionEntry {
  date: string;
  title: string;
  detail: string;
  accuracyBefore?: number | null;
  accuracyAfter?: number | null;
}

export interface PerformancePageData {
  stats: PerformanceStats;
  consensus: ConsensusComparison;
  weeklyChart: WeeklyAccuracyPoint[];
  categoryAccuracy: CategoryAccuracy;
  confidenceCalibration: ConfidenceTierRow[];
  calls: BobCall[];
  hallOfFame: BobCall[];
  hallOfShame: BobCall[];
  modelTimeline: ModelEvolutionEntry[];
  leagues: { id: string; name: string }[];
}
