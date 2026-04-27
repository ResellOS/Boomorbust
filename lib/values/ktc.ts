import { Redis } from '@upstash/redis';
import Fuse from 'fuse.js';

const REDIS_KEY = 'ktc:dynasty:values';
const TTL = 21600; // 6 hours

export interface KTCPlayer {
  player_name: string;
  slug: string;
  position: string;
  age: number;
  ktc_value: number;
  rank: number;
}

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

async function scrapeKTC(): Promise<KTCPlayer[] | null> {
  try {
    const res = await fetch('https://keeptradecut.com/dynasty-rankings', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DynastyApp/1.0)' },
    });
    if (!res.ok) return null;

    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!match) return null;

    const data = JSON.parse(match[1]);
    // Try common paths where KTC embeds rankings
    const rankings =
      data?.props?.pageProps?.rankings ||
      data?.props?.pageProps?.players ||
      data?.props?.pageProps?.initialRankings;

    if (!Array.isArray(rankings)) return null;

    return rankings
      .filter((p: Record<string, unknown>) => p.playerName && p.value !== undefined)
      .map((p: Record<string, unknown>, i: number) => ({
        player_name: String(p.playerName || p.name || ''),
        slug: String(p.slug || ''),
        position: String(p.position || 'UNK'),
        age: Number(p.age ?? 0),
        ktc_value: Number(p.value ?? 0),
        rank: i + 1,
      }));
  } catch (err) {
    console.error('KTC scrape failed:', err);
    return null;
  }
}

async function fetchDynastyProcess(): Promise<KTCPlayer[] | null> {
  try {
    const res = await fetch('https://dynastyprocess.com/api/values');
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.trim().split('\n');
    const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''));

    return lines
      .slice(1)
      .map((line, i) => {
        const cols = line.split(',').map((c) => c.trim().replace(/"/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = cols[idx] ?? ''; });
        return {
          player_name: row['player'] || row['name'] || '',
          slug: '',
          position: row['pos'] || row['position'] || 'UNK',
          age: parseFloat(row['age'] || '0') || 0,
          ktc_value: parseFloat(row['value_2qb'] || row['value'] || '0') || 0,
          rank: i + 1,
        };
      })
      .filter((p) => p.player_name)
      .sort((a, b) => b.ktc_value - a.ktc_value)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  } catch (err) {
    console.error('DynastyProcess fallback failed:', err);
    return null;
  }
}

export async function getKTCValues(): Promise<KTCPlayer[]> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get<KTCPlayer[]>(REDIS_KEY);
      if (cached) return cached;
    } catch {}
  }

  const players = (await scrapeKTC()) ?? (await fetchDynastyProcess()) ?? [];

  if (players.length && redis) {
    try {
      await redis.set(REDIS_KEY, players, { ex: TTL });
    } catch {}
  }
  return players;
}

let _fuseInstance: Fuse<KTCPlayer> | null = null;
let _fuseData: KTCPlayer[] = [];

export async function getKTCValueForPlayer(playerName: string): Promise<number | null> {
  const players = await getKTCValues();
  if (!players.length) return null;

  if (_fuseData !== players) {
    _fuseInstance = new Fuse(players, { keys: ['player_name'], threshold: 0.35 });
    _fuseData = players;
  }

  const result = _fuseInstance!.search(playerName);
  return result[0]?.item.ktc_value ?? null;
}
