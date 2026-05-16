import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calcHandcuffScore,
  handcuffRecommendation,
  handcuffReasoning,
} from '@/lib/handcuff/engine';
import type { HandcuffAnalysis } from '@/lib/handcuff/engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const db = createAdminClient();

  // 1. Get sleeper_user_id
  const { data: profile } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
  if (!sleeperUserId) return NextResponse.json({ handcuffs: [] });

  // 2. Get user's leagues
  let leagueIds: string[] = [];
  if (leagueId) {
    leagueIds = [leagueId];
  } else {
    const { data: leagues } = await db
      .from('leagues')
      .select('id')
      .eq('user_id', user.id);
    leagueIds = (leagues ?? []).map((l) => String(l.id));
  }

  if (leagueIds.length === 0) return NextResponse.json({ handcuffs: [] });

  // 3. Collect all rostered player IDs across leagues
  const { data: rosters } = await db
    .from('rosters')
    .select('players')
    .in('league_id', leagueIds)
    .eq('owner_id', sleeperUserId);

  const rosteredIds = new Set<string>();
  for (const r of rosters ?? []) {
    for (const pid of (r.players as string[] | null) ?? []) rosteredIds.add(pid);
  }

  if (rosteredIds.size === 0) return NextResponse.json({ handcuffs: [] });

  // 4. Find elite RBs (TFO > 70) on user's roster
  const { data: tfoRows } = await db
    .from('tfo_cache')
    .select('player_id, tfo_score')
    .in('player_id', Array.from(rosteredIds))
    .eq('scoring_type', 'ppr')
    .gte('tfo_score', 70)
    .not('tfo_score', 'is', null);

  const eliteRbIds = (tfoRows ?? []).map((r) => String(r.player_id));
  if (eliteRbIds.length === 0) return NextResponse.json({ handcuffs: [] });

  // 5. Get player details (name, team, injury_status) for elite RBs
  const { data: elitePlayers } = await db
    .from('players')
    .select('player_id, full_name, position, team, injury_status, depth_chart_order')
    .in('player_id', eliteRbIds)
    .eq('position', 'RB');

  if (!elitePlayers?.length) return NextResponse.json({ handcuffs: [] });

  // TFO lookup map
  const tfoMap = new Map<string, number>(
    (tfoRows ?? []).map((r) => [String(r.player_id), Number(r.tfo_score)])
  );

  const handcuffs: HandcuffAnalysis[] = [];

  for (const starter of elitePlayers) {
    if (!starter.team) continue;

    // 6. Find backup RBs on same team
    const { data: teamRbs } = await db
      .from('players')
      .select('player_id, full_name, depth_chart_order, injury_status')
      .eq('position', 'RB')
      .eq('team', starter.team)
      .neq('player_id', starter.player_id)
      .order('depth_chart_order', { ascending: true, nullsFirst: false });

    if (!teamRbs?.length) continue;

    // Pick the best handcuff candidate: prefer depth_chart_order 2, then by TFO
    const backupPlayer = teamRbs[0];
    if (!backupPlayer) continue;

    // 7. Get backup TFO score
    let backupTfo = tfoMap.get(backupPlayer.player_id) ?? null;
    if (backupTfo === null) {
      const { data: backupTfoRow } = await db
        .from('tfo_cache')
        .select('tfo_score')
        .eq('player_id', backupPlayer.player_id)
        .eq('scoring_type', 'ppr')
        .maybeSingle();
      backupTfo = backupTfoRow?.tfo_score != null ? Number(backupTfoRow.tfo_score) : 35;
    }

    const userOwnsHandcuff = rosteredIds.has(backupPlayer.player_id);
    const starterTfo = tfoMap.get(starter.player_id) ?? 75;
    const score = calcHandcuffScore(starterTfo, starter.injury_status as string | null, backupTfo);
    const recommendation = handcuffRecommendation(score);
    const reasoning = handcuffReasoning(
      starter.full_name ?? 'Starter',
      backupPlayer.full_name ?? null,
      score,
      userOwnsHandcuff,
      starter.injury_status as string | null,
    );

    handcuffs.push({
      starter: {
        player_id: String(starter.player_id),
        full_name: starter.full_name ?? 'Unknown',
        tfo_score: starterTfo,
        team: starter.team,
      },
      handcuff: {
        player_id: String(backupPlayer.player_id),
        full_name: backupPlayer.full_name ?? 'Unknown',
        tfo_score: backupTfo,
      },
      handcuff_score: score,
      user_owns_handcuff: userOwnsHandcuff,
      recommendation,
      reasoning,
    });
  }

  // Sort: unowned MUST OWN first, then by handcuff_score desc
  handcuffs.sort((a, b) => {
    if (!a.user_owns_handcuff && b.user_owns_handcuff) return -1;
    if (a.user_owns_handcuff && !b.user_owns_handcuff) return 1;
    return b.handcuff_score - a.handcuff_score;
  });

  return NextResponse.json({ handcuffs });
}
