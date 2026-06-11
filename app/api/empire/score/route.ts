import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function resolveGrade(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 78) return 'Elite';
  if (score >= 68) return 'High Value';
  if (score >= 55) return 'Viable';
  return 'Speculative';
}

function seededFloat(seed: string, index: number): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i) + index * 31;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

function fallbackScore(userId: string, leagueCount: number): number {
  const base       = 55;
  const leaguePts  = Math.min(leagueCount * 2.5, 20);
  const activityPts = seededFloat(userId, 0) * 25;
  return Math.min(99.9, Math.max(40, parseFloat((base + leaguePts + activityPts).toFixed(1))));
}

export async function GET() {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get sleeper_user_id for roster matching
  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;

  // Get user's leagues
  const { data: leagueRows } = await supabase
    .from('leagues')
    .select('id')
    .eq('user_id', user.id);

  const leagueIds = (leagueRows ?? []).map((l) => String(l.id));

  let score: number;
  const tfoScores: number[] = [];

  if (sleeperUserId && leagueIds.length > 0) {
    // Get all roster player IDs for this user
    const { data: rosters } = await supabase
      .from('rosters')
      .select('players')
      .in('league_id', leagueIds)
      .eq('owner_id', sleeperUserId);

    const playerIds = new Set<string>();
    for (const roster of rosters ?? []) {
      for (const pid of (roster.players as string[] | null) ?? []) {
        playerIds.add(pid);
      }
    }

    if (playerIds.size > 0) {
      const { data: tfoRows } = await supabase
        .from('formula_scores')
        .select('tfo_score')
        .in('player_id', Array.from(playerIds))
        .not('tfo_score', 'is', null);

      for (const row of tfoRows ?? []) {
        const s = Number(row.tfo_score);
        if (Number.isFinite(s) && s > 0) tfoScores.push(s);
      }
    }
  }

  if (tfoScores.length > 0) {
    const avg = tfoScores.reduce((sum, s) => sum + s, 0) / tfoScores.length;
    score = Math.min(99.9, Math.max(40, parseFloat(avg.toFixed(1))));
  } else {
    score = fallbackScore(user.id, leagueIds.length);
  }

  const tier =
    score >= 85 ? 'ELITE'
    : score >= 70 ? 'HIGH VALUE'
    : score >= 55 ? 'VIABLE'
    : 'SPECULATIVE';

  const percentile =
    score >= 80 ? 'Top 10%'
    : score >= 65 ? 'Top 35%'
    : score >= 50 ? 'Top 65%'
    : 'Bottom 35%';

  const grade = resolveGrade(score);

  // Stable sparkline — 7 days trending to current score
  const sparklineData = Array.from({ length: 7 }, (_, i) => {
    const progress  = i / 6;
    const base      = score * (0.70 + progress * 0.30);
    const noise     = (seededFloat(user.id, i + 1) - 0.5) * 8;
    return parseFloat(Math.min(100, Math.max(20, base + noise)).toFixed(1));
  });

  return NextResponse.json({ score, grade, tier, percentile, sparklineData });
}
