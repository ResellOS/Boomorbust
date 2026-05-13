/**
 * Nightly TFO cache refresh.
 * Iterates all players in bbv_values, recalculates TFO score,
 * and upserts into tfo_cache for all scoring types.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateTFOScore, type CalculateTFOScoreInput } from '@/lib/tfo/formula';
import type { BVIScoringType } from '@/lib/bvi/engine';
import { calculateDMS, type DMSTier } from '@/lib/dms/engine';
import { fetchWeekMatchups } from '@/lib/external/matchups';

const SCORING_TYPES: BVIScoringType[] = ['ppr', 'half_ppr', 'standard', 'superflex'];

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Build team → opponent map for this week's matchups (empty during off-season — handled gracefully)
  const currentSeason = String(new Date().getFullYear());
  const currentWeek = Math.max(1, Math.min(18, Math.ceil((Date.now() - new Date(`${currentSeason}-09-01`).getTime()) / (7 * 24 * 60 * 60 * 1000))));
  const weekMatchups = await fetchWeekMatchups(currentSeason, currentWeek);

  const teamOpponentMap = new Map<string, string>();
  const teamHomeMap = new Map<string, boolean>();
  for (const game of weekMatchups) {
    if (game.home_team && game.away_team) {
      teamOpponentMap.set(game.home_team, game.away_team);
      teamOpponentMap.set(game.away_team, game.home_team);
      teamHomeMap.set(game.home_team, true);
      teamHomeMap.set(game.away_team, false);
    }
  }

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

    // Compute DMS once per player (matchup doesn't vary by scoring type)
    let dms_score = 0;
    let dms_tier: DMSTier = 'STABLE';
    const playerTeam = (player.team as string) ?? '';
    const opponentTeam = playerTeam ? teamOpponentMap.get(playerTeam) : undefined;

    if (opponentTeam) {
      try {
        const dmsResult = calculateDMS({
          position: position as CalculateTFOScoreInput['position'],
          playerTeam,
          opponentTeam,
          isHome: teamHomeMap.get(playerTeam),
        });
        dms_score = dmsResult.dms_score;
        dms_tier = dmsResult.dms_tier;
      } catch {
        // DMS inputs unavailable — leave defaults (0 / 'STABLE')
      }
    }

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
            dms_score,
            dms_tier,
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
