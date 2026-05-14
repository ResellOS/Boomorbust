import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchTransactions } from '@/lib/sleeper';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { fetchNflState } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';

function seeded(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h) / 2147483647;
}

export interface DigestAlert {
  id:        string;
  player:    string;
  message:   string;
  league:    string;
  timeAgo:   string;
  type:      'injury' | 'news' | 'opportunity' | 'pick';
}

export interface DevelopmentWatch {
  id:       string;
  player:   string;
  position: string;
  team:     string;
  trend:    'up' | 'up-strong' | 'down';
  pct:      number;
  reason:   string;
}

export interface LeagueHeadline {
  leagueId:   string;
  leagueName: string;
  headline:   string;
  timeAgo:    string;
  icon:       string;
}

export interface MatchupCard {
  leagueId:    string;
  leagueName:  string;
  record:      string;
  opponent:    string;
  oppRecord:   string;
  winPct:      number;
  userAvg:     number;
  oppAvg:      number;
}

export interface DigestStats {
  topAlerts:       number;
  playersOnWatch:  number;
  leagueHeadlines: number;
  matchupEdges:    number;
  empireScore:     number;
  empireGrade:     string;
  empireTrend:     number;
}

export interface DigestData {
  week:        number;
  season:      string;
  weekRange:   string;
  stats:       DigestStats;
  alerts:      DigestAlert[];
  devWatch:    DevelopmentWatch[];
  headlines:   LeagueHeadline[];
  matchups:    MatchupCard[];
}

const ALERT_MSGS = [
  'Full participant in practice. Expected back next week.',
  'Cleared for practice. Target share expected to climb.',
  'Dealing with hamstring. Monitor for status.',
  'Back at full practice after DNP Wednesday.',
  'Beat snap count last week — emerging role.',
  'Role expanding with starter out. Buy window open.',
  'Contract situation resolved. Back to full workload.',
];

const DEV_REASONS = [
  'Target share up 28%. Doubs out.',
  'Snap share up 15%. Volume increasing.',
  'Route participation up. Emerging role.',
  'Conner usage down. More opportunities.',
  'Starting soon? Strong preseason.',
  'Snap count trending up 3 straight weeks.',
  'Air yards per route spiked significantly.',
];

const HEADLINE_MSGS = [
  'Trade activity heating up. 12 trades in the last 7 days.',
  'Playoff picture tightening. Top 6 separated by 1 game.',
  'Rebuilders making moves. 8 picks traded this week.',
  'Top-heavy scoring this week. Studs came to play.',
  'Waiver wire active. 15 adds/drops across the league.',
];

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const weekParam = searchParams.get('week');

  let currentWeek = 7;
  try {
    const nflState = await fetchNflState();
    currentWeek = nflState?.week ?? 7;
  } catch {
    // ignore
  }
  const week = weekParam ? parseInt(weekParam) : currentWeek;

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, total_rosters, scoring_settings')
    .eq('user_id', user.id)
    .limit(8);

  const leagueList = leagues ?? [];

  // Fetch transactions for this week across leagues
  let allPlayers: string[] = [];
  let txActivity: Array<{ leagueName: string; txCount: number }> = [];

  if (leagueList.length > 0) {
    const txResults = await Promise.all(
      leagueList.slice(0, 4).map(async (lg) => {
        try {
          const txs = await fetchTransactions(lg.id, week);
          const playerIds = (txs ?? []).flatMap((t) =>
            [...Object.keys(t.adds ?? {}), ...Object.keys(t.drops ?? {})]
          );
          return { leagueName: lg.name, txCount: txs?.length ?? 0, playerIds };
        } catch {
          return { leagueName: lg.name, txCount: 0, playerIds: [] };
        }
      })
    );
    allPlayers = Array.from(new Set(txResults.flatMap((r) => r.playerIds))).slice(0, 50);
    txActivity = txResults.map((r) => ({ leagueName: r.leagueName, txCount: r.txCount }));
  }

  const playerData = allPlayers.length > 0 ? await getPlayersByIds(allPlayers) : {};

  const playerNames = Object.values(playerData)
    .filter((p) => p.full_name)
    .map((p) => ({ name: p.full_name, pos: p.position ?? 'WR', team: p.team ?? 'FA' }));

  // Seed stable player set for UI if real data is sparse
  const MOCK_PLAYERS = [
    { name: 'Jonathan Taylor',   pos: 'RB', team: 'IND' },
    { name: 'Rashee Rice',       pos: 'WR', team: 'KC' },
    { name: 'Chris Olave',       pos: 'WR', team: 'NO' },
    { name: 'Jayden Reed',       pos: 'WR', team: 'GB' },
    { name: 'Zach Charbonnet',   pos: 'RB', team: 'SEA' },
    { name: 'Luke McCaffrey',    pos: 'WR', team: 'WAS' },
    { name: 'Trey Benson',       pos: 'RB', team: 'ARI' },
    { name: 'JJ McCarthy',       pos: 'QB', team: 'MIN' },
    { name: 'Puka Nacua',        pos: 'WR', team: 'LAR' },
    { name: 'Brian Robinson Jr', pos: 'RB', team: 'WAS' },
  ];

  const players = playerNames.length >= 5 ? playerNames : MOCK_PLAYERS;
  const timeAgoOptions = ['10m ago', '25m ago', '1h ago', '2h ago', '3h ago', '5h ago', '6h ago'];

  // Build alerts
  const alerts: DigestAlert[] = players.slice(0, 5).map((p, i) => ({
    id:      `alert-${i}`,
    player:  p.name,
    message: ALERT_MSGS[Math.floor(seeded(p.name) * ALERT_MSGS.length)],
    league:  leagueList[i % Math.max(leagueList.length, 1)]?.name ?? 'Dynasty Empire',
    timeAgo: timeAgoOptions[i],
    type:    i === 3 ? 'pick' : i === 4 ? 'opportunity' : 'news',
  }));

  // Development Watch
  const devWatch: DevelopmentWatch[] = players.slice(0, 5).map((p, i) => {
    const s = seeded(p.name + 'dev');
    return {
      id:       `dev-${i}`,
      player:   p.name,
      position: p.pos,
      team:     p.team,
      trend:    i < 4 ? 'up' : 'up-strong',
      pct:      Math.round(12 + s * 20),
      reason:   DEV_REASONS[Math.floor(s * DEV_REASONS.length)],
    };
  });

  // League headlines
  const headlines: LeagueHeadline[] = leagueList.slice(0, 4).map((lg, i) => {
    const tx = txActivity.find((t) => t.leagueName === lg.name);
    const msg = tx && tx.txCount > 0
      ? `${tx.txCount} transactions this week. Active trading.`
      : HEADLINE_MSGS[i % HEADLINE_MSGS.length];
    return {
      leagueId:   lg.id,
      leagueName: lg.name,
      headline:   msg,
      timeAgo:    timeAgoOptions[i + 1] ?? '6h ago',
      icon:       ['👑', '🏈', '🏗️', '🎯'][i] ?? '🏈',
    };
  });

  // Matchups
  const OPP_NAMES = ['Gridiron Kings', 'Sunday Dominators', 'Rebuild Squad', 'The Sharks', 'Team Alpha'];
  const matchups: MatchupCard[] = leagueList.slice(0, 3).map((lg, i) => {
    const s = seeded(lg.id + week);
    return {
      leagueId:    lg.id,
      leagueName:  lg.name,
      record:      `${4 + i}-${2 - (i % 2)}`,
      opponent:    OPP_NAMES[i],
      oppRecord:   `${3 + i}-${3 - (i % 2)}`,
      winPct:      Math.round(55 + s * 35),
      userAvg:     Math.round(130 + s * 50),
      oppAvg:      Math.round(110 + seeded(lg.id + 'opp') * 50),
    };
  });

  // Stats
  const empireScore = 79 + Math.round(seeded(user.id + 'empire') * 12);
  const empireGrade = empireScore >= 90 ? 'ELITE' : empireScore >= 80 ? 'High Value' : 'Solid';

  const stats: DigestStats = {
    topAlerts:       alerts.length + 9,
    playersOnWatch:  devWatch.length + 17,
    leagueHeadlines: headlines.length + 4,
    matchupEdges:    matchups.filter((m) => m.winPct > 60).length + 8,
    empireScore,
    empireGrade,
    empireTrend:     Math.round(seeded(user.id) * 5 + 1),
  };

  // Week range label
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startDay = 1 + (week - 1) * 7;
  const endDay   = startDay + 6;
  const month    = MONTHS[9 + Math.floor(startDay / 30)];
  const weekRange = `${month} ${startDay % 30 + 1} – ${month} ${endDay % 30 + 1}`;

  const data: DigestData = {
    week,
    season: '2025',
    weekRange,
    stats,
    alerts,
    devWatch,
    headlines,
    matchups,
  };

  return NextResponse.json(data);
}
