import type { OwnedPick } from '@/lib/trade/types';

export type DraftType = 'startup' | 'rookie' | 'redraft';
export type DraftPhase = 'landing' | 'setup' | 'drafting' | 'complete';
export type DraftOrderType = 'snake' | 'linear';
export type PickTimer = 'none' | '30' | '60' | '90' | '120' | '180' | '300' | '600' | '1800';
export type PlayerPoolFilter = 'all' | 'rookies' | 'vets';
export type RosterSlotType = 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'K' | 'DEF' | 'BN';
export type ScoringPreset =
  | 'standard'
  | 'ppr'
  | 'half_ppr'
  | '2qb'
  | 'dynasty_standard'
  | 'dynasty_ppr'
  | 'dynasty_half_ppr'
  | 'dynasty_2qb';

export type Position = 'QB' | 'RB' | 'WR' | 'TE';

export type SkillPosition = 'QB' | 'RB' | 'WR' | 'TE';

export interface RosterSlotConfig {
  type: RosterSlotType;
  count: number;
}

export interface DraftTeam {
  slot: number;
  name: string;
  isUser: boolean;
}

export interface DraftConfig {
  draftName: string;
  draftType: DraftType;
  draftOrderType: DraftOrderType;
  teams: number;
  rounds: number;
  scoring: ScoringPreset;
  superflex: boolean;
  yourPick: number;
  pickTimer: PickTimer;
  cpuAutopick: boolean;
  playerPool: PlayerPoolFilter;
  thirdRoundReversal: boolean;
  showTeamNames: boolean;
  rosterSlots: RosterSlotConfig[];
  teamOrder: DraftTeam[];
}

export interface DraftablePlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  age: number | null;
  tfoScore: number;
  verdict: string;
  bobRank: number;
  marketRank: number;
  adp: number;
  byeWeek?: number | null;
  proj?: number | null;
  avg?: number | null;
  isRookie?: boolean;
}

export interface DraftPickRecord {
  overall: number;
  round: number;
  slot: number;
  isUser: boolean;
  player: DraftablePlayer;
  bobTopRank: number;
  followedBob: boolean;
}

export interface DraftLeague {
  id: string;
  name: string;
  league_type?: string | null;
  status?: string | null;
}

export interface DraftSessionSummary {
  id: string;
  draftName: string;
  draftType: DraftType;
  teams: number;
  rounds: number;
  status: 'in_progress' | 'completed';
  grade: string | null;
  createdAt: string;
  completedAt: string | null;
  pickCount: number;
  superflex: boolean;
  yourPick: number;
  draftOrderType: DraftOrderType;
  thirdRoundReversal: boolean;
}

export interface DraftPageData {
  pool: DraftablePlayer[];
  leagues: DraftLeague[];
  scoringContext: 'dynasty' | 'redraft';
  sessions: DraftSessionSummary[];
  /** User-owned picks across leagues — same source as Trade Calculator give dropdown. */
  ownedPicksByLeague: Record<string, OwnedPick[]>;
}

export interface ReachOrValue {
  player: DraftablePlayer;
  overall: number;
  margin: number;
}

export interface DraftGradeSummary {
  grade: 'A' | 'B' | 'C' | 'D';
  avgTfo: number;
  agreementRate: number;
  biggestReach: ReachOrValue | null;
  bestValue: ReachOrValue | null;
  userPicks: DraftPickRecord[];
  allPicks: DraftPickRecord[];
}

export interface TierBreak {
  tier: number;
  afterBobRank: number;
  scoreDrop: number;
}

export interface TradeAsset {
  kind: 'player' | 'pick';
  player?: DraftablePlayer;
  overall?: number;
  round?: number;
  slot?: number;
  value: number;
}

export interface TradeProposal {
  fromSlot: number;
  toSlot: number;
  offer: TradeAsset[];
  request: TradeAsset[];
}

export interface TradeResult {
  accepted: boolean;
  counter?: TradeProposal;
  message: string;
}

export interface ChatMessage {
  id: string;
  slot: number;
  teamName: string;
  text: string;
  ts: number;
}

/** @deprecated use ScoringPreset */
export type ScoringFormat = 'ppr' | 'half_ppr' | 'standard';
