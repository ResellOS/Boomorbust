import { Redis } from '@upstash/redis';

const MAX_POINTS = 8;
const KEY_PREFIX = 'player_history:';

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

export async function getPlayerValueHistory(playerId: string): Promise<number[]> {
  const redis = getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.get<string>(`${KEY_PREFIX}${playerId}`);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((n): n is number => typeof n === 'number').slice(-MAX_POINTS);
  } catch {
    return [];
  }
}

/** Append BBV/KTC numeric snapshot; trims to last 8 values. Called after KTC sync when values are keyed by player_id. */
export async function appendPlayerValueSnapshot(playerId: string, value: number): Promise<void> {
  const redis = getRedis();
  if (!redis || !Number.isFinite(value)) return;
  try {
    const prev = await getPlayerValueHistory(playerId);
    const next = [...prev, value].slice(-MAX_POINTS);
    await redis.set(`${KEY_PREFIX}${playerId}`, JSON.stringify(next), { ex: 60 * 60 * 24 * 120 });
  } catch {
    /* noop */
  }
}
