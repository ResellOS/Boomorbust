import { Redis } from '@upstash/redis';

const REDIS_KEY = 'sleeper:players:nfl';
const TTL = 86400; // 24 hours

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
  status: string;
}

export type PlayerMap = Record<string, SleeperPlayer>;
export type PlayerSummary = Pick<SleeperPlayer, 'full_name' | 'position' | 'team' | 'age' | 'injury_status'>;

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

async function fetchFresh(): Promise<PlayerMap | null> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl');
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error('Failed to fetch Sleeper player database:', err);
    return null;
  }
}

export async function fetchAllPlayers(): Promise<PlayerMap | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<PlayerMap>(REDIS_KEY);
      if (cached) return cached;
    } catch (err) {
      console.error('Redis get failed:', err);
    }
  }

  const players = await fetchFresh();
  if (players && redis) {
    try {
      await redis.set(REDIS_KEY, players, { ex: TTL });
    } catch (err) {
      console.error('Redis set failed:', err);
    }
  }
  return players;
}

export async function getPlayersByIds(
  playerIds: string[]
): Promise<Record<string, PlayerSummary>> {
  if (!playerIds.length) return {};
  const all = await fetchAllPlayers();
  if (!all) return {};

  const result: Record<string, PlayerSummary> = {};
  for (const id of playerIds) {
    const p = all[id];
    if (p) {
      result[id] = {
        full_name: p.full_name,
        position: p.position,
        team: p.team,
        age: p.age,
        injury_status: p.injury_status,
      };
    }
  }
  return result;
}
