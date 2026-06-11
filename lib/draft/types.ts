export type DraftType = 'startup' | 'rookie' | 'redraft';
export type ScoringFormat = 'ppr' | 'half_ppr' | 'standard';
export type DraftPhase = 'setup' | 'drafting' | 'complete';
export type Position = 'QB' | 'RB' | 'WR' | 'TE';

export interface DraftablePlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  age: number | null;
  tfoScore: number;
  verdict: string;
  bobRank: number; // 1..N by TFO desc within the pool (BOB's board)
  marketRank: number; // 1..N by market value (KTC) desc — ADP proxy
  adp: number; // synthetic ADP number (= marketRank)
}

export interface DraftConfig {
  draftType: DraftType;
  teams: number;
  rounds: number;
  scoring: ScoringFormat;
  superflex: boolean;
  yourPick: number; // 1..teams
}

export interface DraftPickRecord {
  overall: number; // 1-based overall pick
  round: number;
  slot: number; // team slot 1..teams
  isUser: boolean;
  player: DraftablePlayer;
  bobTopRank: number; // bobRank of the best available player at that moment
  followedBob: boolean; // user took BOB's top available
}

export interface DraftLeague {
  id: string;
  name: string;
  league_type?: string | null;
  status?: string | null;
}

export interface DraftPageData {
  pool: DraftablePlayer[];
  leagues: DraftLeague[];
  scoringContext: 'dynasty' | 'redraft';
}

export interface ReachOrValue {
  player: DraftablePlayer;
  overall: number;
  margin: number; // reach: bobRank - overall ; value: marketRank - bobRank
}

export interface DraftGradeSummary {
  grade: 'A' | 'B' | 'C' | 'D';
  avgTfo: number;
  agreementRate: number; // 0..100
  biggestReach: ReachOrValue | null;
  bestValue: ReachOrValue | null;
  userPicks: DraftPickRecord[];
}
