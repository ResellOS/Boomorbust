import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── grade / percentile lookup ───────────────────────────────────────────────

interface GradeInfo {
  grade: string;
  percentile: string;
}

function resolveGrade(score: number): GradeInfo {
  if (score >= 90) return { grade: 'Elite',       percentile: 'Top 3%'  };
  if (score >= 78) return { grade: 'Elite',       percentile: 'Top 8%'  };
  if (score >= 68) return { grade: 'High Value',  percentile: 'Top 20%' };
  if (score >= 55) return { grade: 'Viable',      percentile: 'Top 35%' };
  return              { grade: 'Speculative', percentile: 'Top 50%' };
}

// ─── deterministic noise from userId ─────────────────────────────────────────
// Gives each user a stable "activity score" component (0–25) without touching
// live data that isn't built yet (KTC pipeline, TFO cache).

function seededFloat(seed: string, index: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i) + index * 31;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff; // 0..1
}

function buildScore(userId: string, leagueCount: number): number {
  // Base: 55 — average connected dynasty manager
  // League breadth: up to +20 (caps at 8 leagues)
  // Dynasty activity seed: up to +25 (stable per-user, changes each index)
  const base          = 55;
  const leaguePts     = Math.min(leagueCount * 2.5, 20);
  const activityPts   = seededFloat(userId, 0) * 25;
  const raw           = base + leaguePts + activityPts;
  return Math.min(99.9, Math.max(40, parseFloat(raw.toFixed(1))));
}

function buildSparkline(userId: string, score: number): number[] {
  // 7 weekly data points trending toward current score
  // Earlier weeks start lower and vary slightly
  return Array.from({ length: 7 }, (_, i) => {
    const progress  = i / 6;                                    // 0→1
    const trendBase = score * (0.70 + progress * 0.30);         // ramps to score
    const noise     = (seededFloat(userId, i + 1) - 0.5) * 8;  // ±4 jitter
    return parseFloat(Math.min(100, Math.max(20, trendBase + noise)).toFixed(1));
  });
}

// ─── route ───────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id')
    .eq('user_id', user.id);

  const leagueCount = leagues?.length ?? 0;
  const score       = buildScore(user.id, leagueCount);
  const sparkline   = buildSparkline(user.id, score);
  const { grade, percentile } = resolveGrade(score);

  return NextResponse.json({ score, grade, percentile, sparklineData: sparkline });
}
