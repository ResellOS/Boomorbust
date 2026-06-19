import type { MarketVerdictDisplay } from '@/lib/verdict/fetchMarketVerdicts';
import type { PlayerBio } from './playerIntelligence';

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

/** Real engine component scores (0–100; PPG raw) for the detail radar/signal bars. */
export interface HubComponents {
  ops: number;
  sfs: number;
  yoysi: number;
  sit: number;
  projectedPpg: number;
}

export interface PlayerValueSignal {
  direction60d: 'up' | 'down' | 'neutral' | null;
  prob60d: number | null;
}

export interface PlayerHubPortfolio {
  avgPortfolioTfo: number;
  totalPortfolioTfo: number;
  positionSharePct: Record<string, number>;
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
  /** Real engine components (OPS/SFS/YOY/SIT/PPG); null when not scored. */
  components: HubComponents | null;
  trend: TrendDirection;
  trendDelta: number;
  scoreHistory: number[];
  scoreHistoryDates: string[];
  calculatedAt: string | null;
  confidenceTier: string | null;
  valueSignal: PlayerValueSignal | null;
  /** Market buy/sell verdict vs KTC; null when not in the scored skill pool. */
  marketVerdict: MarketVerdictDisplay | null;
  bio?: PlayerBio;
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
  portfolio: PlayerHubPortfolio;
  edgeOpportunities: number;
  leagueCount: number;
}
