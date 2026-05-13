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

      await db.from('tfo_cache').upsert(
        {
          player_id: pid,
          tfo_score: result.tfoScore,
          grade: result.grade,
          verdict: result.verdict,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: 'player_id' },
      );
      calculated++;
    } catch { /* skip individual failures */ }
  }

  return NextResponse.json({ ok: true, calculated, total: playerIds.size });
}
