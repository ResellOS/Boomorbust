import { Redis } from '@upstash/redis';

export function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url?.length || !token?.length) return null;
  return new Redis({ url, token });
}
