/**
 * Seeds the Supabase `players` table from the Sleeper NFL player universe.
 * Filters to skill positions (QB/RB/WR/TE) + K/DEF for completeness.
 * Runs weekly via cron (Monday midnight).
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { Redis } from '@upstash/redis';

const REDIS_KEY = 'sleeper:players:nfl';
const SEED_TTL = 86400 * 7; // 7 days

const RELEVANT_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DEF']);
const ACTIVE_STATUSES = new Set(['Active', 'Injured Reserve', 'PUP', 'NFI', 'Practice Squad', '']);

interface SleeperRawPlayer {
  player_id?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string | null;
  age?: number | null;
  status?: string;
  depth_chart_order?: number | null;
  injury_status?: string | null;
  search_rank?: number | null;
  years_exp?: number | null;
  college?: string | null;
  active?: boolean;
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

async function fetchFromSleeper(): Promise<Record<string, SleeperRawPlayer> | null> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      headers: { 'User-Agent': 'BoomOrBust/1.0' },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, SleeperRawPlayer>>;
  } catch (err) {
    console.error('[seedPlayers] Sleeper fetch failed:', err);
    return null;
  }
}

export interface SeedResult {
  count: number;
  upserted: number;
  skipped: number;
  errors: string[];
}

export async function seedPlayers(): Promise<SeedResult> {
  const result: SeedResult = { count: 0, upserted: 0, skipped: 0, errors: [] };

  const raw = await fetchFromSleeper();
  if (!raw) {
    result.errors.push('Failed to fetch from Sleeper API');
    return result;
  }

  result.count = Object.keys(raw).length;

  // Filter to relevant, non-empty entries
  const rows = Object.entries(raw)
    .filter(([, p]) => {
      if (!p.full_name?.trim()) return false;
      const pos = (p.position ?? '').toUpperCase();
      if (!RELEVANT_POSITIONS.has(pos)) return false;
      // Keep active + recently active (status empty = practice squad / unsigned)
      const status = p.status ?? '';
      return ACTIVE_STATUSES.has(status) || status === '' || p.active === true;
    })
    .map(([pid, p]) => ({
      player_id: pid,
      full_name: p.full_name!.trim(),
      first_name: p.first_name?.trim() ?? null,
      last_name: p.last_name?.trim() ?? null,
      position: (p.position ?? 'WR').toUpperCase(),
      team: p.team ?? null,
      age: p.age ?? null,
      status: p.status ?? 'active',
      depth_chart_order: p.depth_chart_order ?? null,
      injury_status: p.injury_status ?? null,
      search_rank: p.search_rank ?? null,
      years_exp: p.years_exp ?? null,
      college: p.college ?? null,
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    result.errors.push('No skill-position players returned after filter');
    return result;
  }

  const db = createAdminClient();
  const BATCH = 250;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    try {
      const { error } = await db
        .from('players')
        .upsert(batch, { onConflict: 'player_id' });
      if (error) {
        result.errors.push(`batch ${Math.floor(i / BATCH)}: ${error.message}`);
        result.skipped += batch.length;
      } else {
        result.upserted += batch.length;
      }
    } catch (err) {
      result.errors.push(`batch ${Math.floor(i / BATCH)} exception: ${String(err)}`);
      result.skipped += batch.length;
    }
  }

  // Bust Redis player cache so next fetch picks up fresh data
  const redis = getRedis();
  if (redis) {
    try {
      await redis.del(REDIS_KEY);
      await redis.set('metrics:pipeline:seed_players', new Date().toISOString(), { ex: SEED_TTL });
    } catch { /* non-fatal */ }
  }

  return result;
}
