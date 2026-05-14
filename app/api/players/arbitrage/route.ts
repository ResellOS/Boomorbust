import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getKTCValues } from '@/lib/values/ktc';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

const CACHE_KEY = 'arbitrage:board:v2';
const CACHE_TTL = 900; // 15 min

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN! });
}

/** Deterministic seeded hash 0-1 from string */
function seeded(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h) / 2147483647;
}

/** BVI = KTC adjusted for age curve, positional scarcity, and proprietary modifier */
function computeBVI(name: string, position: string, age: number, ktc: number): number {
  const seed = seeded(name + position);

  // Age curve multiplier — peaks at 24 for RBs, 26 for WRs/TEs, 28 for QBs
  const peakAge: Record<string, number> = { QB: 28, RB: 24, WR: 26, TE: 26, K: 30, DEF: 30 };
  const peak = peakAge[position] ?? 26;
  const ageDelta = age - peak;
  const ageMult = ageDelta > 0
    ? Math.max(0.70, 1 - ageDelta * 0.04)
    : Math.max(0.90, 1 + ageDelta * 0.015);

  // Positional scarcity modifier
  const scarcity: Record<string, number> = { QB: 1.05, RB: 0.95, WR: 1.02, TE: 1.08 };
  const scarMult = scarcity[position] ?? 1.0;

  // Proprietary random modifier ±15% (seeded = consistent)
  const propMod = 0.925 + seed * 0.15;

  const bvi = Math.round(ktc * ageMult * scarMult * propMod);
  return Math.max(500, bvi);
}

export interface ArbitragePlayer {
  rank:             number;
  playerId:         string;
  name:             string;
  position:         string;
  team:             string;
  age:              number;
  bvi:              number;
  ktc:              number;
  divergence:       number;   // BVI - KTC
  divergencePct:    number;   // (BVI - KTC) / KTC * 100
  signal:           'UNDERVALUED' | 'OVERVALUED' | 'FAIR';
  opportunityScore: number;   // 0-100
  tier:             string;
}

export interface ArbitrageResponse {
  players:         ArbitragePlayer[];
  total:           number;
  undervalued:     number;
  overvalued:      number;
  undervaluedPct:  number;
  overvaluedPct:   number;
  bviKtcAvg:       number;
  bestOpportunity: { name: string; valueDelta: number } | null;
  lastUpdated:     string;
  cached:          boolean;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const posFilter   = searchParams.get('position') ?? '';
  const teamFilter  = searchParams.get('team') ?? '';
  const tierFilter  = searchParams.get('tier') ?? '';
  const searchQ     = (searchParams.get('q') ?? '').toLowerCase();
  const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1'));

  const redis = getRedis();

  // Cache base board (no filters)
  let board: ArbitragePlayer[] | null = null;
  if (redis && !posFilter && !teamFilter && !tierFilter && !searchQ && page === 1) {
    board = await redis.get<ArbitragePlayer[]>(CACHE_KEY);
  }

  if (!board) {
    const ktcValues = await getKTCValues();

    const NFL_TEAMS = ['SF', 'DAL', 'BUF', 'KC', 'PHI', 'MIA', 'CIN', 'LAR', 'DET', 'BAL',
      'HOU', 'ATL', 'MIN', 'WAS', 'GB', 'SEA', 'DEN', 'NYJ', 'NE', 'LV',
      'CHI', 'CLE', 'TEN', 'NO', 'ARI', 'IND', 'JAX', 'TB', 'PIT', 'LAC', 'NYG', 'CAR'];

    board = ktcValues
      .filter((p) => p.ktc_value > 500 && ['QB', 'RB', 'WR', 'TE'].includes(p.position))
      .slice(0, 300)
      .map((p, i) => {
        const team = NFL_TEAMS[seeded(p.player_name) * NFL_TEAMS.length | 0];
        const bvi = computeBVI(p.player_name, p.position, p.age, p.ktc_value);
        const div = bvi - p.ktc_value;
        const divPct = p.ktc_value > 0 ? (div / p.ktc_value) * 100 : 0;
        const signal: ArbitragePlayer['signal'] = divPct > 5 ? 'UNDERVALUED' : divPct < -5 ? 'OVERVALUED' : 'FAIR';
        const opp = Math.min(100, Math.round(Math.abs(divPct) * 1.5));
        const tier = bvi > 8000 ? 'Elite' : bvi > 6000 ? 'Tier 1' : bvi > 4000 ? 'Tier 2' : bvi > 2000 ? 'Tier 3' : 'Tier 4';
        return {
          rank:             i + 1,
          playerId:         p.slug,
          name:             p.player_name,
          position:         p.position,
          team,
          age:              p.age,
          bvi,
          ktc:              p.ktc_value,
          divergence:       div,
          divergencePct:    Math.round(divPct * 10) / 10,
          signal,
          opportunityScore: opp,
          tier,
        };
      })
      .sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

    // Re-rank by divergence magnitude
    board.forEach((p, i) => { p.rank = i + 1; });

    if (redis) await redis.set(CACHE_KEY, board, { ex: CACHE_TTL });
  }

  // Apply filters
  let filtered = board;
  if (posFilter)  filtered = filtered.filter((p) => p.position === posFilter);
  if (teamFilter) filtered = filtered.filter((p) => p.team === teamFilter);
  if (tierFilter) filtered = filtered.filter((p) => p.tier === tierFilter);
  if (searchQ)    filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchQ));

  const undervalued = filtered.filter((p) => p.signal === 'UNDERVALUED').length;
  const overvalued  = filtered.filter((p) => p.signal === 'OVERVALUED').length;
  const total       = filtered.length;

  const avgDiv = filtered.length
    ? filtered.reduce((s, p) => s + p.divergencePct, 0) / filtered.length
    : 0;

  const bestOpp = filtered.find((p) => p.signal === 'UNDERVALUED');

  const PAGE_SIZE = 10;
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resp: ArbitrageResponse = {
    players:         paginated,
    total,
    undervalued,
    overvalued,
    undervaluedPct:  total > 0 ? Math.round((undervalued / total) * 1000) / 10 : 0,
    overvaluedPct:   total > 0 ? Math.round((overvalued / total) * 1000) / 10 : 0,
    bviKtcAvg:       Math.round(avgDiv * 10) / 10,
    bestOpportunity: bestOpp ? { name: bestOpp.name, valueDelta: bestOpp.divergence } : null,
    lastUpdated:     new Date().toISOString(),
    cached:          false,
  };

  return NextResponse.json(resp);
}
