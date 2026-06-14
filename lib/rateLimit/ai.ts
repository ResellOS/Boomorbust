import { Redis } from '@upstash/redis';

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

const AI_LIMITS: Record<string, number> = {
  free: 3,
  pro: 15,
  rookie: 15,
  veteran: 50,
  elite: 50,
  all_pro_terminal: 200,
};

const COUNTER_LIMITS: Record<string, number | null> = {
  free: 0,
  pro: 0,
  rookie: 0,
  veteran: 20,
  elite: 20,
  all_pro_terminal: null, // unlimited
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
  used: number;
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function endOfDayUTC(): Date {
  const d = new Date();
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date();
  midnight.setUTCDate(midnight.getUTCDate() + 1);
  midnight.setUTCHours(0, 0, 0, 0);
  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
}

export async function checkAIRateLimit(
  userId: string,
  tier: string,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const tierKey = tier.toLowerCase();
  const limit = AI_LIMITS[tierKey] ?? AI_LIMITS.free;
  const resetAt = endOfDayUTC();

  if (!redis) {
    return { allowed: true, remaining: limit, limit, resetAt, used: 0 };
  }

  const key = `ratelimit:ai:${userId}:${todayKey()}`;
  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, secondsUntilMidnight());
    }
    const remaining = Math.max(0, limit - used);
    return {
      allowed: used <= limit,
      remaining,
      limit,
      resetAt,
      used,
    };
  } catch {
    return { allowed: true, remaining: limit, limit, resetAt, used: 0 };
  }
}

export async function checkCounterRateLimit(
  userId: string,
  tier: string,
): Promise<RateLimitResult> {
  const redis = getRedis();
  const tierKey = tier.toLowerCase();
  const limitVal = COUNTER_LIMITS[tierKey];
  const resetAt = endOfDayUTC();

  // Unlimited tier
  if (limitVal === null) {
    return { allowed: true, remaining: 999, limit: 999, resetAt, used: 0 };
  }

  // Blocked tiers
  if (limitVal === 0) {
    return { allowed: false, remaining: 0, limit: 0, resetAt, used: 0 };
  }

  const limit = limitVal;

  if (!redis) {
    return { allowed: true, remaining: limit, limit, resetAt, used: 0 };
  }

  const key = `ratelimit:counter:${userId}:${todayKey()}`;
  try {
    const used = await redis.incr(key);
    if (used === 1) {
      await redis.expire(key, secondsUntilMidnight());
    }
    const remaining = Math.max(0, limit - used);
    return {
      allowed: used <= limit,
      remaining,
      limit,
      resetAt,
      used,
    };
  } catch {
    return { allowed: true, remaining: limit, limit, resetAt, used: 0 };
  }
}

export function rateLimitExceededResponse(result: RateLimitResult, tier: string) {
  const upgradeMsg =
    tier === 'all_pro_terminal'
      ? undefined
      : tier === 'veteran' || tier === 'elite'
      ? 'Upgrade to All-Pro for 200 daily BOB Engine queries'
      : tier === 'rookie' || tier === 'pro'
      ? 'Upgrade to Veteran for 50 daily BOB Engine queries'
      : 'Upgrade to Rookie for 15 daily BOB Engine queries';

  return {
    error: 'Daily AI limit reached',
    limit: result.limit,
    resetAt: result.resetAt.toISOString(),
    ...(upgradeMsg ? { upgrade: upgradeMsg } : {}),
  };
}
