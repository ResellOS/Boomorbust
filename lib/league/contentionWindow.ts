/**
 * Contention window calculator — determines where a team sits in its dynasty lifecycle.
 */

import { createAdminClient } from '@/lib/supabase/admin';

export type ContentionStatus = 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING';

export interface ContentionWindow {
  status: ContentionStatus;
  peakYears: string;
  teamRank: string;
  projectedFinish: string;
  titlesOdds: string;
  tradeDeadlineAdvice: string;
}

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export async function getContentionWindow(
  userId: string,
  leagueId: string,
): Promise<ContentionWindow> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear();

  // Get roster for this user in this league
  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  const sleeperUserId = (profile as { sleeper_user_id?: string } | null)?.sleeper_user_id;

  const { data: roster } = await supabase
    .from('rosters')
    .select('players, owner_id')
    .eq('league_id', leagueId)
    .eq('owner_id', sleeperUserId ?? userId)
    .maybeSingle();

  const playerIds = ((roster as { players?: string[] | null } | null)?.players ?? []) as string[];

  // Count all rosters in league to determine rank
  const { count: leagueSize } = await supabase
    .from('rosters')
    .select('*', { count: 'exact', head: true })
    .eq('league_id', leagueId);

  const totalTeams = leagueSize ?? 12;

  if (!playerIds.length) {
    return {
      status: 'REBUILDING',
      peakYears: `${currentYear + 2}-${currentYear + 4}`,
      teamRank: `—/${totalTeams}`,
      projectedFinish: 'Bottom Third',
      titlesOdds: '< 5%',
      tradeDeadlineAdvice: 'Stack picks and youth. Sell aging assets.',
    };
  }

  // Load BVI scores for top 8 skill players
  const { data: pvRows } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, tfo_score')
    .in('player_id', playerIds)
    .order('bvi_score', { ascending: false })
    .limit(8);

  type PvRow = { player_id: string; bvi_score: number; tfo_score: number };
  const pv = (pvRows ?? []) as PvRow[];

  const avgBvi = pv.length
    ? pv.reduce((s, r) => s + (r.bvi_score ?? 0), 0) / pv.length
    : 50;

  // Load DMS average from tfo_cache
  const { data: dmsRows } = await supabase
    .from('tfo_cache')
    .select('dms_score')
    .in('player_id', playerIds)
    .order('calculated_at', { ascending: false })
    .limit(8);

  type DmsRow = { dms_score: number | null };
  const dmsScores = ((dmsRows ?? []) as DmsRow[])
    .map((r) => r.dms_score ?? 0)
    .filter((s) => s > 0);

  const avgDms = dmsScores.length
    ? dmsScores.reduce((a, b) => a + b, 0) / dmsScores.length
    : 50;

  // League-wide BVI comparison: get all rosters' avg BVI
  const { data: allPvRows } = await supabase
    .from('player_values')
    .select('bvi_score')
    .order('bvi_score', { ascending: false })
    .limit(totalTeams * 8);

  type BviRow = { bvi_score: number };
  const allBvi = ((allPvRows ?? []) as BviRow[]).map((r) => r.bvi_score ?? 0).sort((a, b) => b - a);

  // Estimate team rank based on where avgBvi falls in the league-wide distribution
  const leagueMeanBvi = allBvi.length ? allBvi.reduce((a, b) => a + b, 0) / allBvi.length : 50;
  const relativeStrength = clamp((avgBvi / (leagueMeanBvi || 1)) * 50);

  const estimatedRank = Math.max(
    1,
    Math.min(totalTeams, Math.round(totalTeams - (relativeStrength / 100) * totalTeams) + 1),
  );

  // Determine status
  let status: ContentionStatus;
  if (avgBvi >= 65 && avgDms >= 55) {
    status = 'CONTENDING';
  } else if (avgBvi < 45) {
    status = 'REBUILDING';
  } else {
    status = 'TRANSITIONING';
  }

  // Build output strings
  const peakStart =
    status === 'CONTENDING' ? currentYear
    : status === 'TRANSITIONING' ? currentYear + 1
    : currentYear + 2;

  const peakEnd = peakStart + (status === 'REBUILDING' ? 3 : 2);
  const peakYears = `${peakStart}–${peakEnd}`;

  const projectedFinish =
    estimatedRank <= Math.ceil(totalTeams * 0.25)
      ? 'Top 3'
      : estimatedRank <= Math.ceil(totalTeams * 0.5)
        ? 'Playoff Contender'
        : estimatedRank <= Math.ceil(totalTeams * 0.75)
          ? 'Middle of Pack'
          : 'Bottom Third';

  const titlePct =
    status === 'CONTENDING' && estimatedRank === 1 ? '45%'
    : status === 'CONTENDING' && estimatedRank <= 3 ? '30%'
    : status === 'CONTENDING' ? '18%'
    : status === 'TRANSITIONING' ? '10%'
    : '< 5%';

  const advice =
    status === 'CONTENDING'
      ? 'You are in win-now mode. Sell youth for proven producers at the deadline.'
      : status === 'TRANSITIONING'
        ? 'Selective trades only. Protect your ascending core while identifying sell-high targets.'
        : 'Stack draft capital and youth. Sell aging veterans with expiring value.';

  return {
    status,
    peakYears,
    teamRank: `${estimatedRank}/${totalTeams}`,
    projectedFinish,
    titlesOdds: titlePct,
    tradeDeadlineAdvice: advice,
  };
}
