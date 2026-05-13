/**
 * Empire Score engine.
 *
 * EMPIRE SCORE = Σ(Player KTC Value) filtered by owner_id across all Sleeper leagues.
 * De-duplicated: each player counted once even if rostered across multiple leagues.
 *
 * Storage:
 *   Redis key  'empire:{userId}'        → cached score, TTL 6 hrs
 *   Redis key  'empire:history:{userId}'→ JSON array of {date, score}, last 30 days
 *   Redis zset 'empire:leaderboard'     → sorted set, score=empireScore, member=userId
 */

import { Redis } from '@upstash/redis';
import { createAdminClient } from '@/lib/supabase/admin';
import { getKTCValues } from '@/lib/values/ktc';
import { fetchAllPlayers } from '@/lib/sleeper/players';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface EmpireScoreResult {
  userId: string;
  empireScore: number;
  /** Number of distinct players included in the score. */
  playerCount: number;
  /** Formatted display string: "142,800" */
  display: string;
  calculated_at: string;
}

export interface EmpireHistoryEntry {
  date: string;   // ISO date string YYYY-MM-DD
  score: number;
}

export interface EmpireRank {
  rank: number;
  total: number;
  percentile: number;
}

// ─── Redis helpers ─────────────────────────────────────────────────────────────

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

const SCORE_TTL = 21600;          // 6 hours
const LEADERBOARD_KEY = 'empire:leaderboard';
const HISTORY_MAX_DAYS = 30;

function scoreKey(userId: string): string {
  return `empire:${userId}`;
}

function historyKey(userId: string): string {
  return `empire:history:${userId}`;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── KTC lookup by Sleeper player_id ─────────────────────────────────────────

async function buildKtcByPlayerId(): Promise<Map<string, number>> {
  const [allPlayers, ktcList] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  // Build name → ktc map
  const ktcByName = new Map<string, number>();
  for (const v of ktcList ?? []) {
    if (v.player_name) ktcByName.set(v.player_name.toLowerCase(), v.ktc_value);
  }

  // Map Sleeper player_id → ktc value via full_name lookup
  const byId = new Map<string, number>();
  if (!allPlayers) return byId;

  for (const [pid, raw] of Object.entries(allPlayers)) {
    const p = raw as { full_name?: string; position?: string };
    if (!p.full_name) continue;
    const pos = (p.position ?? '').toUpperCase();
    if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
    const ktc = ktcByName.get(p.full_name.toLowerCase()) ?? 0;
    byId.set(pid, ktc);
  }

  return byId;
}

// ─── calculateEmpireScore ──────────────────────────────────────────────────────

export async function calculateEmpireScore(userId: string): Promise<EmpireScoreResult> {
  const redis = getRedis();

  // Check cache
  if (redis) {
    try {
      const cached = await redis.get<EmpireScoreResult>(scoreKey(userId));
      if (cached) return cached;
    } catch { /* fall through */ }
  }

  const supabase = createAdminClient();

  // Resolve Sleeper user_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  const sleeperUserId = (profile as { sleeper_user_id?: string } | null)?.sleeper_user_id;
  if (!sleeperUserId) {
    return _emptyResult(userId);
  }

  // Collect all rosters owned by this user across all leagues
  const { data: rosters } = await supabase
    .from('rosters')
    .select('players')
    .eq('owner_id', sleeperUserId);

  if (!rosters || rosters.length === 0) {
    return _emptyResult(userId);
  }

  // De-duplicate player IDs (same player may appear in multiple leagues)
  const uniquePlayerIds = new Set<string>();
  for (const r of rosters as { players: string[] | null }[]) {
    for (const pid of r.players ?? []) {
      if (pid) uniquePlayerIds.add(pid);
    }
  }

  if (uniquePlayerIds.size === 0) return _emptyResult(userId);

  // Build KTC lookup
  const ktcById = await buildKtcByPlayerId();

  // Sum KTC values
  let empireScore = 0;
  Array.from(uniquePlayerIds).forEach((pid) => {
    empireScore += ktcById.get(pid) ?? 0;
  });

  const calculated_at = new Date().toISOString();

  const result: EmpireScoreResult = {
    userId,
    empireScore: Math.round(empireScore),
    playerCount: uniquePlayerIds.size,
    display: Math.round(empireScore).toLocaleString(),
    calculated_at,
  };

  // Write to cache, history, and leaderboard
  if (redis) {
    try {
      await Promise.all([
        redis.set(scoreKey(userId), result, { ex: SCORE_TTL }),
        _appendHistory(redis, userId, empireScore),
        redis.zadd(LEADERBOARD_KEY, { score: empireScore, member: userId }),
      ]);
    } catch { /* non-fatal */ }
  }

  return result;
}

// ─── History ───────────────────────────────────────────────────────────────────

async function _appendHistory(
  redis: Redis,
  userId: string,
  score: number,
): Promise<void> {
  const key = historyKey(userId);
  const existing = await redis.get<EmpireHistoryEntry[]>(key) ?? [];

  const today = todayISO();
  const filtered = existing.filter((e) => e.date !== today);
  filtered.push({ date: today, score: Math.round(score) });

  // Keep last HISTORY_MAX_DAYS entries
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - HISTORY_MAX_DAYS);
  const trimmed = filtered.filter(
    (e) => new Date(e.date) >= cutoff,
  );

  // Store with no expiry so history survives across 6hr score cache cycles
  await redis.set(key, trimmed);
}

export async function getEmpireHistory(
  userId: string,
): Promise<EmpireHistoryEntry[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    return (await redis.get<EmpireHistoryEntry[]>(historyKey(userId))) ?? [];
  } catch {
    return [];
  }
}

// ─── Sparkline ─────────────────────────────────────────────────────────────────

export async function getEmpireSparkline(userId: string): Promise<number[]> {
  const history = await getEmpireHistory(userId);

  // Get last 7 calendar days in order
  const days: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const entry = history.find((e) => e.date === dateStr);
    days.push(entry?.score ?? 0);
  }

  return days;
}

// ─── Leaderboard ───────────────────────────────────────────────────────────────

export async function getLeaderboardRank(userId: string): Promise<EmpireRank> {
  const redis = getRedis();
  if (!redis) return { rank: 1, total: 1, percentile: 100 };

  try {
    const [rank, total] = await Promise.all([
      // ZREVRANK gives 0-indexed rank (highest score = rank 0)
      redis.zrevrank(LEADERBOARD_KEY, userId),
      redis.zcard(LEADERBOARD_KEY),
    ]);

    const r = (rank ?? 0) + 1;
    const t = total ?? 1;
    const percentile = Math.round(((t - r) / Math.max(t - 1, 1)) * 100);

    return { rank: r, total: t, percentile };
  } catch {
    return { rank: 1, total: 1, percentile: 100 };
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function _emptyResult(userId: string): EmpireScoreResult {
  return {
    userId,
    empireScore: 0,
    playerCount: 0,
    display: '0',
    calculated_at: new Date().toISOString(),
  };
}

/**
 * Force-invalidates the cached score so the next call recalculates.
 * Call this after a Sleeper roster sync.
 */
export async function invalidateEmpireCache(userId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(scoreKey(userId));
  } catch { /* non-fatal */ }
}
