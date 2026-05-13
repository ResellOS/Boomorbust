/**
 * POST /api/onboarding/calculate-tfo
 * Called immediately after Sleeper league sync completes for a new user.
 * Pre-warms TFO scores for all rostered players so the dashboard
 * isn't empty on first load.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateTFOScore } from '@/lib/tfo/formula';

export async function POST(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();

  // Get all rosters for this user
  const { data: profile } = await db
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.sleeper_user_id) {
    return NextResponse.json({ error: 'No Sleeper account linked' }, { status: 400 });
  }

  const { data: rosters } = await db
    .from('rosters')
    .select('players, league_id')
    .eq('owner_id', profile.sleeper_user_id);

  if (!rosters?.length) {
    return NextResponse.json({ calculated: 0, message: 'No rosters found' });
  }

  // Collect unique player IDs
  const playerIds = new Set<string>();
  for (const r of rosters as { players: string[] | null; league_id: string }[]) {
    for (const pid of r.players ?? []) {
      if (pid) playerIds.add(pid);
    }
  }

  if (playerIds.size === 0) {
    return NextResponse.json({ calculated: 0, message: 'No players on rosters' });
  }

  const [allPlayers, ktcList] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!allPlayers) {
    return NextResponse.json({ error: 'Player data unavailable' }, { status: 503 });
  }

  const ktcByName = new Map<string, number>();
  for (const k of ktcList ?? []) {
    if (k.player_name) ktcByName.set(k.player_name.toLowerCase(), k.ktc_value);
  }

  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  let calculated = 0;
  const errors: string[] = [];
  const batchSize = 10;
  const ids = Array.from(playerIds).filter((pid) => {
    const p = allPlayers[pid] as { position?: string } | undefined;
    return p && SKILL.has((p.position ?? '').toUpperCase());
  });

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (pid) => {
        try {
          const raw = allPlayers[pid] as {
            full_name?: string;
            position?: string;
            team?: string;
            age?: number;
          };
          if (!raw?.full_name) return;

          const position = (raw.position ?? 'WR').toUpperCase() as 'QB' | 'RB' | 'WR' | 'TE';
          const ktcValue = ktcByName.get(raw.full_name.toLowerCase()) ?? 0;
          const age = raw.age ?? 25;
          const team = raw.team ?? 'FA';

          const tfoResult = calculateTFOScore({
            playerId: pid,
            position,
            age,
            team,
            ocScheme: 'default',
            opportunityScore: 50 + (ktcValue / 9500) * 40,
            olGrade: 60,
            wrCastGrade: 60,
            redZoneShare: 8,
            ktcValue,
          });

          const now = new Date().toISOString();
          await db.from('tfo_cache').upsert(
            {
              player_id: pid,
              tfo_score: tfoResult.tfoScore,
              grade: tfoResult.grade,
              verdict: tfoResult.verdict,
              calculated_at: now,
            },
            { onConflict: 'player_id' },
          );
          calculated++;
        } catch (err) {
          errors.push(`${pid}: ${String(err)}`);
        }
      }),
    );
  }

  return NextResponse.json({
    calculated,
    total: ids.length,
    errors: errors.slice(0, 10),
    message: `Pre-warmed TFO scores for ${calculated}/${ids.length} players`,
  });
}
