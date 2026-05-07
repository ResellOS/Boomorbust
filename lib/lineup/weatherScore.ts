import { fetchGameWeather, type GameWeather, DOME_TEAMS } from '@/lib/external/weather';

export type LineupWeather = {
  temp: number;
  condition: string;
  score: number;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** Game is played indoors when the home team’s venue is a dome / fixed roof. */
export function isDomeVenue(homeTeam: string): boolean {
  return DOME_TEAMS.has(homeTeam);
}

/**
 * Map OpenWeather-style payload + rules to 0–100 weatherScore.
 * API failure → score 75 (caller).
 */
export function weatherScoreFromObservation(gw: GameWeather, conditionLabel: string): LineupWeather {
  const heavyPrecip = gw.precip_chance >= 50;
  let score: number;
  if (gw.temp_f > 50 && !heavyPrecip) score = 85;
  else if (gw.temp_f >= 32 && gw.temp_f <= 50) score = 70;
  else if (gw.temp_f < 32) score = 55;
  else score = 70;

  if (heavyPrecip) score -= 15;

  const condition =
    heavyPrecip && gw.temp_f < 35 ? 'Snow' : heavyPrecip ? 'Rain' : conditionLabel;

  return {
    temp: gw.temp_f,
    condition,
    score: clamp(score, 25, 100),
  };
}

/**
 * Weather at game site (home stadium). Uses OPENWEATHER_API_KEY when set.
 */
export async function fetchLineupWeather(
  homeTeam: string,
  _awayTeam: string,
  gameDateIso: string,
): Promise<LineupWeather> {
  if (isDomeVenue(homeTeam)) {
    return { temp: 72, condition: 'Dome', score: 100 };
  }

  const gw = await fetchGameWeather(homeTeam, gameDateIso);
  if (!gw) {
    return { temp: 65, condition: 'Unavailable', score: 75 };
  }

  const label =
    gw.precip_chance >= 50 ? (gw.temp_f < 35 ? 'Snow' : 'Rain') : gw.temp_f > 50 ? 'Clear' : 'Cold';

  return weatherScoreFromObservation(gw, label);
}
