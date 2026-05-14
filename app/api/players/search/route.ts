import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import type { PlayerSearchHit } from '@/components/scouting/types';

export const dynamic = 'force-dynamic';

function scoreMatch(name: string, q: string): number {
  const n = name.toLowerCase();
  const qq = q.toLowerCase();
  if (n === qq) return 0;
  if (n.startsWith(qq)) return 1;
  const idx = n.indexOf(qq);
  if (idx === -1) return 999;
  return 10 + idx;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (q.length < 2) {
    return NextResponse.json({ results: [] satisfies PlayerSearchHit[] });
  }

  const all = await fetchAllPlayers();
  if (!all) {
    return NextResponse.json({ results: [] satisfies PlayerSearchHit[] });
  }

  const hits: { s: number; h: PlayerSearchHit }[] = [];
  for (const [playerId, p] of Object.entries(all)) {
    if (!p.full_name || p.position === 'DEF') continue;
    if (!p.full_name.toLowerCase().includes(q.toLowerCase())) continue;
    hits.push({
      s: scoreMatch(p.full_name, q),
      h: {
        playerId,
        full_name: p.full_name,
        position: p.position,
        team: p.team,
      },
    });
    if (hits.length > 80) break;
  }

  hits.sort((a, b) => a.s - b.s || a.h.full_name.localeCompare(b.h.full_name));
  const results = hits.slice(0, 20).map((x) => x.h);

  return NextResponse.json({ results });
}
