import type { VerdictLabel } from '@/lib/players/types';

export type ExposureRiskLevel = 'DANGER' | 'CAUTION' | 'SAFE';

export interface ExposurePlayer {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  leagueCount: number;
  totalLeagues: number;
  exposurePct: number;
  leagueNames: string[];
  tfoScore: number;
  verdict: VerdictLabel;
  ageCurve: number | null;
  weeklyPoints: number | null;
  projectedPoints: number | null;
  trend7d: number[];
  riskLevel: ExposureRiskLevel;
}

export interface ExposureTopbarStats {
  totalPlayersTracked: number;
  highExposureCount: number;
  highExposurePct: number;
  dangerZoneCount: number;
  dangerZonePct: number;
  portfolioConcentration: number;
  concentrationLabel: 'Low' | 'Moderate' | 'High';
  leaguesAnalyzed: number;
}

export interface PortfolioOverview {
  totalAssets: number;
  avgDynastyRating: number;
  boomRate: number;
}

export interface ExposureHealth {
  score: number;
  label: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  sub: string;
  pointerPct: number;
}

export interface PortfolioRisk {
  score: number;
  label: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  concentrationRisk: number;
  positionDiversity: number;
  ageCurveRisk: number;
}

export interface PositionBreakdown {
  position: string;
  count: number;
  pct: number;
  color: string;
}

export interface WeeklyPerformance {
  beating: number;
  onTrack: number;
  below: number;
  totalPoints: number;
  projected: number;
  delta: number;
}

export interface ExposurePageData {
  leagues: { id: string; name: string; league_type?: string | null; status?: string | null }[];
  topbar: ExposureTopbarStats;
  portfolioOverview: PortfolioOverview;
  exposureHealth: ExposureHealth;
  players: ExposurePlayer[];
  portfolioRisk: PortfolioRisk;
  dangerAlerts: ExposurePlayer[];
  positionBreakdown: PositionBreakdown[];
  positionAdvisory: string | null;
  weeklyPerformance: WeeklyPerformance;
  nflWeek: number;
  isGameDay: boolean;
  leagueCount: number;
}
