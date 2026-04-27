import { Redis } from '@upstash/redis';

export interface PlayerProjection {
  player_name: string;
  team: string;
  projected_points: number;
  passing_yards?: number;
  passing_tds?: number;
  rushing_yards?: number;
  rushing_tds?: number;
  receiving_yards?: number;
  receiving_tds?: number;
  receptions?: number;
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

function parseProjectionTable(html: string, position: string): PlayerProjection[] {
  const results: PlayerProjection[] = [];
  // Parse the main projection table — FantasyPros embeds data in #data tbody
  const tableMatch = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/);
  if (!tableMatch) return results;

  const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/g) ?? [];
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/g) ?? []).map((td) =>
      td.replace(/<[^>]+>/g, '').trim()
    );
    if (cells.length < 3) continue;

    const nameCell = cells[0];
    const name = nameCell.replace(/\(.*?\)/g, '').trim();
    const teamMatch = nameCell.match(/\(([A-Z]{2,4})\)/);
    const team = teamMatch?.[1] ?? '';

    const pts = parseFloat(cells[cells.length - 1]) || 0;
    if (!name || !pts) continue;

    const proj: PlayerProjection = { player_name: name, team, projected_points: pts };

    if (position === 'QB') {
      proj.passing_yards = parseFloat(cells[2]) || 0;
      proj.passing_tds = parseFloat(cells[4]) || 0;
      proj.rushing_yards = parseFloat(cells[6]) || 0;
      proj.rushing_tds = parseFloat(cells[7]) || 0;
    } else if (position === 'RB') {
      proj.rushing_yards = parseFloat(cells[2]) || 0;
      proj.rushing_tds = parseFloat(cells[3]) || 0;
      proj.receptions = parseFloat(cells[4]) || 0;
      proj.receiving_yards = parseFloat(cells[5]) || 0;
      proj.receiving_tds = parseFloat(cells[6]) || 0;
    } else if (position === 'WR' || position === 'TE') {
      proj.receptions = parseFloat(cells[2]) || 0;
      proj.receiving_yards = parseFloat(cells[3]) || 0;
      proj.receiving_tds = parseFloat(cells[4]) || 0;
    }

    results.push(proj);
  }
  return results;
}

export async function getProjections(
  week: number,
  position: string
): Promise<PlayerProjection[]> {
  const pos = position.toUpperCase();
  const cacheKey = `projections:${week}:${pos}`;
  const redis = getRedis();

  if (redis) {
    try {
      const cached = await redis.get<PlayerProjection[]>(cacheKey);
      if (cached) return cached;
    } catch {}
  }

  try {
    const url = `https://www.fantasypros.com/nfl/projections/${pos.toLowerCase()}.php?week=${week}&scoring=PPR`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DynastyApp/1.0)',
        Accept: 'text/html',
      },
    });
    if (!res.ok) return [];

    const html = await res.text();
    const projections = parseProjectionTable(html, pos);

    if (projections.length && redis) {
      try { await redis.set(cacheKey, projections, { ex: 3600 }); } catch {}
    }
    return projections;
  } catch (err) {
    console.error(`FantasyPros fetch failed week=${week} pos=${pos}:`, err);
    return [];
  }
}
