/**
 * QStash-backed TFO calculation job for a single user.
 * Called by the queue rather than directly, so it doesn't time out on Vercel.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateTFOScore } from '@/lib/tfo/formula';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId: string };
  try {
    body = await request.json() as { userId: string };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId } = body;
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  const db = createAdminClient();

  const { data: profile } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  if (!(profile as { sleeper_user_id?: string } | null)?.sleeper_user_id) {
    return NextResponse.json({ ok: true, skipped: true, message: 'No sleeper account' });
  }

  const sleeperUserId = (profile as { sleeper_user_id: string }).sleeper_user_id;

  const { data: rosters } = await db
    .from('rosters')
    .select('players')
    .eq('owner_id', sleeperUserId);

  const playerIds = new Set<string>();
  for (const r of (rosters ?? []) as { players: string[] | null }[]) {
    for (const pid of r.players ?? []) {
      if (pid) playerIds.add(pid);
    }
  }

  if (playerIds.size === 0) {
    return NextResponse.json({ ok: true, calculated: 0 });
  }

  const [allPlayers, ktcList] = await Promise.all([fetchAllPlayers(), getKTCValues()]);
  if (!allPlayers) return NextResponse.json({ error: 'Player data unavailable' }, { status: 503 });

  const ktcByName = new Map<string, number>();
  for (const k of ktcList ?? []) {
    if (k.player_name) ktcByName.set(k.player_name.toLowerCase(), k.ktc_value);
  }

  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  let calculated = 0;

  for (const pid of Array.from(playerIds)) {
    const raw = allPlayers[pid] as { full_name?: string; position?: string; team?: string; age?: number } | undefined;
    if (!raw?.full_name) continue;
    const pos = (raw.position ?? '').toUpperCase();
    if (!SKILL.has(pos)) continue;

    try {
      const ktcValue = ktcByName.get(raw.full_name.toLowerCase()) ?? 0;
      const result = calculateTFOScore({
        playerId: pid,
        position: pos as 'QB' | 'RB' | 'WR' | 'TE',
        age: raw.age ?? 25,
        team: raw.team ?? 'FA',
        ocScheme: 'default',
        opportunityScore: 50 + (ktcValue / 9500) * 40,
        olGrade: 60,
        wrCastGrade: 60,
        redZoneShare: 8,
        ktcValue,
      });

      const now = new Date().toISOString();
      for (const scoringType of ['ppr', 'half_ppr', 'standard'] as const) {
        const { error } = await db.rpc('upsert_tfo_cache', {
          p_player_id: pid,
          p_scoring_type: scoringType,
          p_tfo_score: result.tfoScore,
          p_ops_score: 50,
          p_sfs_score: 50,
          p_ffig_score: 50,
          p_sit_score: 50,
          p_irs_score: 50,
          p_grade: result.grade,
          p_verdict: result.verdict,
          p_calculated_at: now,
        });
        if (!error) calculated++;
      }
    } catch { /* skip individual failures */ }
  }

  return NextResponse.json({ ok: true, calculated, total: playerIds.size });
}
