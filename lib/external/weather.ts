const DOME_TEAMS = new Set(['LV', 'NO', 'ATL', 'LAR', 'MIN', 'IND', 'DAL', 'DET', 'ARI']);

const TEAM_CITIES: Record<string, string> = {
  ARI: 'Glendale,US', ATL: 'Atlanta,US', BAL: 'Baltimore,US', BUF: 'Buffalo,US',
  CAR: 'Charlotte,US', CHI: 'Chicago,US', CIN: 'Cincinnati,US', CLE: 'Cleveland,US',
  DAL: 'Arlington,US', DEN: 'Denver,US', DET: 'Detroit,US', GB: 'Green Bay,US',
  HOU: 'Houston,US', IND: 'Indianapolis,US', JAX: 'Jacksonville,US', KC: 'Kansas City,US',
  LAC: 'Inglewood,US', LAR: 'Inglewood,US', LV: 'Las Vegas,US', MIA: 'Miami,US',
  MIN: 'Minneapolis,US', NE: 'Foxborough,US', NO: 'New Orleans,US', NYG: 'East Rutherford,US',
  NYJ: 'East Rutherford,US', PHI: 'Philadelphia,US', PIT: 'Pittsburgh,US',
  SEA: 'Seattle,US', SF: 'Santa Clara,US', TB: 'Tampa,US', TEN: 'Nashville,US',
  WAS: 'Landover,US',
};

export interface GameWeather {
  wind_mph: number;
  precip_chance: number;
  temp_f: number;
  is_dome: boolean;
}

export async function fetchGameWeather(
  home_team: string,
  game_date: string
): Promise<GameWeather | null> {
  if (DOME_TEAMS.has(home_team)) {
    return { wind_mph: 0, precip_chance: 0, temp_f: 72, is_dome: true };
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  const city = TEAM_CITIES[home_team];
  if (!city) return null;

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKey}&units=imperial&cnt=8`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const targetDate = game_date.slice(0, 10);

    // Find the forecast entry closest to game date
    const entry = (data.list as Array<{ dt_txt: string; wind: { speed: number }; pop: number; main: { temp: number } }>)
      .find((e) => e.dt_txt.startsWith(targetDate)) ?? data.list?.[0];

    if (!entry) return null;

    return {
      wind_mph: Math.round(entry.wind?.speed ?? 0),
      precip_chance: Math.round((entry.pop ?? 0) * 100),
      temp_f: Math.round(entry.main?.temp ?? 65),
      is_dome: false,
    };
  } catch (err) {
    console.error('Weather fetch failed:', err);
    return null;
  }
}
