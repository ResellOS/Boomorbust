import { createAdminClient } from '@/lib/supabase/admin';
import { fetchTrendingPlayers } from '@/lib/sleeper';
import { getVerdict } from '@/lib/verdict';
import type { DashboardNewsItem } from './rotation';

function stripTags(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractTag(block: string, tag: string): string {
  const cdata = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i'));
  if (cdata?.[1]) return stripTags(cdata[1]);
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return stripTags(plain?.[1] ?? '');
}

function extractLink(block: string): string {
  const href = block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1];
  if (href) return href.trim();
  const guid = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1];
  if (guid && guid.startsWith('http')) return stripTags(guid);
  return extractTag(block, 'link');
}

function parseRss(xml: string, source: string, limit: number): DashboardNewsItem[] {
  const items: DashboardNewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  for (const block of blocks.slice(0, limit)) {
    const title = extractTag(block, 'title');
    const link = extractLink(block);
    const pub = extractTag(block, 'pubDate') || extractTag(block, 'published');
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

async function resolvePlayerNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (ids.length === 0) return names;

  try {
    const supabase = createAdminClient();
    const batch = 200;
    for (let i = 0; i < ids.length; i += batch) {
      const slice = ids.slice(i, i + batch);
      const { data } = await supabase.from('players').select('id, full_name').in('id', slice);
      for (const row of data ?? []) {
        if (row.full_name) names.set(String(row.id), row.full_name);
      }
    }
  } catch {
    /* optional */
  }
  return names;
}

async function fetchSleeperTrendingNews(
  metaByPlayer: Map<string, { name: string; position: string; team: string; tfoScore: number }>,
): Promise<DashboardNewsItem[]> {
  const trending = (await fetchTrendingPlayers('add', 24, 10)) ?? [];
  if (trending.length === 0) return [];

  const unknownIds = trending
    .map((t) => t.player_id)
    .filter((id) => !metaByPlayer.has(id));
  const nameLookup = await resolvePlayerNames(unknownIds);

  return trending.map((t) => {
    const meta = metaByPlayer.get(t.player_id);
    const name = meta?.name ?? nameLookup.get(t.player_id) ?? 'Player';
    const v = getVerdict(meta?.tfoScore ?? 65);
    return {
      id: `sleeper-trend-${t.player_id}`,
      playerId: t.player_id,
      playerHighlight: name,
      highlightColor: v.color,
      headline: 'Trending on Sleeper',
      source: 'Sleeper',
      url: 'https://sleeper.com',
      publishedAt: Date.now() - 3600_000,
    };
  });
}

// --- Story de-duplication (same story, different outlet) ----------------------
const STOPWORDS = new Set([
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'for', 'with', 'and', 'is', 'at',
  'vs', 'his', 'her', 'as', 'after', 'over', 'into', 'from', 'this', 'that',
  'will', 'has', 'have', 'be', 'are', 'was', 'amid', 'out', 'up',
]);

function headlineTokens(headline: string): Set<string> {
  const norm = headline
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return new Set(norm.split(' ').filter((w) => w.length > 2 && !STOPWORDS.has(w)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const w of Array.from(a)) if (b.has(w)) inter += 1;
  return inter / (a.size + b.size - inter);
}

// Collapse near-duplicate headlines from different outlets, keeping the
// earliest-published copy of each story.
function dedupeStories(items: DashboardNewsItem[]): DashboardNewsItem[] {
  const byEarliest = [...items].sort((a, b) => a.publishedAt - b.publishedAt);
  const kept: { item: DashboardNewsItem; tokens: Set<string> }[] = [];
  for (const item of byEarliest) {
    const tokens = headlineTokens(item.headline);
    const isDup = kept.some((k) => jaccard(k.tokens, tokens) >= 0.55);
    if (!isDup) kept.push({ item, tokens });
  }
  return kept.map((k) => k.item);
}

export async function fetchDashboardNews(
  metaByPlayer: Map<string, { name: string; position: string; team: string; tfoScore: number }>,
  rosterIds: Set<string>,
  allMode: boolean,
): Promise<DashboardNewsItem[]> {
  const collected: DashboardNewsItem[] = [];
  let rssOk = false;

  const feeds = [
    { url: 'https://www.espn.com/espn/rss/nfl/news', source: 'ESPN' },
    { url: 'https://www.nfl.com/rss/rsslanding?searchString=news', source: 'NFL.com' },
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed.url, {
        next: { revalidate: 300 },
        headers: { Accept: 'application/rss+xml, application/xml, text/xml, */*' },
      });
      if (!res.ok) continue;
      const xml = await res.text();
      if (!xml.includes('<item') && !xml.includes('<entry')) continue;
      rssOk = true;
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
    } catch (err) {
      console.error(`[dashboard:news] RSS failed for ${feed.source}:`, err);
    }
  }

  if (!rssOk || collected.length === 0) {
    const fallback = await fetchSleeperTrendingNews(metaByPlayer);
    for (const item of fallback) {
      if (!allMode && item.playerId && !rosterIds.has(item.playerId)) continue;
      collected.push(item);
    }
  } else {
    const trending = await fetchSleeperTrendingNews(metaByPlayer);
    for (const item of trending.slice(0, 6)) {
      if (!allMode && item.playerId && !rosterIds.has(item.playerId)) continue;
      if (collected.some((c) => c.playerId === item.playerId)) continue;
      collected.push(item);
    }
  }

  // Collapse same-story-different-outlet duplicates (keep earliest), then sort.
  const deduped = dedupeStories(collected);
  deduped.sort((a, b) => b.publishedAt - a.publishedAt);
  return deduped.slice(0, 20);
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
