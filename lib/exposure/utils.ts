import type { ExposureRiskLevel } from './types';

export function exposureRiskLevel(exposurePct: number): ExposureRiskLevel {
  if (exposurePct >= 100) return 'DANGER';
  if (exposurePct >= 60) return 'CAUTION';
  return 'SAFE';
}

export function concentrationLabel(pct: number): 'Low' | 'Moderate' | 'High' {
  if (pct < 25) return 'Low';
  if (pct <= 40) return 'Moderate';
  return 'High';
}

export function healthRiskLabel(
  score: number,
): 'Low Risk' | 'Moderate Risk' | 'High Risk' {
  if (score < 20) return 'Low Risk';
  if (score <= 40) return 'Moderate Risk';
  return 'High Risk';
}

export function portfolioRiskLabel(
  score: number,
): 'Low Risk' | 'Moderate Risk' | 'High Risk' {
  if (score <= 33) return 'Low Risk';
  if (score <= 66) return 'Moderate Risk';
  return 'High Risk';
}

export function healthRiskSub(label: 'Low Risk' | 'Moderate Risk' | 'High Risk'): string {
  if (label === 'Low Risk') return 'Portfolio well diversified';
  if (label === 'Moderate Risk') return 'Monitor closely';
  return 'Action recommended';
}

export function riskBarColor(level: ExposureRiskLevel): string {
  if (level === 'DANGER') return '#ef4444';
  if (level === 'CAUTION') return '#FBBF24';
  return '#36E7A1';
}

export function riskBadgeClass(level: ExposureRiskLevel): string {
  if (level === 'DANGER') {
    return 'bg-[rgba(239,68,68,0.1)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]';
  }
  if (level === 'CAUTION') {
    return 'bg-hold/10 text-hold border border-hold/30';
  }
  return 'bg-boom/10 text-boom border border-boom/30';
}

export function subScoreRiskLabel(
  value: number,
): { text: string; className: string } {
  if (value >= 67) return { text: `${Math.round(value)}% High`, className: 'text-[#ef4444]' };
  if (value >= 34) return { text: `${Math.round(value)}% Medium`, className: 'text-hold' };
  return { text: `${Math.round(value)}% Low`, className: 'text-boom' };
}

export function isNflGameDay(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 1 || day === 4;
}

const POSITION_COLORS: Record<string, string> = {
  WR: '#A78BFA',
  RB: '#36E7A1',
  QB: '#FBBF24',
  TE: '#6b7a99',
};

export function positionColor(position: string): string {
  return POSITION_COLORS[position.toUpperCase()] ?? '#6b7a99';
}

export function formatLeaguesSummary(names: string[], total: number): string {
  if (names.length >= total) return `All ${total} Leagues`;
  if (names.length === 0) return '—';
  if (names.length <= 2) return names.join(', ');
  return `${names.length} Leagues`;
}
