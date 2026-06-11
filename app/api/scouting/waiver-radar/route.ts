import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { WaiverRadarRow } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

type WaiverPriority = 'HIGH' | 'MEDIUM' | 'LOW';

function priorityFromScore(score: number): WaiverPriority {
  if (score >= 80) return 'HIGH';
  if (score >= 65) return 'MEDIUM';
  return 'LOW';
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId') ?? 'all';

  const adminSupabase = createAdminClient();

  // Get sleeper_user_id to find rostered player IDs
  const { data: profile } = await adminSupabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;

  // Get user's leagues
  const { data: leagues } = await adminSupabase
    .from('leagues')
    .select('id')
    .eq('user_id', user.id);

  const leagueIds = (leagues ?? []).map((l) => String(l.id));
  const filterLeagueIds = leagueId !== 'all' && leagueId ? [leagueId] : leagueIds;

  // Collect player IDs already on user's rosters
  const rosteredIds = new Set<string>();
  if (sleeperUserId && filterLeagueIds.length > 0) {
    const { data: rosters } = await adminSupabase
      .from('rosters')
      .select('players')
      .in('league_id', filterLeagueIds)
      .eq('owner_id', sleeperUserId);

    for (const r of rosters ?? []) {
      for (const pid of (r.players as string[] | null) ?? []) {
        rosteredIds.add(pid);
      }
    }
  }

  // Pull players with TFO scores, excluding already-rostered players
  const { data: tfoRows } = await adminSupabase
    .from('formula_scores')
    .select('player_id, tfo_score, verdict')
    .not('tfo_score', 'is', null)
    .order('tfo_score', { ascending: false })
    .limit(200);

  const candidates = (tfoRows ?? []).filter((r) => !rosteredIds.has(String(r.player_id)));

  if (candidates.length === 0) {
    // Fallback: return empty rows — no player data seeded yet
    return NextResponse.json({ leagueId, rows: [] as WaiverRadarRow[] });
  }

  // Fetch player details for the top candidates
  const topIds = candidates.slice(0, 30).map((r) => String(r.player_id));
  const { data: playerRows } = await adminSupabase
    .from('players')
    .select('id, full_name, position, team')
    .in('id', topIds);

  const playerMap = new Map(
    (playerRows ?? []).map((p) => [String(p.id), p])
  );

  const rows: WaiverRadarRow[] = candidates
    .slice(0, 20)
    .map((r, idx) => {
      const player = playerMap.get(String(r.player_id));
      const tfoScore = Number(r.tfo_score ?? 50);
      const opportunityScore = Math.round(Math.min(99, Math.max(40, tfoScore)));
      const priority = priorityFromScore(opportunityScore);
      const verdict = String(r.verdict ?? '').toUpperCase();
      const trendUp = verdict.includes('BOOM') || verdict.includes('LEAN_BOOM');
      // pctRostered estimated from score tier (no real roster % without Sleeper ownership API)
      const pctRostered = Math.max(2, Math.round(100 - opportunityScore * 0.8));
      const pctFaab = Math.max(1, Math.round(opportunityScore * 0.25));

      return {
        rank: idx + 1,
        playerName: player?.full_name ?? `Player ${String(r.player_id).slice(-4)}`,
        position: player?.position ?? 'WR',
        team: player?.team ?? '—',
        pctRostered,
        trendUp,
        pctFaab,
        priority,
        opportunityScore,
      };
    });

  return NextResponse.json({ leagueId, rows });
}
