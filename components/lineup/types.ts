export type LineupVerdict = 'BOOM' | 'HOLD' | 'SIT' | 'BUST' | 'START' | 'FLEX';
export type WeatherIcon = 'RAIN' | 'SNOW' | 'WIND' | 'CLEAR' | 'DOME';
export type WeatherOutlook = 'GOOD' | 'RAIN' | 'SNOW' | 'WIND' | 'MIXED';
export type LineupTabId = 'lineup' | 'startsit' | 'matrix' | 'weather';

export interface PlayerRow {
  slot: string;
  playerId: string;
  name: string;
  position: string;
  team: string;
  /** "@DEN" or "BUF vs TEN" format */
  matchupLabel: string;
  /** Opponent team abbreviation */
  ssasTeam: string;
  /** 1–32, higher = weaker defense = easier matchup */
  ssasRank: number;
  /** 0–100 matchup quality grade */
  ssasGrade: number;
  verdict: LineupVerdict;
  projectedPoints: number;
  treEdge: number;
  reasoning: string;
  weather: { condition: string; score: number; temp: number };
}

export interface WeatherAlert {
  game: string;       // "KC @ SF"
  stadium: string;
  icon: WeatherIcon;
  conditions: string; // "Rain / Winds: 18 mph"
  impact: string;     // "Passing Game"
}

export interface BorderlinePlayer {
  playerId: string;
  name: string;
  position: string;
  team: string;
  opponent: string;
  ssasTeam: string;
  ssasRank: number;
  verdict: LineupVerdict;
  reasoning: string;
}

export interface MatchupMatrixRow {
  rank: number;       // display number (1-5)
  team: string;       // "TEN"
  ssasRank: number;   // 1-32
  grade: number;      // 0-100
  isEasy: boolean;
}

export interface BoomBustBreakdown {
  starterBoom: number;
  starterHold: number;
  starterBust: number;
  benchBoom: number;
  benchHold: number;
  benchBust: number;
  starterTotal: number;
  benchTotal: number;
}

export interface OptimalLineupData {
  starters: PlayerRow[];
  bench: PlayerRow[];
  totalProjected: number;
  totalTreEdge: number;
  lineupConfidence: number;
  optimalRecord: string;
  week: number;
  season: string;
  weatherOutlook: WeatherOutlook;
  weatherAlerts: WeatherAlert[];
  borderline: BorderlinePlayer[];
  matchupMatrix: { easiest: MatchupMatrixRow[]; toughest: MatchupMatrixRow[] };
  breakdown: BoomBustBreakdown;
}

export function ordinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

export function ssasColor(rank: number): string {
  if (rank >= 22) return '#36E7A1';  // green — easy
  if (rank >= 12) return '#FBBF24';  // amber — neutral
  return '#EF4444';                  // red — hard
}

export function verdictColor(v: LineupVerdict): string {
  switch (v) {
    case 'BOOM':  return '#36E7A1';
    case 'START': return '#22D3EE';
    case 'HOLD':  return '#FBBF24';
    case 'FLEX':  return '#FBBF24';
    case 'SIT':   return '#EF4444';
    case 'BUST':  return '#EF4444';
  }
}

export function weatherIconType(condition: string): WeatherIcon {
  const c = condition.toLowerCase();
  if (c.includes('snow') || c.includes('sleet')) return 'SNOW';
  if (c.includes('rain') || c.includes('drizzle') || c.includes('shower')) return 'RAIN';
  if (c.includes('wind')) return 'WIND';
  if (c.includes('dome') || c.includes('indoor')) return 'DOME';
  return 'CLEAR';
}

export function photoUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}
