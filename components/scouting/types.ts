export type ScoutingTabId =
  | 'WAIVER_RADAR'
  | 'PROCESS_VS_RESULTS'
  | 'WR_EFFICIENCY_MATRIX'
  | 'HIDDEN_GEMS'
  | 'BREAKOUT_WATCH'
  | 'DEEP_DIVE';

export type WaiverPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface WaiverRadarRow {
  rank: number;
  playerName: string;
  position: string;
  team: string;
  pctRostered: number;
  trendUp: boolean;
  pctFaab: number;
  priority: WaiverPriority;
  opportunityScore: number;
}

export interface HiddenGemRow {
  rank: number;
  playerName: string;
  position: string;
  team: string;
  pctRostered: number;
  trend7d: number;
  opportunityScore: number;
}

export interface ProcessEdgeResponse {
  processEdge: number;
  processLabel: string;
  processPct: string;
  narrativeTitle: string;
  narrativeBody: string;
  expectedWins: number;
  actualWins: number;
  winDifference: number;
  takeawayTitle: string;
  takeawayBody: string;
  progressPct: number;
}

export interface WRMatrixPoint {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
  color: string;
  metricX: string;
  metricY: string;
}

export interface WRMatrixResponse {
  points: WRMatrixPoint[];
}

export interface PlayerMetric {
  label: string;
  value: string;
  tier: string;
  valueColor: string;
  tierColor: string;
}

export interface PlayerDeepDive {
  playerId: string;
  name: string;
  position: string;
  team: string;
  avatarUrl: string | null;
  age: number;
  height: string;
  weight: number;
  college: string;
  draft: string;
  playerScore: number;
  scoreTier: string;
  scoreSub: string;
  trend30d: number;
  trendSpark: number[];
  metrics: PlayerMetric[];
}

export interface DeepDiveSubTab {
  id: string;
  label: string;
}

export interface PlayerSearchHit {
  playerId: string;
  full_name: string;
  position: string;
  team: string | null;
}

export const DEEP_DIVE_SUB_TABS: DeepDiveSubTab[] = [
  { id: 'OVERVIEW', label: 'OVERVIEW' },
  { id: 'METRICS', label: 'METRICS' },
  { id: 'GAME_LOG', label: 'GAME LOG' },
  { id: 'ROUTE_TREE', label: 'ROUTE TREE' },
  { id: 'FILM_ROOM', label: 'FILM ROOM' },
  { id: 'COMPARABLES', label: 'COMPARABLES' },
  { id: 'INJURY_HISTORY', label: 'INJURY HISTORY' },
];
