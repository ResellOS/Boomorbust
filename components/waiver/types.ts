export type WaiverPosition = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX' | 'DST' | 'K';
export type WaiverScoring  = 'PPR' | '0.5PPR' | 'Standard';
export type WaiverTabId    = 'wire' | 'trending' | 'gaps' | 'needs';
export type Priority       = 'HIGH' | 'MEDIUM' | 'LOW';
export type NeedLevel      = 'High' | 'Medium' | 'Low';

export interface WaiverPlayer {
  rank:        number;
  playerId:    string;
  name:        string;
  position:    string;
  team:        string;
  bbsmScore:   number;    // 0-100, JetBrains Mono green
  trend:       number[];  // 5 weekly points for sparkline
  pctRostered: number;    // 0-100
  adpLabel:    string;    // "RB48"
  priority:    Priority;
  reasoning:   string;
}

export interface RosterGap {
  position:        string;
  needLevel:       NeedLevel;
  availableImpact: number;   // count of viable available targets
}

export interface TrendingAdd {
  playerId:   string;
  name:       string;
  position:   string;
  team:       string;
  pctChange:  number;  // +68 → "+68%"
}

export interface RecentActivity {
  minutesAgo: number;   // used to display "12m"
  playerId:   string;
  playerName: string;
  position:   string;
  team:       string;
  action:     'Added' | 'Dropped';
  leagueName: string;
}

export interface PositionalNeed {
  position: string;
  count:    number;   // leagues needing it
  severity: NeedLevel;
}

export interface WaiverRadarData {
  availableCount:    number;
  rosterGaps:        RosterGap[];
  avgBbsm:           number;
  hitRate:           number;    // percentage 0-100
  nextWaiverMs:      number;    // unix ms timestamp of next Wednesday 3am UTC
  players:           WaiverPlayer[];
  trendingAdds:      TrendingAdd[];
  recentActivity:    RecentActivity[];
  positionalNeeds:   PositionalNeed[];
  totalPlayersAdded: number;
  hitsThisSeason:    number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function priorityColor(p: Priority): string {
  switch (p) {
    case 'HIGH':   return '#36E7A1';
    case 'MEDIUM': return '#FBBF24';
    case 'LOW':    return '#64748B';
  }
}

export function needColor(n: NeedLevel): string {
  switch (n) {
    case 'High':   return '#EF4444';
    case 'Medium': return '#FBBF24';
    case 'Low':    return '#36E7A1';
  }
}

export function photoUrl(playerId: string): string {
  return `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;
}

export function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  return `${h}h`;
}

export function nextWednesdayMs(): number {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysUntilWed = ((3 - day + 7) % 7) || 7; // always at least 1
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilWed);
  next.setUTCHours(3, 0, 0, 0); // 3 AM UTC = waivers run
  return next.getTime();
}
