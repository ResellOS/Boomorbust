export function leagueInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || 'LG').toUpperCase();
}

export function teamGradeFromScore(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'C-';
}

export function rosterConstructionLabel(tfoScore: number): {
  label: string;
  pct: string;
} {
  if (tfoScore > 85) return { label: 'Elite', pct: 'Top 18%' };
  if (tfoScore > 75) return { label: 'Strong', pct: 'Top 35%' };
  if (tfoScore > 65) return { label: 'Average', pct: 'Top 55%' };
  return { label: 'Developing', pct: 'Bottom 45%' };
}

export function contenderLabel(score: number): string {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Solid';
  if (score >= 55) return 'Competitive';
  return 'Rebuild';
}

export function tfoPercentile(score: number): string {
  if (score >= 85) return 'Top 12%';
  if (score >= 75) return 'Top 25%';
  if (score >= 65) return 'Top 45%';
  return 'Bottom 50%';
}

export function winRatePct(wins: number, losses: number, ties: number): number {
  const games = wins + losses + ties;
  if (games <= 0) return 50;
  return Math.round(((wins + ties * 0.5) / games) * 1000) / 10;
}

export function formatLastUpdated(iso: string | null): string {
  if (!iso) return 'Live Sync';
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function minutesAgo(iso: string | null): number {
  if (!iso) return 8;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export function leagueBadge(
  status?: string | null,
  leagueType?: string | null,
): 'Contender' | 'Rebuild' {
  const s = (status ?? '').toLowerCase();
  const t = (leagueType ?? '').toLowerCase();
  if (s.includes('rebuild') || t.includes('rebuild')) return 'Rebuild';
  return 'Contender';
}
