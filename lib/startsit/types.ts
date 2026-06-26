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
  /** Player ids per league for lineup rendering */
  rosterByLeague: Record<string, string[]>;
}

export type WeeklyDecisionKind =
  | 'START'
  | 'BENCH'
  | 'ADD'
  | 'DROP'
  | 'TRADE'
  | 'WEATHER'
  | 'INJURY';

export interface WeeklyDecisionCard {
  id: string;
  kind: WeeklyDecisionKind;
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  opponent: string;
  leagueId: string;
  leagueName: string;
  projectedPoints: number | null;
  impact: 'High' | 'Medium' | 'Low';
  confidence: number;
  whyBullets: string[];
  whyOneLine: string;
  isPreview: boolean;
  relatedPlayerId?: string;
  relatedPlayerName?: string;
}

export interface LineupSlotView {
  slot: string;
  playerId: string | null;
  playerName: string;
  position: string;
  team: string;
  opponent: string;
  projectedPoints: number | null;
  confidence: number;
  recommendation: 'start' | 'sit' | 'flex' | 'neutral';
}

export interface LeagueMatchupView {
  leagueId: string;
  leagueName: string;
  week: number;
  yourTeamName: string;
  opponentTeamName: string | null;
  yourProjected: number;
  opponentProjected: number | null;
  yourWinPct: number | null;
  opponentWinPct: number | null;
  projectedMargin: number | null;
  impliedTotal: number | null;
  positionBreakdown: { slot: string; you: number; opp: number | null }[];
  syncing: boolean;
}

export interface PortfolioMatchupSummary {
  totalProjectedPoints: number;
  projectedWins: number | null;
  projectedLosses: number | null;
  closestMatchup: string | null;
  biggestEdge: string | null;
  highestRiskMatchup: string | null;
  leagueCount: number;
}

export interface WeeklyCompletion {
  pct: number;
  leaguesComplete: number;
  leaguesTotal: number;
  decisionsComplete: number;
  decisionsTotal: number;
}
