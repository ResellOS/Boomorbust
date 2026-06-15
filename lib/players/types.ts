import type { MarketVerdictDisplay } from '@/lib/verdict/fetchMarketVerdicts';

export type VerdictLabel =
  | 'STRONG BOOM'
  | 'BOOM'
  | 'HOLD'
  | 'BUST'
  | 'STRONG BUST';

export type TrendDirection = 'up' | 'flat' | 'down';

export interface PlayerSubScores {
  opportunity: number;
  situation: number;
  ageCurve: number;
  iq: number;
  upside: number;
}

export interface HubPlayer {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  age: number | null;
  tfoScore: number;
  verdict: VerdictLabel;
  subScores: PlayerSubScores;
  trend: TrendDirection;
  trendDelta: number;
  scoreHistory: number[];
  calculatedAt: string | null;
  /** Market buy/sell verdict vs KTC; null when not in the scored skill pool. */
  marketVerdict: MarketVerdictDisplay | null;
}

export interface RosterSnapshotPlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
}

export interface PlayerHubStats {
  playersTracked: number;
  boomPlayers: number;
  bustPlayers: number;
  avgDynastyRating: number;
  lastUpdated: string | null;
  lastUpdatedMinutes: number;
}

export interface PlayerHubData {
  leagues: { id: string; name: string; league_type?: string | null; status?: string | null }[];
  stats: PlayerHubStats;
  players: HubPlayer[];
  rosterPlayerIds: string[];
  rosterSnapshot: RosterSnapshotPlayer[];
  leaguePresence: Record<string, string[]>;
  edgeOpportunities: number;
  leagueCount: number;
}
