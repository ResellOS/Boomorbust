import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchLeagueRosters, fetchLeagueUsers } from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

export type LeagueRosterPlayer = {
  player_id: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  ktc: number;
};

export type LeagueManagerRoster = {
  roster_id: number;
  owner_id: string | null;
  username: string | null;
  display_name: string | null;
  team_name: string | null;
  /** Sleeper lineup starter player IDs for this roster (may be empty off-season). */
  starters: string[];
  players: LeagueRosterPlayer[];
};

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ leagueId: string }> },
) {
  const { leagueId } = await context.params;
  if (!leagueId) {
    return NextResponse.json({ error: 'Missing league id' }, { status: 400 });
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: league } = await supabase
    .from('leagues')
    .select('id')
    .eq('id', leagueId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  const [rosters, users, playerDb, ktcRows] = await Promise.all([
    fetchLeagueRosters(leagueId),
    fetchLeagueUsers(leagueId),
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  if (!rosters?.length || !playerDb) {
    return NextResponse.json({ error: 'Failed to fetch league rosters' }, { status: 502 });
  }

  const ktcMap: Record<string, number> = {};
  for (const v of ktcRows) {
    ktcMap[v.player_name.toLowerCase()] = v.ktc_value;
  }

  type UserRow = {
    user_id: string;
    username: string;
    display_name: string;
    avatar: string | null;
    metadata?: Record<string, unknown> | null;
  };

  const userById: Record<string, UserRow> = {};
  for (const u of (users ?? []) as UserRow[]) {
    userById[u.user_id] = u;
  }

  function teamName(ownerId: string | null): string | null {
    if (!ownerId) return null;
    const meta = userById[ownerId]?.metadata;
    const tn = meta?.team_name;
    return typeof tn === 'string' ? tn : null;
  }

  const managers: LeagueManagerRoster[] = rosters.map((r) => {
    const owner = r.owner_id ? userById[r.owner_id] : undefined;
    const players: LeagueRosterPlayer[] = [];

    for (const pid of r.players ?? []) {
      if (!pid || typeof pid !== 'string') continue;
      const p = playerDb[pid];
      if (!p?.full_name) continue;
      const pos = String(p.position ?? '').toUpperCase();
      if (!SKILL.has(pos)) continue;
      const ktc = ktcMap[p.full_name.toLowerCase()] ?? 0;
      players.push({
        player_id: pid,
        name: p.full_name,
        position: pos,
        team: p.team ?? null,
        age: p.age ?? null,
        ktc,
      });
    }

    players.sort((a, b) => b.ktc - a.ktc);

    return {
      roster_id: r.roster_id,
      owner_id: r.owner_id,
      username: owner?.username ?? null,
      display_name: owner?.display_name ?? null,
      team_name: teamName(r.owner_id),
      starters: Array.isArray(r.starters) ? r.starters.filter((id): id is string => typeof id === 'string') : [],
      players,
    };
  });

  return NextResponse.json({ managers });
}
