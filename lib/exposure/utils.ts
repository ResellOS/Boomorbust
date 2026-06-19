import type { MarketVerdict } from '@/lib/verdict/marketVerdict';
import type { ExposurePlayer, PositionConcentration } from './types';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';

/** Lower = surfaced first (BOOM/BUY opportunity lead). */
export const VERDICT_SORT_ORDER: Record<MarketVerdict, number> = {
  BOOM: 0,
  BUY: 1,
  HOLD: 2,
  SELL: 3,
  BUST: 4,
};

export type ExposureGroup = 'opportunity' | 'neutral' | 'review';

export function exposureGroup(verdict: MarketVerdict): ExposureGroup {
  if (verdict === 'BOOM' || verdict === 'BUY') return 'opportunity';
  if (verdict === 'SELL' || verdict === 'BUST') return 'review';
  return 'neutral';
}

export function sortExposurePlayers(players: ExposurePlayer[]): ExposurePlayer[] {
  return [...players].sort((a, b) => {
    const va = VERDICT_SORT_ORDER[a.marketVerdict.verdict] ?? 5;
    const vb = VERDICT_SORT_ORDER[b.marketVerdict.verdict] ?? 5;
    if (va !== vb) return va - vb;
    return b.leagueCount - a.leagueCount;
  });
}

export function opportunityFraming(p: ExposurePlayer): string {
  const v = formatMarketVerdictLabel(p.marketVerdict.verdict);
  if (p.marketVerdict.verdict === 'BOOM' || p.marketVerdict.verdict === 'BUY') {
    return `You're well-positioned: ${p.fullName} in ${p.leagueCount} league${p.leagueCount === 1 ? '' : 's'}, BOB rates ${v}`;
  }
  if (p.marketVerdict.verdict === 'SELL' || p.marketVerdict.verdict === 'BUST') {
    return `Market divergence: ${p.fullName} in ${p.leagueCount} league${p.leagueCount === 1 ? '' : 's'}, BOB rates ${v}`;
  }
  return `${p.fullName} in ${p.leagueCount} league${p.leagueCount === 1 ? '' : 's'}, BOB rates ${v}`;
}

const POSITION_COLORS: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FBBF24',
  TE: '#A78BFA',
};

/** Bar colors for position concentration (Exposure page). */
export const EXPOSURE_BAR_COLORS: Record<'QB' | 'RB' | 'WR' | 'TE', string> = {
  QB: '#EF4444',
  RB: '#22D3EE',
  WR: '#3B82F6',
  TE: '#F97316',
};

const CONCENTRATION_POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const;

export function computePositionConcentration(
  players: ExposurePlayer[],
): PositionConcentration[] {
  return CONCENTRATION_POSITIONS.map((position) => {
    const posPlayers = players.filter((p) => p.position.toUpperCase() === position);
    return {
      position,
      playerCount: posPlayers.length,
      leagueSlots: posPlayers.reduce((sum, p) => sum + p.leagueCount, 0),
      color: EXPOSURE_BAR_COLORS[position],
    };
  });
}

export function positionAccent(position: string): string {
  return POSITION_COLORS[position.toUpperCase()] ?? '#6b7a99';
}
