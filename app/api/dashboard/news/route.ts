import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchDashboardNews, formatTimeAgo } from '@/lib/dashboard/fetchDashboardNews';

export type NewsItem = {
  id: string;
  headline: string;
  source: string;
  timestamp: string;
  url?: string;
};

export type NewsResponse = {
  items: NewsItem[];
};

export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = Math.min(20, Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? 20)));

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();

  const sleeperUserId = profile?.sleeper_user_id as string | undefined;
  if (!sleeperUserId) {
    return NextResponse.json({ items: [] } satisfies NewsResponse);
  }

  const rosterIds = new Set<string>();
  const metaByPlayer = new Map<
    string,
    { name: string; position: string; team: string; tfoScore: number }
  >();

  const { data: rosters } = await admin
    .from('rosters')
    .select('players')
    .eq('owner_id', sleeperUserId);

  for (const row of rosters ?? []) {
    for (const pid of (row.players as string[] | null) ?? []) {
      if (pid) rosterIds.add(String(pid));
    }
  }

  if (rosterIds.size > 0) {
    const ids = Array.from(rosterIds);
    const batch = 200;
    for (let i = 0; i < ids.length; i += batch) {
      const slice = ids.slice(i, i + batch);
      const { data: players } = await admin
        .from('players')
        .select('id, full_name, position, team')
        .in('id', slice);
      for (const p of players ?? []) {
        metaByPlayer.set(String(p.id), {
          name: p.full_name ?? 'Unknown Player',
          position: (p.position ?? '—').toUpperCase(),
          team: p.team ?? '—',
          tfoScore: 0,
        });
      }
    }
  }

  const raw = await fetchDashboardNews(metaByPlayer, rosterIds, true);
  const items: NewsItem[] = raw.slice(0, limit).map((item) => ({
    id: item.id,
    headline:
      item.headline === 'Trending on Sleeper'
        ? `${item.playerHighlight} — Trending on Sleeper`
        : item.headline,
    source: item.source,
    timestamp: formatTimeAgo(item.publishedAt),
    url: item.url,
  }));

  return NextResponse.json({ items } satisfies NewsResponse);
}
