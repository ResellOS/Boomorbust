import type { VerdictLabel } from '@/lib/players/types';

export interface LeagueRow {
  id: string;
  name: string;
  season?: string | null;
  total_rosters?: number | null;
  status?: string | null;
  league_type?: string | null;
  scoring_settings?: Record<string, number> | null;
  settings?: Record<string, unknown> | null;
  owner_id?: string | null;
}

export interface LeagueHeaderStats {
  initials: string;
  name: string;
  badge: 'Contender' | 'Rebuild';
  subtitle: string;
  teamGrade: string;
  teamGradeNumeric: number;
  tfoTeamScore: number;
  tfoPercentile: string;
  contenderScore: number;
  contenderLabel: string;
  rosterConstruction: string;
  rosterConstructionPct: string;
  lastUpdated: string;
}

export interface TopPlayer {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  tfoScore: number;
  verdict: VerdictLabel;
}

export interface YourTeamData {
  tfoTeamScore: number;
  record: string;
  pointsFor: number;
  projectedFinish: number;
  playoffOdds: number;
  championshipOdds: number;
  strengths: string[];
  needsAttention: string[];
  topPlayers: TopPlayer[];
}

export interface LeagueIntelRow {
  managerId: string;
  handle: string;
  isYou: boolean;
  liScore: number;
  tradeTendency: string;
  draftStyle: string;
  aggression: string;
  overpaysFor: string;
}

export interface StandingRow {
  rank: number;
  teamName: string;
  handle: string;
  record: string;
  pointsFor: number;
  projectedFinish: number;
  playoffOdds: number;
  isYou: boolean;
}

export interface TradeTarget {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  tfoScore: number;
  ownerHandle: string;
}

export interface ManagerTarget {
  handle: string;
  note: string;
  liScore: number;
}

export interface LeagueSignal {
  icon: string;
  name: string;
  description: string;
}

export interface LeagueSettingsDisplay {
  leagueName: string;
  players: number;
  rosterSize: string;
  pointsPer: string;
  tePremium: string;
  rookieDraft: string;
  tradeDeadline: string;
  playoffWeeks: string;
  maxPf: string;
}

export interface LeagueDetailData {
  league: LeagueRow;
  allLeagues: LeagueRow[];
  header: LeagueHeaderStats;
  yourTeam: YourTeamData;
  leagueIntel: LeagueIntelRow[];
  standings: StandingRow[];
  tradeTargets: TradeTarget[];
  managerTargets: ManagerTarget[];
  signals: LeagueSignal[];
  settings: LeagueSettingsDisplay;
  footer: {
    playersTracked: number;
    boomPlayers: number;
    bustPlayers: number;
    avgDynastyRating: number;
    lastUpdatedMinutes: number;
    leagueCount: number;
  };
}
