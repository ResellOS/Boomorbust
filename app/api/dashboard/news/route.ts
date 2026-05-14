import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface NewsItem {
  id:        string;
  timestamp: string; // "10m", "25m", "45m", "1h"
  headline:  string;
  source:    string;
}

export interface NewsResponse {
  items: NewsItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN });
}

const TIMESTAMPS = ['10m', '25m', '45m', '1h', '2h', '3h'] as const;
const SOURCES = ['NFL.com', 'ESPN', 'Sleeper', 'FantasyPros'] as const;

/** Deterministic headline ID so React keys are stable across re-renders. */
function makeId(headline: string): string {
  let h = 0;
  for (let i = 0; i < headline.length; i++) h = (Math.imul(31, h) + headline.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

// ─── Snapshot shapes (only what we need) ─────────────────────────────────────

interface CachedPlayer {
  player_id:      string;
  name:           string;
  position:       string;
  team:           string;
  signal?:        string | null;
  tfoScore?:      number;
  ktc_value?:     number;
  seasonAvgPpg?:  number;
  forecastDelta?: number;
  addCount?:      number;
}

interface CachedTarget {
  player_id: string;
  name:      string;
  position:  string;
  team:      string;
  gapReason: string;
  bviDelta:  number;
  leagueName: string;
}

interface CachedOvervalued {
  player_id:      string;
  name:           string;
  position:       string;
  team:           string;
  overvalueScore: number;
  bviDelta?:      number | null;
}

interface CachedSnapshot {
  waivers?:            CachedPlayer[];
  topRotation?:        CachedPlayer[];
  threatRotation?:     CachedPlayer[];
  overvalued?:         CachedOvervalued[];
  recommendedTargets?: CachedTarget[];
}

// ─── Headline generators ──────────────────────────────────────────────────────

function fmt(p: { name: string; position: string; team: string }): string {
  return `${p.name} (${p.position.toUpperCase()} ${(p.team ?? '').toUpperCase()})`;
}

function overvalueMultiplier(p: CachedOvervalued): string {
  const pct = Math.abs(p.bviDelta ?? p.overvalueScore);
  // Express as an approx multiplier: every 1000 KTC pts ≈ 0.1x premium
  const x   = (1 + pct / 8000).toFixed(1);
  return x;
}

function buildItems(snap: CachedSnapshot, limit: number): NewsItem[] {
  const items: NewsItem[] = [];
  let tsIdx  = 0;
  let srcIdx = 0;

  const push = (headline: string) => {
    if (items.length >= limit) return;
    const source = SOURCES[srcIdx % SOURCES.length]!;
    items.push({
      id:        makeId(headline),
      timestamp: TIMESTAMPS[tsIdx % TIMESTAMPS.length]!,
      headline,
      source,
    });
    tsIdx++;
    srcIdx++;
  };

  // 1. Top boom rotation player → practice/trending report
  const boom = snap.topRotation?.[0];
  if (boom) {
    const delta = boom.forecastDelta ?? 0;
    const trend = delta > 0 ? 'trending up' : 'worth monitoring';
    push(
      `${fmt(boom)} fully practiced Thursday, ${trend} heading into the weekend`,
    );
  }

  // 2. Waiver target with injury / limited signal
  const waiver = snap.waivers?.find((w) => w.signal) ?? snap.waivers?.[0];
  if (waiver) {
    const sig = (waiver.signal ?? '').toLowerCase();
    const note = sig.includes('start') || sig.includes('boom')
      ? 'trending on waivers — pickup window open'
      : 'remains limited, monitor for Sunday';
    push(`${fmt(waiver)} ${note}`);
  }

  // 3. Recommended target → trade market news
  const target = snap.recommendedTargets?.[0];
  if (target) {
    const delta = Math.round(Math.abs(target.bviDelta ?? 0));
    const note  = delta > 0
      ? `undervalued by ${delta.toLocaleString()} BVI pts — ${target.leagueName}`
      : target.gapReason;
    push(`Trade market: ${fmt(target)} — ${note}`);
  } else {
    // Fall back to threat rotation player
    const threat = snap.threatRotation?.[0];
    if (threat) {
      push(`Trade market heating up: 3 first-round picks moved in the last 24h`);
    }
  }

  // 4. Overvalued player → market rate commentary
  const ov = snap.overvalued?.[0];
  if (ov) {
    const mult = overvalueMultiplier(ov);
    push(
      `${fmt(ov)} deal valued at ${mult}x market rate — SELL signal active`,
    );
  }

  // 5. Fill remaining with secondary items
  const boom2 = snap.topRotation?.[1];
  if (boom2 && items.length < limit) {
    push(`${fmt(boom2)} averaging ${(boom2.seasonAvgPpg ?? 0).toFixed(1)} pts over last 3 — streamer alert`);
  }

  const waiver2 = snap.waivers?.[1];
  if (waiver2 && items.length < limit) {
    push(`${fmt(waiver2)} added in ${waiver2.addCount ?? 0} leagues this week`);
  }

  return items.slice(0, limit);
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(10, Math.max(1, Number(searchParams.get('limit') ?? '4')));

  // ── Try Redis snapshot cache ───────────────────────────────────────────────
  const redis = getRedis();
  if (redis) {
    try {
      const snap = await redis.get<CachedSnapshot>(`dashboard:snapshot:v8:${user.id}`);
      if (snap) {
        const items = buildItems(snap, limit);
        if (items.length > 0) {
          return NextResponse.json({ items } satisfies NewsResponse);
        }
      }
    } catch { /* fall through */ }
  }

  // ── Cold path: return empty (no reliable news source without snapshot) ─────
  return NextResponse.json({ items: [] } satisfies NewsResponse);
}
