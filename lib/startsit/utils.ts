import { fetchNflState } from '@/lib/sleeper';

import { formatStartSitConfidence } from '@/lib/ui/labels';

export function isOffseasonWeek(nflWeek: number): boolean {
  return nflWeek === 0;
}

export function confidenceLevelLabel(avg: number): 'Smash' | 'Strong' | 'Lean' {
  const label = formatStartSitConfidence(avg);
  return label as 'Smash' | 'Strong' | 'Lean';
}

/** Effective confidence for display — sit rows use inverted sit score, capped at 85 unless inactive. */
export function effectiveRecommendationConfidence(
  rec: { startScore: number; obviousCall?: boolean },
  variant: 'start' | 'sit',
): number {
  if (variant === 'sit') {
    const obvious = rec.obviousCall ?? isObviousSitCall(rec.startScore, null);
    return sitConfidence(rec.startScore, obvious);
  }
  return Math.round(rec.startScore);
}

export function sitConfidence(startScore: number, obviousCall = false): number {
  const raw = Math.round(100 - startScore + 38);
  return obviousCall ? Math.min(98, raw) : Math.min(85, raw);
}

const INJURY_SIT = /^(out|ir|pup|doubtful|inactive)/i;

export function isObviousSitCall(
  startScore: number,
  injuryStatus: string | null | undefined,
): boolean {
  if (injuryStatus && INJURY_SIT.test(injuryStatus.trim())) return true;
  return startScore < 25;
}

export function estimateProjection(tfoScore: number, position: string): number {
  const mult: Record<string, number> = {
    QB: 0.35,
    RB: 0.24,
    WR: 0.22,
    TE: 0.18,
  };
  const m = mult[position.toUpperCase()] ?? 0.22;
  return Math.round(tfoScore * m * 10) / 10;
}

export function minutesAgo(iso: string | null): number {
  if (!iso) return 8;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(diff / 60000));
}

export function deriveNflWeekFromDate(date = new Date()): { week: number; season: number } {
  const year = date.getFullYear();
  const sept1 = new Date(year, 8, 1);
  const firstThursday = new Date(sept1);
  while (firstThursday.getDay() !== 4) {
    firstThursday.setDate(firstThursday.getDate() + 1);
  }
  if (date < firstThursday) {
    return { week: 0, season: year };
  }
  const diffMs = date.getTime() - firstThursday.getTime();
  const week = Math.min(18, Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1));
  return { week, season: year };
}

export async function resolveNflWeek(): Promise<{ week: number; season: number }> {
  try {
    const state = await fetchNflState();
    if (state) {
      const week = state.week ?? state.display_week ?? 0;
      return {
        week,
        season: Number(state.season ?? state.league_season ?? new Date().getFullYear()),
      };
    }
  } catch {
    // fallback
  }
  return deriveNflWeekFromDate();
}

export function isStartSitWindowOpen(now = new Date()): boolean {
  const et = new Date(
    now.toLocaleString('en-US', { timeZone: 'America/New_York' }),
  );
  const day = et.getDay();
  const hour = et.getHours();
  const minute = et.getMinutes();
  if (day === 0 && (hour > 13 || (hour === 13 && minute >= 0))) return false;
  return true;
}

export function nextLockDeadlineLabel(): string {
  return 'Sun 1:00 PM ET';
}

export async function fetchWeekOpponents(
  season: number,
  week: number,
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  try {
    const res = await fetch(
      `https://api.sleeper.app/v1/schedule/nfl/regular/${season}/${week}`,
      { cache: 'no-store' },
    );
    if (!res.ok) return map;
    const games = (await res.json()) as Array<{
      home?: string;
      away?: string;
    }>;
    for (const g of games ?? []) {
      if (g.home && g.away) {
        map[g.home] = g.away;
        map[g.away] = `@${g.home}`;
      }
    }
  } catch (err) {
    console.error('[startsit] schedule fetch failed:', err);
  }
  return map;
}
