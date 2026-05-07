import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export type ProjectionCardRequestBody = {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  week: number;
  season: string;
  tfoScore: number;
  grade: string;
  verdict: string;
  projectedPoints: { low: number; high: number };
  matchupGrade: number;
  opponent: string;
  weather: { temp: number; condition: string; score: number };
  flags: string[];
  reasoning: string;
  startScore: number;
};

export type ProjectionCardData = {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  week: number;
  tfoScore: number;
  grade: string;
  verdict: string;
  startScore: number;
  projLow: number;
  projHigh: number;
  opponent: string;
  matchupGrade: number;
  weatherCondition: string;
  weatherTemp: number;
  flags: string[];
  reasoning: string;
  caption: string;
  matchupLabel: string;
  weatherIcon: string;
  verdictColor: string;
  gradeColor: string;
  brandTag: string;
};

const REDIS_EX = 86400;
const BRAND_TAG = 'thefrontoffice.app';

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function weatherIconFrom(condition: string, score: number): string {
  const c = condition.toLowerCase();
  if (score >= 95 || c.includes('dome')) return '🏟️';
  if (c.includes('snow')) return '❄️';
  if (c.includes('rain')) return '🌧️';
  if (c.includes('cloud')) return '🌫️';
  return '☀️';
}

function verdictColorHex(verdict: string): string {
  const v = verdict.trim().toUpperCase();
  if (v === 'START') return '#36E7A1';
  if (v === 'FLEX') return '#FBBF24';
  if (v === 'SIT') return '#EF4444';
  return '#94A3B8';
}

function gradeColorHex(grade: string): string {
  const g = grade.trim().toUpperCase();
  if (g === 'ELITE') return '#36E7A1';
  if (g === 'HIGH_VALUE') return '#22D3EE';
  if (g === 'VIABLE') return '#FBBF24';
  if (g === 'SPECULATIVE') return '#94A3B8';
  if (g === 'AVOID') return '#EF4444';
  return '#94A3B8';
}

function captionFrom(body: ProjectionCardRequestBody): string {
  const name = body.playerName.trim();
  const v = body.verdict.trim().toUpperCase();
  const lo = body.projectedPoints.low;
  const hi = body.projectedPoints.high;
  const tfo = Math.round(body.tfoScore);
  const opp = body.opponent.trim() || 'BYE';
  const suffix = ` | ${BRAND_TAG}`;

  const one = (s: string) => s.replace(/\s+/g, ' ').trim();

  if (v === 'START' && body.startScore >= 90) {
    return one(`${name} is a LOCK this week. TFO ${tfo} | ${lo}–${hi} pts proj${suffix}`);
  }
  if (v === 'START' && body.startScore >= 75) {
    return one(`Start ${name} with confidence. Favorable matchup vs ${opp}. ${lo}–${hi} pts projected${suffix}`);
  }
  if (v === 'FLEX') {
    return one(`${name} is a week-by-week call. TFO model says: ${body.reasoning.trim()}${suffix}`);
  }
  if (v === 'SIT') {
    const flag = body.flags[0]?.trim() || 'Downside risk flagged';
    return one(`Sit ${name} this week. ${flag} — trust the model.${suffix}`);
  }
  return one(`${name} · Week ${body.week} · TFO ${tfo}${suffix}`);
}

/** Requires playerId, playerName, position, week; coerces remaining fields with defaults. */
function validateBody(raw: unknown): ProjectionCardRequestBody | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const playerId = typeof o.playerId === 'string' ? o.playerId.trim() : '';
  const playerName = typeof o.playerName === 'string' ? o.playerName.trim() : '';
  const position = typeof o.position === 'string' ? o.position.trim() : '';
  const week = Number(o.week);
  if (!playerId || !playerName || !position || !Number.isFinite(week)) return null;

  const team = typeof o.team === 'string' ? o.team.trim() : '';
  const season =
    typeof o.season === 'string' && o.season.trim() ? o.season.trim() : String(new Date().getFullYear());
  const grade = typeof o.grade === 'string' && o.grade.trim() ? o.grade.trim() : 'SPECULATIVE';
  const verdict = typeof o.verdict === 'string' && o.verdict.trim() ? o.verdict.trim() : 'FLEX';
  const opponent = typeof o.opponent === 'string' ? o.opponent.trim() : '';
  const reasoning = typeof o.reasoning === 'string' ? o.reasoning.trim() : '';

  const tfoN = Number(o.tfoScore);
  const tfoScore = Number.isFinite(tfoN) ? tfoN : 0;
  const mgN = Number(o.matchupGrade);
  const matchupGrade = Number.isFinite(mgN) ? mgN : 50;
  const ssN = Number(o.startScore);
  const startScore = Number.isFinite(ssN) ? ssN : 0;

  const proj = o.projectedPoints as Record<string, unknown> | undefined;
  const low = proj && typeof proj.low === 'number' && Number.isFinite(proj.low) ? proj.low : 0;
  const high = proj && typeof proj.high === 'number' && Number.isFinite(proj.high) ? proj.high : 0;

  const wx = o.weather as Record<string, unknown> | undefined;
  const temp =
    wx && typeof wx.temp === 'number' && Number.isFinite(wx.temp) ? wx.temp : 65;
  const wxScore =
    wx && typeof wx.score === 'number' && Number.isFinite(wx.score) ? wx.score : 70;
  const condition = wx && typeof wx.condition === 'string' ? wx.condition : '';

  const flags = Array.isArray(o.flags) ? o.flags.filter((f): f is string => typeof f === 'string') : [];

  return {
    playerId,
    playerName,
    position,
    team,
    week,
    season,
    tfoScore,
    grade,
    verdict,
    projectedPoints: { low, high },
    matchupGrade,
    opponent,
    weather: { temp, condition, score: wxScore },
    flags,
    reasoning,
    startScore,
  };
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

    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const body = validateBody(raw);
    if (!body) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    const redis = getRedis();
    const cacheKey = `card:projection:${body.playerId}:${body.week}`;
    if (redis) {
      try {
        const hit = await redis.get<ProjectionCardData>(cacheKey);
        if (hit?.playerId && hit.caption) {
          return NextResponse.json(hit);
        }
      } catch {
        /* miss */
      }
    }

    const opp = body.opponent.trim();

    const cardData: ProjectionCardData = {
      playerId: body.playerId,
      playerName: body.playerName,
      position: body.position,
      team: body.team,
      week: body.week,
      tfoScore: Math.round(body.tfoScore * 10) / 10,
      grade: body.grade,
      verdict: body.verdict.trim().toUpperCase(),
      startScore: Math.round(body.startScore * 10) / 10,
      projLow: Math.round(body.projectedPoints.low * 10) / 10,
      projHigh: Math.round(body.projectedPoints.high * 10) / 10,
      opponent: body.opponent,
      matchupGrade: Math.round(body.matchupGrade * 10) / 10,
      weatherCondition: body.weather.condition,
      weatherTemp: body.weather.temp,
      flags: body.flags,
      reasoning: body.reasoning,
      caption: captionFrom(body),
      matchupLabel: !opp || opp === '—' ? 'BYE' : `vs ${opp}`,
      weatherIcon: weatherIconFrom(body.weather.condition, body.weather.score),
      verdictColor: verdictColorHex(body.verdict),
      gradeColor: gradeColorHex(body.grade),
      brandTag: BRAND_TAG,
    };

    if (redis) {
      try {
        await redis.set(cacheKey, cardData, { ex: REDIS_EX });
      } catch (e) {
        console.error('projection card redis set:', e);
      }
    }

    return NextResponse.json(cardData);
  } catch (err) {
    console.error('projection card:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
