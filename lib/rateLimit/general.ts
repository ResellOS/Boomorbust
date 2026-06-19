import { Redis } from '@upstash/redis';

export interface GeneralRateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
  used: number;
}

let _redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redis;
}

/** Sliding-window style counter via Redis INCR + EXPIRE (IP + bucket). */
export async function checkGeneralRateLimit(
  bucket: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<GeneralRateLimitResult> {
  const redis = getRedis();
  const safeId = identifier.replace(/[^a-zA-Z0-9.:_-]/g, '_').slice(0, 128);

  if (!redis) {
    return { allowed: true, remaining: limit, limit, retryAfterSec: windowSec, used: 0 };
  }

  const key = `ratelimit:${bucket}:${safeId}`;
  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, windowSec);
    }
    const ttl = await redis.ttl(key);
    const retryAfterSec = ttl > 0 ? ttl : windowSec;
    const remaining = Math.max(0, limit - used);
    return {
      allowed: used <= limit,
      remaining,
      limit,
      retryAfterSec,
      used,
    };
  } catch {
    return { allowed: true, remaining: limit, limit, retryAfterSec: windowSec, used: 0 };
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

/** Presets used by middleware and route handlers. */
export const RATE_LIMIT_PRESETS = {
  auth: { bucket: 'auth', limit: 30, windowSec: 15 * 60 },
  sync: { bucket: 'sync', limit: 20, windowSec: 60 * 60 },
  feedback: { bucket: 'feedback', limit: 5, windowSec: 60 * 60 },
} as const;

export type RateLimitPreset = keyof typeof RATE_LIMIT_PRESETS;

export async function checkPresetRateLimit(
  preset: RateLimitPreset,
  identifier: string,
): Promise<GeneralRateLimitResult> {
  const cfg = RATE_LIMIT_PRESETS[preset];
  return checkGeneralRateLimit(cfg.bucket, identifier, cfg.limit, cfg.windowSec);
}

export function rateLimit429Response(result: GeneralRateLimitResult) {
  return {
    error: 'Too many requests. Try again later.',
    retryAfterSec: result.retryAfterSec,
  };
}
