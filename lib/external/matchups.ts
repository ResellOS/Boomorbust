const SLEEPER_BASE = 'https://api.sleeper.app/v1';

export interface NFLMatchup {
  home_team: string;
  away_team: string;
  game_time: string;
}

// 2024 DVOA by position (pass defense rank, lower = harder matchup for offense)
// Source: approximated from 2024 season data — update annually
const DVOA_PASS_DEF: Record<string, number> = {
  SF: 1, BUF: 2, BAL: 3, DAL: 4, MIA: 5, KC: 6, PIT: 7, GB: 8,
  CLE: 9, NYJ: 10, LAR: 11, NO: 12, DET: 13, MIN: 14, PHI: 15, SEA: 16,
  IND: 17, TB: 18, DEN: 19, NE: 20, TEN: 21, CAR: 22, CIN: 23, CHI: 24,
  ARI: 25, LV: 26, NYG: 27, JAX: 28, WAS: 29, ATL: 30, HOU: 31, LAC: 32,
};

const DVOA_RUSH_DEF: Record<string, number> = {
  SF: 1, DET: 2, MIA: 3, PHI: 4, NYJ: 5, BAL: 6, KC: 7, CLE: 8,
  BUF: 9, HOU: 10, TEN: 11, WAS: 12, NO: 13, GB: 14, SEA: 15, MIN: 16,
  PIT: 17, LAR: 18, TB: 19, LAC: 20, NE: 21, IND: 22, CAR: 23, DEN: 24,
  ARI: 25, JAX: 26, CIN: 27, ATL: 28, DAL: 29, NYG: 30, CHI: 31, LV: 32,
};

export async function fetchWeekMatchups(season: string, week: number): Promise<NFLMatchup[]> {
  try {
    const res = await fetch(`${SLEEPER_BASE}/schedule/nfl/regular/${season}/${week}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((game: Record<string, unknown>) => ({
      home_team: String(game.home_team ?? ''),
      away_team: String(game.away_team ?? ''),
      game_time: String(game.game_time ?? game.date ?? ''),
    }));
  } catch {
    return [];
  }
}

export function getPassDefenseRank(team: string): number {
  return DVOA_PASS_DEF[team] ?? 16;
}

export function getRushDefenseRank(team: string): number {
  return DVOA_RUSH_DEF[team] ?? 16;
}

// Returns a matchup difficulty score: 1-32 where lower = tougher matchup for skill positions
export function getMatchupScore(
  player_team: string,
  opponent_team: string,
  position: string
): { rank: number; label: string } {
  const isSkillPos = ['QB', 'WR', 'TE'].includes(position.toUpperCase());
  const rank = isSkillPos
    ? getPassDefenseRank(opponent_team)
    : getRushDefenseRank(opponent_team);

  const label = rank <= 8 ? 'Tough' : rank <= 20 ? 'Average' : 'Favorable';
  return { rank, label };
}
