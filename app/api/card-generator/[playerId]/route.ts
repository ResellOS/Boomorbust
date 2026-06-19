import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { generateProjection, getDynastyRankLabel } from '@/lib/projections/engine';
import { getTeamColors } from '@/lib/utils/teamColors';
import { Redis } from '@upstash/redis';

const CACHE_TTL = 3600; // 1 hour

let _redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

const VERDICT_COLORS: Record<string, string> = {
  'BOOM': '#36E7A1',
  'BUY': '#60a5fa',
  'HOLD': '#FBBF24',
  'SELL': '#f59e0b',
  'BUST': '#A78BFA',
};

function verdictFromTFO(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'BOOM', color: VERDICT_COLORS['BOOM'] };
  if (score >= 65) return { label: 'BUY', color: VERDICT_COLORS['BUY'] };
  if (score >= 50) return { label: 'HOLD', color: VERDICT_COLORS['HOLD'] };
  if (score >= 35) return { label: 'SELL', color: VERDICT_COLORS['SELL'] };
  return { label: 'BUST', color: VERDICT_COLORS['BUST'] };
}

function bviSignal(bviScore: number, ktcValue: number): 'UNDERVALUED' | 'OVERVALUED' | 'FAIR VALUE' {
  const delta = bviScore - ktcValue;
  if (delta > 500) return 'UNDERVALUED';
  if (delta < -500) return 'OVERVALUED';
  return 'FAIR VALUE';
}

function confidenceFromKTC(ktcValue: number): number {
  if (ktcValue >= 7000) return 94;
  if (ktcValue >= 4000) return 87;
  if (ktcValue >= 2000) return 78;
  if (ktcValue >= 800) return 68;
  return 55;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { playerId: string } },
) {
  const { playerId } = params;
  const { searchParams } = request.nextUrl;
  const scoringType = searchParams.get('scoringType') ?? 'ppr';
  const year = parseInt(searchParams.get('year') ?? '2026', 10);

  const cacheKey = `card:${playerId}:${scoringType}:${year}`;
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch { /* fall through */ }
  }

  const [allPlayers, ktcList] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!allPlayers) {
    return NextResponse.json({ error: 'Player data unavailable' }, { status: 503 });
  }

  const raw = allPlayers[playerId] as {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    position?: string;
    team?: string;
    age?: number;
    search_rank?: number;
    avatar?: string;
  } | undefined;

  if (!raw || !raw.full_name) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  const position = (raw.position ?? 'WR').toUpperCase();
  const team = raw.team ?? 'FA';
  const age = raw.age ?? 25;
  const fullName = raw.full_name;
  const avatarUrl = `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`;

  // KTC value lookup
  const nameLower = fullName.toLowerCase();
  const ktcEntry = ktcList?.find((k) => k.player_name.toLowerCase() === nameLower);
  const ktcValue = ktcEntry?.ktc_value ?? 0;

  // TFO score from tfo_cache if available, else derive from KTC tier
  const supabase = createAdminClient();
  const { data: tfoCache } = await supabase
    .from('formula_scores')
    .select('tfo_score, dms_score')
    .eq('player_id', playerId)
    .order('calculated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const tfoScore: number = (tfoCache as { tfo_score?: number } | null)?.tfo_score
    ?? Math.round(30 + (Math.min(ktcValue, 9500) / 9500) * 55 + Math.random() * 10);
  const dmsScore: number = (tfoCache as { dms_score?: number } | null)?.dms_score
    ?? Math.round(40 + (tfoScore / 100) * 40);

  // BVI (KTC-scale proxy using TFO adjustment)
  const bviRaw = Math.round(ktcValue * (0.7 + (tfoScore / 100) * 0.6));
  const bviScore = Math.min(bviRaw, 10000);
  const valueDelta = bviScore - ktcValue;

  const { label: verdictLabel, color: verdictColor } = verdictFromTFO(tfoScore);
  const signal = bviSignal(bviScore, ktcValue);
  const confidence = confidenceFromKTC(ktcValue);

  // Dynasty rank
  const { rank: dynastyRank, label: dynastyRankLabel } = await getDynastyRankLabel(playerId, position);

  // DMS momentum direction
  let momentumDirection = 'STABLE';
  if (dmsScore >= 65) momentumDirection = 'ASCENDING';
  else if (dmsScore < 35) momentumDirection = 'DECLINING';

  // Projections
  const projection = await generateProjection({
    playerId,
    position,
    age,
    team,
    tfoScore,
    year,
  });

  const teamColors = getTeamColors(team);

  const result = {
    player: {
      player_id: playerId,
      full_name: fullName,
      first_name: raw.first_name ?? fullName.split(' ')[0] ?? '',
      last_name: raw.last_name ?? fullName.split(' ').slice(1).join(' ') ?? '',
      position,
      team,
      age,
      avatar: avatarUrl,
      dynastyRank,
      dynastyRankLabel,
    },
    verdict: {
      score: tfoScore,
      label: verdictLabel,
      confidence,
      color: verdictColor,
    },
    value: {
      edgeScore: bviScore,
      ktcValue,
      delta: valueDelta,
      signal,
    },
    momentum: {
      score: dmsScore,
      direction: momentumDirection,
    },
    projections: projection,
    teamColors,
  };

  if (redis) {
    try {
      await redis.set(cacheKey, result, { ex: CACHE_TTL });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json(result);
}
