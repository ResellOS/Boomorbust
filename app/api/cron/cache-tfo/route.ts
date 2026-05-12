/**
 * Nightly TFO cache refresh.
 * Iterates all players in bbv_values, recalculates TFO score,
 * and upserts into tfo_cache for all scoring types.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateTFOScore, type CalculateTFOScoreInput } from '@/lib/tfo/formula';
import type { BVIScoringType } from '@/lib/bvi/engine';

const SCORING_TYPES: BVIScoringType[] = ['ppr', 'half_ppr', 'standard', 'superflex'];

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Pull all players with enough data to compute TFO
  const { data: players } = await supabase
    .from('bbv_values')
    .select(
      'player_id, position, age, team, oc_scheme, opportunity_score, ol_grade, wr_cast_grade, red_zone_share, ktc_value, weekly_ppg, snap_share, target_share, oc_year',
    );

  if (!players || players.length === 0) {
    return NextResponse.json({ cached: 0 });
  }

  let cached = 0;
  let errors = 0;

  for (const player of players as Array<Record<string, unknown>>) {
    const playerId = player.player_id as string;
    const position = (player.position as string | null) ?? 'WR';

    if (!['QB', 'RB', 'WR', 'TE'].includes(position)) continue;

    const tfoInput: CalculateTFOScoreInput = {
      playerId,
      position: position as CalculateTFOScoreInput['position'],
      age: (player.age as number) ?? 26,
      team: (player.team as string) ?? '',
      ocScheme: (player.oc_scheme as string) ?? 'default',
      opportunityScore: (player.opportunity_score as number) ?? 50,
      olGrade: (player.ol_grade as number) ?? 50,
      wrCastGrade: (player.wr_cast_grade as number) ?? 50,
      redZoneShare: (player.red_zone_share as number) ?? 10,
      ktcValue: (player.ktc_value as number) ?? 0,
      weeklyPPG: (player.weekly_ppg as number | undefined),
      snapShare: (player.snap_share as number | undefined),
      targetShare: (player.target_share as number | undefined),
      ocYear: (player.oc_year as number | undefined),
    };

    for (const scoringType of SCORING_TYPES) {
      try {
        const result = calculateTFOScore(tfoInput);

        await supabase.from('tfo_cache').upsert(
          {
            player_id: playerId,
            scoring_type: scoringType,
            tfo_score: result.tfoScore,
            grade: result.grade,
            verdict: result.verdict,
            flags: result.flags,
            calculated_at: new Date().toISOString(),
          },
          { onConflict: 'player_id,scoring_type' },
        );

        cached++;
      } catch {
        errors++;
      }
    }
  }

  return NextResponse.json({
    cached,
    errors,
    players: players.length,
    scoring_types: SCORING_TYPES.length,
  });
}
