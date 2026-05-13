/**
 * SOSPP (Strength of Schedule Per Position) — remaining schedule difficulty engine.
 *
 * Formula:
 *   SOSPP = avg(defenseRankToMatchupGrade(opponentRank)) over upcoming N weeks
 *
 * Score 0-100 where 100 = softest remaining schedule.
 * Tiers: ELITE (≥80) | FAVORABLE (65-79) | NEUTRAL (48-64) | DIFFICULT (32-47) | BRUTAL (<32)
 *
 * Usage: dynasty buy/sell signal. Favorable SOS ahead → buy window. Brutal SOS → sell high.
 * Lookback capped at 8 weeks to stay within the current dynasty window.
 */

import {
  getPassDefenseRank,
  getRushDefenseRank,
  defenseRankToMatchupGrade,
} from '@/lib/external/matchups';

// ─── Public types ─────────────────────────────────────────────────────────────

export type SOSPPTier = 'ELITE' | 'FAVORABLE' | 'NEUTRAL' | 'DIFFICULT' | 'BRUTAL';

export interface SOSPPInput {
  position: 'QB' | 'RB' | 'WR' | 'TE';
  /** Ordered list of upcoming opponent team abbreviations (max 8 weeks analyzed). */
  upcomingOpponents: string[];
}

export interface SOSPPResult {
  sospp_score: number;
  sospp_tier: SOSPPTier;
  /** Mean opponent defensive rank across analyzed weeks (1=toughest, 32=softest). */
  avg_opponent_rank: number;
  weeks_analyzed: number;
  flags: string[];
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function tierFromScore(score: number): SOSPPTier {
  if (score >= 80) return 'ELITE';
  if (score >= 65) return 'FAVORABLE';
  if (score >= 48) return 'NEUTRAL';
  if (score >= 32) return 'DIFFICULT';
  return 'BRUTAL';
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateSOSPP(input: SOSPPInput): SOSPPResult {
  const opponents = input.upcomingOpponents.filter(Boolean).slice(0, 8);

  if (!opponents.length) {
    return {
      sospp_score: 50,
      sospp_tier: 'NEUTRAL',
      avg_opponent_rank: 16,
      weeks_analyzed: 0,
      flags: ['NO_SCHEDULE_DATA'],
    };
  }

  const isPassPos = ['QB', 'WR', 'TE'].includes(input.position.toUpperCase());

  const ranks = opponents.map((opp) =>
    isPassPos ? getPassDefenseRank(opp) : getRushDefenseRank(opp),
  );

  const avgRank = ranks.reduce((a, b) => a + b, 0) / ranks.length;
  const grades = ranks.map(defenseRankToMatchupGrade);
  const avgGrade = grades.reduce((a, b) => a + b, 0) / grades.length;

  const sospp_score = Math.round(clamp(avgGrade) * 10) / 10;
  const sospp_tier = tierFromScore(sospp_score);

  const flags: string[] = [];
  const eliteCount = ranks.filter((r) => r <= 5).length;
  const softCount = ranks.filter((r) => r >= 25).length;

  if (eliteCount >= 3) flags.push('BRUTAL_RUN_OF_DEFENSES');
  if (softCount >= 3) flags.push('ELITE_STRETCH_AHEAD');
  if (avgRank <= 8) flags.push('TOUGH_SCHEDULE_BLOCK');
  if (avgRank >= 24) flags.push('SOFT_SCHEDULE_BLOCK');

  return {
    sospp_score,
    sospp_tier,
    avg_opponent_rank: Math.round(avgRank * 10) / 10,
    weeks_analyzed: opponents.length,
    flags,
  };
}
