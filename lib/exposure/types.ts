import type { MarketVerdictDisplay } from '@/lib/verdict/fetchMarketVerdicts';

export interface ExposurePlayer {
  playerId: string;
  fullName: string;
  position: string;
  team: string;
  leagueCount: number;
  leagueNames: string[];
  marketVerdict: MarketVerdictDisplay;
  tfoScore?: number;
  portfolioPct?: number;
}

export interface PositionConcentration {
  position: 'QB' | 'RB' | 'WR' | 'TE';
  playerCount: number;
  leagueSlots: number;
  color: string;
}

export type {
  ConcentrationRow,
  ExposurePageData,
  ExposureTopbarStats,
  MissingEliteAsset,
  PortfolioHeroOpportunity,
  PortfolioHeroRisk,
  PortfolioOverview,
  SimulatorPlayer,
  VerdictExposureSummary,
} from './portfolioEngine';
