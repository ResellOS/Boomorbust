import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import Fuse from 'fuse.js';
import { createClient } from '@/lib/supabase/server';
import {
  fetchLeagueMatchups,
  fetchLeagueRosters,
} from '@/lib/sleeper';
import { fetchAllPlayers, type SleeperPlayer } from '@/lib/sleeper/players';
import {
  defenseRankToMatchupGrade,
  fetchWeekMatchups,
  getPassDefenseRank,
  getRushDefenseRank,
  type NFLMatchup,
} from '@/lib/external/matchups';
import { calculateTFOScore, type CalculateTFOScoreInput, type TFOPosition } from '@/lib/tfo/formula';
import { getKTCValues } from '@/lib/values/ktc';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import { fetchLineupWeather, type LineupWeather } from '@/lib/lineup/weatherScore';

export type LineupOptimizePlayerRow = {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  tfoScore: number;
  startScore: number;
  verdict: string;
  verdictDetail: string;
  matchupGrade: number;
  opponent: string;
  weather: { temp: number; condition: string; score: number };
  flags: string[];
  reasoning: string;
  projectedPoints: { low: number; high: number };
};

export type LineupOptimizeResponse = {
  players: LineupOptimizePlayerRow[];
  gaugePct: number;
  projectedStarterPoints: number;
  summaryChecks: string[];
  meta: { season: string; week: number; leagueId: string; rosterId: number; cached?: boolean };
};

const CACHE_TTL = 3600;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function scheduleTeam(abbr: string): string {
  const u = abbr.toUpperCase();
  if (u === 'WSH') return 'WAS';
  return u;
}

function findGameContext(
  team: string | null,
  schedule: NFLMatchup[],
): { opponent: string; homeTeam: string; awayTeam: string; gameTime: string } | null {
  if (!team) return null;
  const t = scheduleTeam(team);
  for (const g of schedule) {
    const h = scheduleTeam(g.home_team);
    const a = scheduleTeam(g.away_team);
    if (h === t) {
      return { opponent: g.away_team, homeTeam: g.home_team, awayTeam: g.away_team, gameTime: g.game_time };
    }
    if (a === t) {
      return { opponent: g.home_team, homeTeam: g.home_team, awayTeam: g.away_team, gameTime: g.game_time };
    }
  }
  return null;
}

function seededUnit(id: string, salt: number): number {
  let h = 0x811c9dc5;
  const input = `${id}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10001) / 10000;
}

function buildTFOInput(
  playerId: string,
  sp: SleeperPlayer,
  ktcValue: number,
  weekPts: number | undefined,
): CalculateTFOScoreInput | null {
  const pos = (sp.position ?? '').toUpperCase();
  if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) return null;

  const team = (sp.team ?? '—').toUpperCase();
  /** OC tree from `TEAM_SCHEME_MAP` (via `schemeForTeam`, includes Sleeper WAS → WSH). */
  const scheme = schemeForTeam(team);

  const snapShare =
    typeof sp.depth_chart_order === 'number' && sp.depth_chart_order >= 1 && sp.depth_chart_order <= 4
      ? clamp(90 - sp.depth_chart_order * 14, 36, 94)
      : undefined;
  const age = sp.age ?? Math.round(22 + seededUnit(playerId, 11) * 10);

  const u2 = seededUnit(playerId, 12);
  const u3 = seededUnit(playerId, 13);
  const u4 = seededUnit(playerId, 14);
  const u5 = seededUnit(playerId, 15);
  const oppBase = 48 + u2 * 32;
  const weekBoost = typeof weekPts === 'number' ? clamp(weekPts * 1.6, 0, 22) : 0;

  return {
    playerId,
    position: pos as TFOPosition,
    age,
    team,
    ocScheme: scheme,
    opportunityScore: clamp(oppBase + weekBoost, 15, 97),
    olGrade: clamp(44 + u3 * 40, 20, 95),
    wrCastGrade: clamp(43 + u4 * 42, 18, 95),
    redZoneShare: clamp(34 + u5 * 40, 12, 93),
    ktcValue: ktcValue > 0 ? ktcValue : Math.round(2000 + seededUnit(playerId, 16) * 5500),
    weeklyPPG: weekPts,
    snapShare,
    targetShare:
      pos === 'WR' || pos === 'TE' || pos === 'RB'
        ? clamp(8 + u2 * 34, 4, 42)
        : undefined,
    ocYear: seededUnit(playerId, 17) > 0.72 ? 3 : seededUnit(playerId, 18) > 0.4 ? 2 : 1,
    teamQbIsYoung: pos !== 'QB' ? seededUnit(playerId, 19) > 0.5 : undefined,
  };
}

function defenseRankForPosition(opponent: string, position: string): number {
  const p = position.toUpperCase();
  const opp = scheduleTeam(opponent);
  if (!opp) return 16;
  if (['QB', 'WR', 'TE'].includes(p)) return getPassDefenseRank(opp);
  if (p === 'RB') return getRushDefenseRank(opp);
  /** DST/K: no offense DVOA on hand — neutral-ish tier so weather/TFO slice sorts roster. */
  if (p === 'DEF' || p === 'DST' || p === 'K') return 20;
  return 16;
}

function startVerdictLabels(startScore: number): { verdict: string; verdictDetail: string } {
  if (startScore >= 90) return { verdict: 'START', verdictDetail: 'Elite play' };
  if (startScore >= 75) return { verdict: 'START', verdictDetail: 'Strong play' };
  if (startScore >= 60) return { verdict: 'FLEX', verdictDetail: 'Matchup dependent' };
  if (startScore >= 45) return { verdict: 'SIT', verdictDetail: 'Downside risk' };
  return { verdict: 'SIT', verdictDetail: 'Avoid' };
}

function fantasyPointsFromTFO(position: string, tfo: ReturnType<typeof calculateTFOScore>): { low: number; high: number } {
  const pos = position.toUpperCase();
  const py = tfo.projectedYards;
  const pt = tfo.projectedTDs;
  if (pos === 'QB') {
    return {
      low: Math.round((py.low / 25 + pt.low * 4) * 10) / 10,
      high: Math.round((py.high / 22 + pt.high * 4.5 + 6) * 10) / 10,
    };
  }
  if (pos === 'RB') {
    return {
      low: Math.round((py.low / 15 + pt.low * 6 + 1.5) * 10) / 10,
      high: Math.round((py.high / 12 + pt.high * 6 + 9) * 10) / 10,
    };
  }
  if (pos === 'WR' || pos === 'TE') {
    return {
      low: Math.round((py.low / 15 + pt.low * 6 + 2) * 10) / 10,
      high: Math.round((py.high / 12 + pt.high * 6 + 10) * 10) / 10,
    };
  }
  return { low: 4, high: 14 };
}

async function buildKtcResolver(): Promise<(fullName: string) => number> {
  const rows = await getKTCValues();
  if (!rows.length) {
    return () => 3500;
  }
  const fuse = new Fuse(rows, { keys: ['player_name'], threshold: 0.38 });
  return (fullName: string) => fuse.search(fullName)[0]?.item.ktc_value ?? 3500;
}

function mergeReasoning(
  tfoReason: string,
  matchupGrade: number,
  opponent: string,
  weather: LineupWeather,
): string {
  const m =
    matchupGrade >= 72 ? `Favorable leverage vs ${opponent}.` : matchupGrade <= 48 ? `Tough draw vs ${opponent}.` : `Neutral matchup vs ${opponent}.`;
  const w =
    weather.score >= 90
      ? 'Venue/weather is a non-issue.'
      : weather.score >= 75
        ? 'Weather outlook is workable.'
        : 'Weather adds some volatility.';
  return `${tfoReason} ${m} ${w}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { leagueId?: string; rosterId?: number; week?: number; season?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const leagueId = body.leagueId?.trim();
    const rosterIdNum = Number(body.rosterId);
    const weekNum = Number(body.week);
    const season = body.season?.trim() ?? String(new Date().getFullYear());

    if (!leagueId || !Number.isFinite(rosterIdNum) || !Number.isFinite(weekNum)) {
      return NextResponse.json({ error: 'Missing leagueId, rosterId, or week' }, { status: 400 });
    }

    const redis = getRedis();
    const cacheKey = `lineup:optimize:${leagueId}:${weekNum}:${user.id}`;
    if (redis) {
      try {
        const cached = await redis.get<LineupOptimizeResponse>(cacheKey);
        if (cached?.players?.length) {
          return NextResponse.json({ ...cached, meta: { ...cached.meta, cached: true } });
        }
      } catch {
        /* miss */
      }
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', user.id)
      .maybeSingle();

    const sleeperUserId = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;
    if (!sleeperUserId) {
      return NextResponse.json({ error: 'Link your Sleeper account in settings' }, { status: 403 });
    }

    const rosters = await fetchLeagueRosters(leagueId);
    if (!rosters?.length) {
      return NextResponse.json({ error: 'Could not load league rosters' }, { status: 502 });
    }

    const roster = rosters.find((r) => r.roster_id === rosterIdNum);
    if (!roster || roster.owner_id !== sleeperUserId) {
      return NextResponse.json({ error: 'Roster not found or access denied' }, { status: 403 });
    }

    const playerIds = Array.from(new Set((roster.players ?? []).filter(Boolean)));
    if (!playerIds.length) {
      return NextResponse.json({ error: 'Empty roster' }, { status: 400 });
    }

    const starterSet = new Set((roster.starters ?? []).filter(Boolean));

    const [allPlayers, leagueMx, nflSchedule, ktcResolve] = await Promise.all([
      fetchAllPlayers(),
      fetchLeagueMatchups(leagueId, weekNum),
      fetchWeekMatchups(season, weekNum),
      buildKtcResolver(),
    ]);

    if (!allPlayers) {
      return NextResponse.json({ error: 'Could not load NFL player data' }, { status: 502 });
    }

    const weekPointsByPid: Record<string, number> = {};
    const userMx = leagueMx?.find((m) => m.roster_id === rosterIdNum);
    if (userMx?.players_points) {
      for (const [pid, pts] of Object.entries(userMx.players_points)) {
        if (typeof pts === 'number') weekPointsByPid[pid] = pts;
      }
    }

    const weatherMemo = new Map<string, Promise<LineupWeather>>();

    const weatherForGame = (home: string, away: string, gameTime: string): Promise<LineupWeather> => {
      const key = `${scheduleTeam(home)}|${scheduleTeam(away)}|${season}|${weekNum}`;
      let p = weatherMemo.get(key);
      if (!p) {
        const iso = gameTime?.includes('T') ? gameTime : `${season.slice(0, 4)}-09-01T17:00:00Z`;
        p = fetchLineupWeather(scheduleTeam(home), scheduleTeam(away), iso);
        weatherMemo.set(key, p);
      }
      return p;
    };

    const rows: LineupOptimizePlayerRow[] = [];

    for (const pid of playerIds) {
      const sp = allPlayers[pid];
      if (!sp || sp.position === null) continue;

      const posU = (sp.position ?? '').toUpperCase();
      const teamAbbr = sp.team?.toUpperCase() ?? '';
      const name = sp.full_name ?? 'Unknown';
      const weekPts = weekPointsByPid[pid];

      const game = findGameContext(sp.team, nflSchedule);
      const opponent = game?.opponent ?? '';
      let matchupGrade = 60;
      if (opponent) {
        const rank = defenseRankForPosition(opponent, posU);
        matchupGrade = defenseRankToMatchupGrade(rank);
      }

      let weather: LineupWeather = { temp: 65, condition: 'Unknown', score: 75 };
      if (game) {
        weather = await weatherForGame(game.homeTeam, game.awayTeam, game.gameTime);
      }

      const ktcVal = ktcResolve(name);

      if (['QB', 'RB', 'WR', 'TE'].includes(posU)) {
        const tfoInput = buildTFOInput(pid, sp, ktcVal, weekPts);
        if (!tfoInput) continue;

        const tfo = calculateTFOScore(tfoInput);
        const startScore = clamp(
          tfo.tfoScore * 0.5 + matchupGrade * 0.3 + weather.score * 0.2,
          0,
          100,
        );
        const { verdict, verdictDetail } = startVerdictLabels(startScore);
        const proj = fantasyPointsFromTFO(posU, tfo);

        rows.push({
          playerId: pid,
          playerName: name,
          position: posU,
          team: teamAbbr || '—',
          tfoScore: tfo.tfoScore,
          startScore: Math.round(startScore * 10) / 10,
          verdict,
          verdictDetail,
          matchupGrade,
          opponent: opponent || '—',
          weather: { temp: weather.temp, condition: weather.condition, score: weather.score },
          flags: tfo.flags,
          reasoning: mergeReasoning(tfo.reasoning, matchupGrade, opponent || 'league avg', weather),
          projectedPoints: proj,
        });
        continue;
      }

      if (['K', 'DEF', 'DST'].includes(posU)) {
        const tfoScoreFallback = 50;
        const startScore = clamp(
          tfoScoreFallback * 0.5 + matchupGrade * 0.3 + weather.score * 0.2,
          0,
          100,
        );
        const { verdict, verdictDetail } = startVerdictLabels(startScore);

        rows.push({
          playerId: pid,
          playerName: name,
          position: posU === 'DST' ? 'DEF' : posU,
          team: teamAbbr || '—',
          tfoScore: tfoScoreFallback,
          startScore: Math.round(startScore * 10) / 10,
          verdict,
          verdictDetail,
          matchupGrade,
          opponent: opponent || '—',
          weather: { temp: weather.temp, condition: weather.condition, score: weather.score },
          flags: [],
          reasoning: `${posU} scoring leans on opponent script and conditions vs ${opponent || 'TBD'}.`,
          projectedPoints: posU === 'K' ? { low: 5, high: 12 } : { low: 4, high: 14 },
        });
      }
    }

    rows.sort((a, b) => {
      const sa = starterSet.has(a.playerId) ? 1 : 0;
      const sb = starterSet.has(b.playerId) ? 1 : 0;
      if (sa !== sb) return sb - sa;
      return b.startScore - a.startScore;
    });

    const starters = rows.filter((r) => starterSet.has(r.playerId));
    const avgStart =
      starters.length > 0 ? starters.reduce((s, r) => s + r.startScore, 0) / starters.length : 55;
    const gaugePct = Math.round(clamp(((avgStart - 42) / 48) * 100, 28, 97));

    const projectedStarterPoints =
      Math.round(
        starters.reduce((s, r) => s + (r.projectedPoints.low + r.projectedPoints.high) / 2, 0) * 10,
      ) / 10;

    const flexy = rows.filter((r) => r.startScore >= 58 && r.startScore < 74).length;
    const summaryChecks =
      gaugePct >= 78
        ? ['Strong structural scores', 'Weather mostly clean', 'Lean into verified starters']
        : gaugePct >= 58
          ? ['Viable ceiling week', `${flexy ? `${flexy} flex‑tier calls` : 'Tighten flex'}`, 'Watch late injury news']
          : ['Upgrade volatile spots', 'Matchup or weather drag', 'Bias safer floors'];

    const payload: LineupOptimizeResponse = {
      players: rows,
      gaugePct,
      projectedStarterPoints,
      summaryChecks,
      meta: { season, week: weekNum, leagueId, rosterId: rosterIdNum },
    };

    if (redis) {
      try {
        await redis.set(cacheKey, payload, { ex: CACHE_TTL });
      } catch {
        /* non-fatal */
      }
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('Lineup optimize error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
