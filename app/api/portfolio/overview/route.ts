import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { calculateTFOScore } from '@/lib/tfo/formula';
import { Redis } from '@upstash/redis';

const TTL = 3600; // 1 hour
const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

// Age-curve KTC decay per position per year
function projectKtc(ktc: number, position: string, age: number, yearsOut: number): number {
  if (ktc <= 0) return 0;
  const pos = (position ?? '').toUpperCase();
  let decayPerYear = 0.12; // default
  let peakAge = 27;

  if (pos === 'RB')       { decayPerYear = 0.20; peakAge = 25; }
  else if (pos === 'WR')  { decayPerYear = 0.14; peakAge = 27; }
  else if (pos === 'QB')  { decayPerYear = 0.10; peakAge = 31; }
  else if (pos === 'TE')  { decayPerYear = 0.12; peakAge = 28; }

  let val = ktc;
  for (let y = 1; y <= yearsOut; y++) {
    const projectedAge = age + y;
    if (projectedAge > peakAge) {
      val = val * (1 - decayPerYear);
    } else {
      // Pre-peak: slight appreciation
      val = val * 1.04;
    }
  }
  return Math.max(0, Math.round(val));
}

function deriveAction(tfoScore: number): 'BUY' | 'SELL' | 'HOLD' {
  if (tfoScore >= 65) return 'BUY';
  if (tfoScore <= 35) return 'SELL';
  return 'HOLD';
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const redis = getRedis();
  const cacheKey = `portfolio:overview:${user.id}`;

  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('user_id', user.id);

  if (!leagues?.length) {
    return NextResponse.json({ players: [], summary: { elite: 0, highValue: 0, viable: 0, avoid: 0, rising: 0, declining: 0, avgTfoScore: 0 }, topBuys: [], topSells: [] });
  }

  const rosterRows = await Promise.all(
    leagues.map(async (lg) => {
      const { data } = await supabase
        .from('rosters')
        .select('roster_id, players, starters')
        .eq('league_id', lg.id)
        .single();
      return { league_id: lg.id, league_name: lg.name, players: (data?.players ?? []) as string[] };
    })
  );

  // Deduplicate players — track which league first owns each
  const playerLeagueMap = new Map<string, { leagueId: string; leagueName: string }>();
  for (const row of rosterRows) {
    for (const pid of row.players) {
      if (!playerLeagueMap.has(pid)) {
        playerLeagueMap.set(pid, { leagueId: row.league_id, leagueName: row.league_name });
      }
    }
  }

  const allIds = Array.from(playerLeagueMap.keys());
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allIds),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  type PortfolioPlayer = {
    playerId: string;
    playerName: string;
    position: string;
    team: string;
    age: number;
    ktcValue: number;
    tfoScore: number;
    tfoGrade: string;
    tfoVerdict: string;
    year1: number;
    year2: number;
    year3: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    leagueId: string;
    leagueName: string;
  };

  const players: PortfolioPlayer[] = [];

  for (const [pid, { leagueId, leagueName }] of Array.from(playerLeagueMap.entries())) {
    const p = playerData[pid];
    if (!p) continue;
    const pos = (p.position ?? '').toUpperCase();
    if (!SKILL_POSITIONS.has(pos)) continue;

    const ktcValue = ktcMap[p.full_name.toLowerCase()] ?? 0;
    const age = p.age ?? 25;
    const opportunityScore = 55; // conservative default without depth chart data

    let tfoScore = 50;
    let tfoGrade = 'VIABLE' as string;
    let tfoVerdict = 'NEUTRAL' as string;

    if (p.team && ['QB','RB','WR','TE'].includes(pos)) {
      try {
        const tfo = calculateTFOScore({
          playerId: pid,
          position: pos as 'QB' | 'RB' | 'WR' | 'TE',
          age,
          team: p.team,
          ocScheme: 'default',
          opportunityScore,
          olGrade: 65,
          wrCastGrade: 65,
          redZoneShare: 15,
          ktcValue,
        });
        tfoScore = tfo.tfoScore;
        tfoGrade = tfo.grade;
        tfoVerdict = tfo.verdict;
      } catch {}
    }

    players.push({
      playerId: pid,
      playerName: p.full_name,
      position: pos,
      team: p.team ?? 'FA',
      age,
      ktcValue,
      tfoScore,
      tfoGrade,
      tfoVerdict,
      year1: projectKtc(ktcValue, pos, age, 1),
      year2: projectKtc(ktcValue, pos, age, 2),
      year3: projectKtc(ktcValue, pos, age, 3),
      action: deriveAction(tfoScore),
      leagueId,
      leagueName,
    });
  }

  players.sort((a, b) => b.ktcValue - a.ktcValue);

  const elite     = players.filter((p) => p.tfoScore >= 70).length;
  const highValue = players.filter((p) => p.tfoScore >= 55 && p.tfoScore < 70).length;
  const viable    = players.filter((p) => p.tfoScore >= 40 && p.tfoScore < 55).length;
  const avoid     = players.filter((p) => p.tfoScore < 40).length;
  const rising    = players.filter((p) => p.action === 'BUY').length;
  const declining = players.filter((p) => p.action === 'SELL').length;
  const avgTfoScore = players.length
    ? Math.round(players.reduce((s, p) => s + p.tfoScore, 0) / players.length)
    : 0;

  const topBuys  = [...players].sort((a, b) => b.tfoScore - a.tfoScore).slice(0, 3);
  const topSells = [...players].sort((a, b) => a.tfoScore - b.tfoScore).slice(0, 3);

  const result = {
    players,
    summary: { elite, highValue, viable, avoid, rising, declining, avgTfoScore },
    topBuys,
    topSells,
  };

  if (redis) {
    try {
      await redis.set(cacheKey, result, { ex: TTL });
    } catch {}
  }

  return NextResponse.json(result);
}
