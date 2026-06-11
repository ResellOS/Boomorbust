import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export interface SyncStatusResponse {
  lastSyncedAt: string | null;
  dataReady: boolean;
  leagueCount: number;
  rosterCount: number;
  /** Coarse sync stage derived from current data state. */
  stage: string;
  /** 0–100 estimate derived from current data state. */
  progress: number;
  playerCount: number;
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // rosters.owner_id holds the Sleeper user id, not the Supabase auth uid —
  // resolve it from the profile before counting rosters.
  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', user.id)
    .maybeSingle();
  const sleeperUserId = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;

  const [leagueRes, rosterRes] = await Promise.all([
    supabase
      .from('leagues')
      .select('synced_at')
      .eq('user_id', user.id)
      .order('synced_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    sleeperUserId
      ? supabase
          .from('rosters')
          .select('roster_id', { count: 'exact', head: true })
          .eq('owner_id', sleeperUserId)
      : null,
  ]);

  const lastSyncedAt = (leagueRes.data as { synced_at?: string } | null)?.synced_at ?? null;
  const rosterCount = rosterRes?.count ?? 0;

  const { count: leagueCount } = await supabase
    .from('leagues')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const dataReady = (leagueCount ?? 0) > 0 && rosterCount > 0;

  // Player count across the user's rosters (cheap: ≤ ~15 rows).
  let playerCount = 0;
  if (sleeperUserId) {
    const { data: rosterRows } = await supabase
      .from('rosters')
      .select('players, player_ids')
      .eq('owner_id', sleeperUserId);
    for (const row of (rosterRows ?? []) as { players?: string[] | null; player_ids?: string[] | null }[]) {
      playerCount += row.players?.length ?? row.player_ids?.length ?? 0;
    }
  }

  let stage = 'connecting';
  let progress = 5;
  if ((leagueCount ?? 0) > 0 && rosterCount === 0) {
    stage = 'importing_leagues';
    progress = 45;
  } else if (dataReady) {
    stage = 'complete';
    progress = 100;
  }

  return NextResponse.json({
    lastSyncedAt,
    dataReady,
    leagueCount: leagueCount ?? 0,
    rosterCount,
    stage,
    progress,
    playerCount,
  } satisfies SyncStatusResponse);
}
