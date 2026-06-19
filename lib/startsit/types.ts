import type { VerdictLabel } from '@/lib/players/types';

export interface StartSitRecommendation {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  opponent: string;
  startScore: number;
  confidence: number;
  barScore: number;
  projectedPoints: number | null;
  reasoning: string;
  whyBullets: string[];
  obviousCall?: boolean;
  tfoScore: number;
  verdict: VerdictLabel;
  leagueIds: string[];
  ownershipPct: number;
}

export interface FlexDecision {
  position: 'RB' | 'WR' | 'TE';
  playerA: StartSitRecommendation;
  playerB: StartSitRecommendation;
  pick: StartSitRecommendation;
  pickNote: string;
  dynastyEdge: number;
  confidence?: number;
  confidenceTier?: 'Lean' | 'Strong' | 'Smash';
}

export interface LineupDecision {
  id: string;
  variant: 'start' | 'sit';
  startPlayer: StartSitRecommendation;
  sitPlayer: StartSitRecommendation;
  leagueId: string;
  leagueName: string;
  position: string;
  edgePts: number;
  confidence: number;
  confidenceTier: 'Lean' | 'Strong' | 'Smash';
  whyBullets: string[];
  whyOneLine: string;
  decisionLabel: string;
}

export interface DecisionsSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  expectedGain: number;
  potentialCost: number;
}

export interface LeagueLineupChange {
  leagueId: string;
  leagueName: string;
  decisions: LineupDecision[];
  potentialGain: number;
}

export interface LineupOptimizer {
  grade: string;
  currentLineupPts: number;
  optimizedLineupPts: number;
  potentialGain: number;
  leagueCount: number;
  changesRecommended: number;
  totalPotentialGain: number;
  leagueChanges: LeagueLineupChange[];
}

export interface SeasonRecord {
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  totalDecisions: number;
}

export interface WeekRecord {
  correct: number;
  incorrect: number;
  pending: number;
  winRate: number;
}

export interface WeekContext {
  nflWeek: number;
  season: number;
  windowOpen: boolean;
  lockDeadline: string;
  weatherImpact: string;
  /** NFL week 0 / no active regular season */
  isOffseason: boolean;
}

export interface HighConfidenceAlerts {
  mustStart: StartSitRecommendation | null;
  mustSit: StartSitRecommendation | null;
  sleeperPick: StartSitRecommendation | null;
}

export interface StartSitTopbar {
  seasonRecord: string;
  seasonWinRate: number;
  /** @deprecated use decisionsToday */
  thisWeekCalls: number;
  decisionsToday: number;
  expectedGain: number;
  confidenceLevel: 'Smash' | 'Strong' | 'Lean' | 'Preseason';
  avgConfidence: number;
  lastUpdatedMinutes: number;
}

export interface StartSitPageData {
  leagues: { id: string; name: string; league_type?: string | null; status?: string | null }[];
  topbar: StartSitTopbar;
  weekContext: WeekContext;
  bobConfidence: number;
  seasonRecord: SeasonRecord;
  weekRecord: WeekRecord;
  seasonSparkline: { week: number; winRate: number }[];
  startThese: StartSitRecommendation[];
  sitThese: StartSitRecommendation[];
  decisions: LineupDecision[];
  decisionsSummary: DecisionsSummary;
  lineupOptimizer: LineupOptimizer;
  flexDecisions: FlexDecision[];
  alerts: HighConfidenceAlerts;
  allRecommendations: StartSitRecommendation[];
  leagueCount: number;
  hasRealData: boolean;
}
