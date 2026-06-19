import type { HubComponents } from './types';
import type { MarketVerdict } from '@/lib/verdict/marketVerdict';

export interface OvrTier {
  color: string;
  glow: string;
  label: string;
}

export function ovrNumberTier(score: number): OvrTier {
  if (score >= 90) {
    return { color: '#36E7A1', glow: '0 0 24px rgba(54,231,161,0.45)', label: 'ELITE ASSET' };
  }
  if (score >= 75) {
    return { color: '#60a5fa', glow: '0 0 24px rgba(96,165,250,0.4)', label: score >= 80 ? 'FRANCHISE CORNERSTONE' : 'WIN-NOW ASSET' };
  }
  if (score >= 60) {
    return { color: '#FBBF24', glow: '0 0 20px rgba(251,191,36,0.35)', label: score >= 70 ? 'WIN-NOW ASSET' : 'DEVELOPING ASSET' };
  }
  return { color: '#A78BFA', glow: '0 0 16px rgba(167,139,250,0.3)', label: 'DEPTH PIECE' };
}

export function ovrLabelTier(score: number): { label: string; color: string; glow: string } {
  if (score >= 90) return { label: 'ELITE ASSET', color: '#36E7A1', glow: '0 0 12px rgba(54,231,161,0.5)' };
  if (score >= 80) return { label: 'FRANCHISE CORNERSTONE', color: '#60a5fa', glow: '0 0 12px rgba(96,165,250,0.45)' };
  if (score >= 70) return { label: 'WIN-NOW ASSET', color: '#FBBF24', glow: '0 0 10px rgba(251,191,36,0.4)' };
  if (score >= 60) return { label: 'DEVELOPING ASSET', color: '#64748B', glow: 'none' };
  return { label: 'DEPTH PIECE', color: '#64748B', glow: 'none' };
}

export const COMPONENT_BAR_COLORS: Record<string, string> = {
  Opportunity: '#FBBF24',
  'Scheme Fit': '#60a5fa',
  'Year-Over-Year': '#36E7A1',
  Situation: '#A78BFA',
  'Projected Output': '#22D3EE',
};

export function bobRankFromMarket(ktcRank: number | null, rankDelta: number | null): number | null {
  if (ktcRank == null || rankDelta == null) return null;
  return Math.round(ktcRank - rankDelta);
}

export function acquisitionWindow(
  verdict: MarketVerdict | null,
  direction: 'up' | 'down' | 'neutral' | null,
): string {
  const v = verdict ?? 'HOLD';
  if ((v === 'BOOM' || v === 'BUY') && direction === 'up') return 'Buy Now';
  if (v === 'SELL' || v === 'BUST') {
    if (direction === 'down') return 'Sell Window Open';
    return 'Sell Window';
  }
  if (v === 'BOOM' || v === 'BUY') return 'Win-Now';
  if (v === 'HOLD') return 'Hold';
  return 'Monitor';
}

export function confidenceLabel(tier: string | null | undefined): string {
  const t = (tier ?? '').toUpperCase();
  if (t === 'HIGH') return 'High Confidence';
  if (t === 'LOW') return 'Low Confidence';
  return 'Medium Confidence';
}

export function expectedValueChangePct(
  direction: 'up' | 'down' | 'neutral' | null,
  prob60d: number | null,
): number {
  const base = prob60d != null && prob60d > 0 ? prob60d : 0.8;
  return Math.round(base * 10 * 10) / 10;
}

export function buildStrengthsAndRisks(
  playerName: string,
  components: HubComponents | null,
  age: number | null,
  confidenceTier: string | null,
): { strengths: string[]; risks: string[] } {
  const strengths: string[] = [];
  const risks: string[] = [];
  const first = playerName.split(' ')[0] ?? playerName;

  if (!components) {
    return {
      strengths: [`${first} has a solid composite dynasty profile`],
      risks: ['Limited component data — signal confidence building'],
    };
  }

  if (components.ops > 75) {
    strengths.push(`${first} has elite opportunity share at their position`);
  }
  if (components.sfs > 70) {
    strengths.push('Strong scheme fit with current offensive system');
  }
  if (components.yoysi > 70) {
    strengths.push('Positive year-over-year trajectory');
  }
  if (components.projectedPpg > 18) {
    strengths.push('Top-tier fantasy output projection');
  }
  if ((confidenceTier ?? '').toUpperCase() === 'HIGH') {
    strengths.push('High confidence signal — strong data sample');
  }

  if (components.ops < 50) {
    risks.push('Limited opportunity share — target competition concern');
  }
  if (components.sit < 50) {
    risks.push('Situation uncertainty — scheme or team context risk');
  }
  if (components.yoysi < 45) {
    risks.push('Declining year-over-year trajectory');
  }
  if (age != null && age >= 30) {
    risks.push('Age curve entering decline phase');
  }

  if (strengths.length === 0) {
    strengths.push(`${first} profiles as a balanced dynasty asset`);
  }
  if (risks.length === 0) {
    risks.push('No major risk flags in current component profile');
  }

  return { strengths: strengths.slice(0, 3), risks: risks.slice(0, 3) };
}

export function recommendationLabel(verdict: MarketVerdict | null): string {
  if (!verdict) return 'HOLD';
  if (verdict === 'BOOM') return 'BUY NOW';
  if (verdict === 'BUY') return 'BUY WINDOW';
  if (verdict === 'SELL') return 'SELL NOW';
  if (verdict === 'BUST') return 'SELL WINDOW';
  return 'HOLD';
}

export function positionBorderColor(position: string): string {
  const p = position.toUpperCase();
  if (p === 'QB') return '#FBBF24';
  if (p === 'RB') return '#36E7A1';
  if (p === 'WR') return '#22D3EE';
  if (p === 'TE') return '#A78BFA';
  return '#64748B';
}
