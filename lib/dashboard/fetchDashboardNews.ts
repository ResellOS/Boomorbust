import { fetchTrendingPlayers } from '@/lib/sleeper';
import { getVerdict } from '@/lib/verdict';
import type { DashboardNewsItem } from './rotation';

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
}

function parseRss(xml: string, source: string, limit: number): DashboardNewsItem[] {
  const items: DashboardNewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title = stripTags(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
    const link = stripTags(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? '');
    const pub = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ?? '';
    if (!title || !link) continue;
    items.push({
      id: `${source}-${items.length}-${link.slice(-12)}`,
      playerHighlight: title.split(/[-–:]/)[0]?.trim() ?? title,
      highlightColor: '#6b7a99',
      headline: title,
      source,
      url: link,
      publishedAt: pub ? new Date(pub).getTime() : Date.now(),
    });
  }
  return items;
}

function matchPlayer(
  headline: string,
  metaByPlayer: Map<string, { name: string; position: string; team: string; tfoScore: number }>,
): { playerId: string; highlight: string; color: string } | null {
  const lower = headline.toLowerCase();
  for (const [pid, meta] of Array.from(metaByPlayer.entries())) {
    const name = meta.name.toLowerCase();
    if (name.length > 3 && lower.includes(name)) {
      const v = getVerdict(meta.tfoScore);
      return {
        playerId: pid,
        highlight: `${meta.name} (${meta.position} ${meta.team})`,
        color: v.color,
      };
    }
  }
  return null;
}

export async function fetchDashboardNews(
  metaByPlayer: Map<string, { name: string; position: string; team: string; tfoScore: number }>,
  rosterIds: Set<string>,
  allMode: boolean,
): Promise<DashboardNewsItem[]> {
  const collected: DashboardNewsItem[] = [];

  try {
    const trending = (await fetchTrendingPlayers('add', 48, 15)) ?? [];
    for (const t of trending) {
      const meta = metaByPlayer.get(t.player_id);
      if (!meta && !allMode) continue;
      if (!allMode && !rosterIds.has(t.player_id)) continue;
      const v = getVerdict(meta?.tfoScore ?? 65);
      collected.push({
        id: `sleeper-${t.player_id}`,
        playerId: t.player_id,
        playerHighlight: meta
          ? `${meta.name} (${meta.position} ${meta.team})`
          : 'Trending Player',
        highlightColor: v.color,
        headline: `${meta?.name ?? 'Player'} trending on waivers — ${t.count} adds in 48h`,
        source: 'Sleeper',
        url: 'https://sleeper.com',
        publishedAt: Date.now() - 3600_000,
      });
    }
  } catch {
    /* optional source */
  }

  const feeds = [
    { url: 'https://www.espn.com/espn/rss/nfl/news', source: 'ESPN' },
    { url: 'https://www.nfl.com/rss/rsslanding?searchString=news', source: 'NFL.com' },
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, { next: { revalidate: 300 } });
      if (!res.ok) continue;
      const xml = await res.text();
      const parsed = parseRss(xml, feed.source, 12);
      for (const item of parsed) {
        const match = matchPlayer(item.headline, metaByPlayer);
        if (match) {
          if (!allMode && !rosterIds.has(match.playerId)) continue;
          item.playerId = match.playerId;
          item.playerHighlight = match.highlight;
          item.highlightColor = match.color;
        } else if (!allMode) {
          continue;
        }
        collected.push(item);
      }
    } catch {
      /* skip failed feed */
    }
  }

  collected.sort((a, b) => b.publishedAt - a.publishedAt);
  return collected.slice(0, 20);
}

export function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.max(1, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}
