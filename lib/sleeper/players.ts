import { Redis } from '@upstash/redis';

const REDIS_KEY = 'sleeper:players:nfl';
const TTL = 86400; // 24 hours
const MEMORY_TTL_MS = 5 * 60 * 1000; // 5 min — keeps localhost snappy between reloads

export interface SleeperPlayer {
  player_id: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
  status: string;
  depth_chart_order?: number | null;
  depth_chart_position?: string | null;
}

export type PlayerMap = Record<string, SleeperPlayer>;
export type PlayerSummary = Pick<SleeperPlayer, 'full_name' | 'position' | 'team' | 'age' | 'injury_status'>;

let _redis: Redis | null = null;
let _memoryCache: { map: PlayerMap; at: number } | null = null;

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

/** Strip Sleeper's 14MB raw payload to essential fields (~2MB) so Redis + localhost stay fast. */
function slimPlayerMap(raw: Record<string, unknown>): PlayerMap {
  const out: PlayerMap = {};
  for (const [id, row] of Object.entries(raw)) {
    if (!row || typeof row !== 'object') continue;
    const p = row as Record<string, unknown>;
    const fullName = typeof p.full_name === 'string' ? p.full_name.trim() : '';
    if (!fullName) continue;
    out[id] = {
      player_id: id,
      full_name: fullName,
      position: typeof p.position === 'string' ? p.position : '',
      team: typeof p.team === 'string' ? p.team : null,
      age: typeof p.age === 'number' ? p.age : null,
      injury_status: typeof p.injury_status === 'string' ? p.injury_status : null,
      status: typeof p.status === 'string' ? p.status : '',
      depth_chart_order:
        typeof p.depth_chart_order === 'number' ? p.depth_chart_order : null,
      depth_chart_position:
        typeof p.depth_chart_position === 'string' ? p.depth_chart_position : null,
    };
  }
  return out;
}

async function fetchFresh(): Promise<PlayerMap | null> {
  try {
    const res = await fetch('https://api.sleeper.app/v1/players/nfl', {
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Record<string, unknown>;
    return slimPlayerMap(raw);
  } catch (err) {
    console.error('Failed to fetch Sleeper player database:', err);
    return null;
  }
}

export async function fetchAllPlayers(): Promise<PlayerMap | null> {
  if (_memoryCache && Date.now() - _memoryCache.at < MEMORY_TTL_MS) {
    return _memoryCache.map;
  }

  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<PlayerMap>(REDIS_KEY);
      if (cached && Object.keys(cached).length > 0) {
        _memoryCache = { map: cached, at: Date.now() };
        return cached;
      }
    } catch (err) {
      console.error('Redis get failed:', err);
    }
  }

  const players = await fetchFresh();
  if (players) {
    _memoryCache = { map: players, at: Date.now() };
    if (redis) {
      try {
        await redis.set(REDIS_KEY, players, { ex: TTL });
      } catch (err) {
        console.error('Redis set failed:', err);
      }
    }
  }
  return players;
}

/** Best-effort map of requested display names → Sleeper player_id (exact / partial match on normalized full names). */
export async function resolveSleeperIdsByFullNames(queries: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (!queries.length) return map;
  const all = await fetchAllPlayers();
  if (!all) return map;

  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\./g, '')
      .replace(/'/g, '')
      .trim();

  const roster = Object.entries(all).map(([pid, row]) => ({
    id: pid,
    n: norm(row.full_name),
  }));

  for (const q of queries) {
    const qq = norm(q);
    let hit = roster.find((r) => r.n === qq);
    if (!hit) hit = roster.find((r) => r.n.includes(qq) || qq.includes(r.n));
    if (hit) map.set(q, hit.id);
  }

  return map;
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
