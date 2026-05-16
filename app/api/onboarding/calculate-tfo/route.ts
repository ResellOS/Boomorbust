/**
 * POST /api/onboarding/calculate-tfo
 * Pre-warms TFO scores for all of a new user's rostered players.
 * Uses upsert_tfo_cache() stored procedure which handles the partial-index
 * conflict: ON CONFLICT (player_id, scoring_type) WHERE league_id IS NULL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateTFOScore } from '@/lib/tfo/formula';

const SCORING_TYPES = ['ppr', 'half_ppr', 'standard'] as const;

function deriveGrade(score: number): string {
  if (score >= 75) return 'A';
  if (score >= 60) return 'B';
  if (score >= 45) return 'C';
  return 'D';
}

function deriveVerdict(score: number): string {
  if (score >= 75) return 'BOOM';
  if (score >= 60) return 'LEAN_BOOM';
  if (score >= 45) return 'NEUTRAL';
  if (score >= 30) return 'LEAN_BUST';
  return 'BUST';
}

export async function POST(_request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createAdminClient();

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
  let upsertErrors = 0;
  const loggedErrors: string[] = [];

  const ids = Array.from(playerIds).filter((pid) => {
    const p = allPlayers[pid] as { position?: string } | undefined;
    return p && SKILL.has((p.position ?? '').toUpperCase());
  });

  const batchSize = 10;

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

          const tfoResult = calculateTFOScore({
            playerId: pid,
            position,
            age: raw.age ?? 25,
            team: raw.team ?? 'FA',
            ocScheme: 'default',
            opportunityScore: 50 + (ktcValue / 9500) * 40,
            olGrade: 60,
            wrCastGrade: 60,
            redZoneShare: 8,
            ktcValue,
          });

          const score = tfoResult.tfoScore;
          const grade = tfoResult.grade || deriveGrade(score);
          const verdict = tfoResult.verdict || deriveVerdict(score);
          const now = new Date().toISOString();

          for (const scoringType of SCORING_TYPES) {
            const { error } = await db.rpc('upsert_tfo_cache', {
              p_player_id: pid,
              p_scoring_type: scoringType,
              p_tfo_score: score,
              p_ops_score: 50,
              p_sfs_score: 50,
              p_ffig_score: 50,
              p_sit_score: 50,
              p_irs_score: 50,
              p_grade: grade,
              p_verdict: verdict,
              p_calculated_at: now,
            });

            if (error) {
              upsertErrors++;
              loggedErrors.push(`${pid}/${scoringType}: ${error.message}`);
              void db.from('error_logs').insert({
                source: 'tfo-upsert',
                message: error.message,
                user_id: user.id,
                metadata: { player_id: pid, scoring_type: scoringType, code: error.code },
              });
            } else {
              calculated++;
            }
          }
        } catch (err) {
          const msg = String(err);
          loggedErrors.push(`${pid}: ${msg}`);
          void db.from('error_logs').insert({
            source: 'tfo-upsert',
            message: msg,
            user_id: user.id,
            metadata: { player_id: pid },
          });
        }
      }),
    );
  }

  return NextResponse.json({
    calculated,
    upsert_errors: upsertErrors,
    total: ids.length * SCORING_TYPES.length,
    players: ids.length,
    errors: loggedErrors.slice(0, 10),
    message: `Pre-warmed TFO scores for ${ids.length} players × ${SCORING_TYPES.length} scoring types`,
  });
}
