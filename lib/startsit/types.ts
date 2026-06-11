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
}

export interface HighConfidenceAlerts {
  mustStart: StartSitRecommendation | null;
  mustSit: StartSitRecommendation | null;
  sleeperPick: StartSitRecommendation | null;
}

export interface StartSitTopbar {
  seasonRecord: string;
  seasonWinRate: number;
  thisWeekCalls: number;
  confidenceLevel: 'High' | 'Medium' | 'Low';
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
  flexDecisions: FlexDecision[];
  alerts: HighConfidenceAlerts;
  allRecommendations: StartSitRecommendation[];
  leagueCount: number;
}
