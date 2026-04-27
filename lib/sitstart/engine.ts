import { getProjections, type PlayerProjection } from '@/lib/external/fantasyPros';
import { fetchGameWeather, type GameWeather } from '@/lib/external/weather';
import { getMatchupScore, fetchWeekMatchups } from '@/lib/external/matchups';

export type Recommendation = 'START' | 'SIT' | 'FLEX';

export interface LineupRecommendation {
  player_id: string;
  player_name: string;
  position: string;
  team: string | null;
  recommendation: Recommendation;
  projected_points: number;
  composite_score: number;
  explanation: string;
  weather: GameWeather | null;
  matchup_label: string;
}

interface RosterPlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

function makeExplanation(
  proj: PlayerProjection | undefined,
  weather: GameWeather | null,
  matchup: { label: string },
  rec: Recommendation
): string {
  const parts: string[] = [];

  if (proj) parts.push(`Projected ${proj.projected_points.toFixed(1)} pts`);
  if (matchup.label === 'Favorable') parts.push('favorable matchup');
  if (matchup.label === 'Tough') parts.push('tough matchup');
  if (weather && !weather.is_dome && weather.wind_mph > 20) parts.push(`high winds (${weather.wind_mph} mph)`);
  if (weather && !weather.is_dome && weather.precip_chance > 60) parts.push(`${weather.precip_chance}% precip chance`);

  if (!parts.length) return rec === 'START' ? 'Strong starter' : rec === 'SIT' ? 'Recommend sitting' : 'Borderline — flex with caution';
  return parts.join(', ') + '.';
}

export async function generateLineupRecommendations(
  roster: RosterPlayer[],
  league: { scoring_settings: Record<string, number> | null },
  week: number
): Promise<LineupRecommendation[]> {
  const season = '2025';
  const positions = ['QB', 'RB', 'WR', 'TE', 'K'];
  const scoringPPR = (league.scoring_settings?.rec ?? 0) >= 1;

  // Fetch projections and matchups in parallel
  const [projectionArrays, matchups] = await Promise.all([
    Promise.all(positions.map((pos) => getProjections(week, pos))),
    fetchWeekMatchups(season, week),
  ]);

  const projMap: Record<string, PlayerProjection> = {};
  for (const arr of projectionArrays) {
    for (const p of arr) {
      projMap[p.player_name.toLowerCase()] = p;
    }
  }

  // Build opponent map from matchups
  const opponentMap: Record<string, string> = {};
  for (const m of matchups) {
    opponentMap[m.home_team] = m.away_team;
    opponentMap[m.away_team] = m.home_team;
  }

  const starters = roster.filter((p) =>
    ['QB', 'RB', 'WR', 'TE', 'K'].includes(p.position?.toUpperCase() ?? '')
  );

  const recs = await Promise.all(
    starters.map(async (player): Promise<LineupRecommendation> => {
      const proj = projMap[player.full_name.toLowerCase()];
      const projPts = proj?.projected_points ?? 0;
      const opponent = player.team ? opponentMap[player.team] ?? null : null;
      const matchup = opponent
        ? getMatchupScore(player.team!, opponent, player.position)
        : { rank: 16, label: 'Average' };

      const weather =
        player.team && opponent
          ? await fetchGameWeather(player.team, new Date().toISOString()).catch(() => null)
          : null;

      // Composite score: projection + matchup bonus + weather penalty
      let composite = projPts;
      if (matchup.label === 'Favorable') composite += scoringPPR && ['WR', 'TE'].includes(player.position) ? 3 : 2;
      if (matchup.label === 'Tough') composite -= 2;
      if (weather && !weather.is_dome && weather.wind_mph > 20) composite -= 3;
      if (weather && !weather.is_dome && weather.precip_chance > 60) composite -= 1;
      if (player.injury_status === 'Q') composite -= 4;
      if (player.injury_status === 'D' || player.injury_status === 'O') composite -= 20;

      const position = player.position.toUpperCase();
      const thresholds: Record<string, [number, number]> = {
        QB: [18, 14], RB: [12, 8], WR: [10, 7], TE: [8, 5], K: [8, 6],
      };
      const [startThresh, sitThresh] = thresholds[position] ?? [10, 7];
      const recommendation: Recommendation =
        composite >= startThresh ? 'START' : composite <= sitThresh ? 'SIT' : 'FLEX';

      return {
        player_id: player.player_id,
        player_name: player.full_name,
        position: player.position,
        team: player.team,
        recommendation,
        projected_points: projPts,
        composite_score: Math.round(composite * 10) / 10,
        explanation: makeExplanation(proj, weather, matchup, recommendation),
        weather,
        matchup_label: matchup.label,
      };
    })
  );

  return recs.sort((a, b) => b.composite_score - a.composite_score);
}
