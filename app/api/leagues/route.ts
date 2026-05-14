import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeagueSummary {
  id: string;
  name: string;
  season: string;
  totalRosters: number;
}

export interface LeaguesListResponse {
  /**
   * User's "primary" leagues — shown in the MY LEAGUES section.
   * Currently the first ceil(n/2) leagues ordered by season desc, name asc.
   * Will be driven by a `is_primary` flag on the leagues table in a future migration.
   */
  myLeagues: LeagueSummary[];
  /**
   * Secondary / specialty leagues — shown in the OTHER LEAGUES section.
   * Hidden section if empty.
   */
  otherLeagues: LeagueSummary[];
}

// ─── Route ───────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from('leagues')
    .select('id, name, season, total_rosters')
    .eq('user_id', user.id)
    .order('season', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const all: LeagueSummary[] = (rows ?? []).map((r) => ({
    id:           String(r.id),
    name:         r.name ?? 'Unnamed League',
    season:       r.season ? String(r.season) : '',
    totalRosters: r.total_rosters ?? 0,
  }));

  // Split: first ⌈n/2⌉ are "primary", remainder are "other".
  // This produces MY LEAGUES ≈ 6–8 items for a 15-league manager — matching
  // the sidebar mockup — without requiring a DB schema change today.
  const splitIdx = Math.ceil(all.length / 2);
  const myLeagues    = all.slice(0, splitIdx);
  const otherLeagues = all.slice(splitIdx);

  const res: LeaguesListResponse = { myLeagues, otherLeagues };
  return NextResponse.json(res);
}
