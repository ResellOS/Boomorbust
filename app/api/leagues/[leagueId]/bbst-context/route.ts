import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchLeagueUsers,
  fetchNflState,
  fetchTransactions,
  type SleeperTransaction,
} from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

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

  const nflState = await fetchNflState();
  const currentWeek = nflState?.week ?? 1;
  const weeksFetched = Array.from({ length: 5 }, (_, i) => Math.max(1, currentWeek - i));

  const perWeek = await Promise.all(
    weeksFetched.map((w) => fetchTransactions(leagueId, w)),
  );

  const byId = new Map<string, SleeperTransaction>();
  for (const arr of perWeek) {
    for (const tx of arr ?? []) {
      if (tx?.transaction_id) byId.set(tx.transaction_id, tx);
    }
  }
  const transactions = Array.from(byId.values()).sort((a, b) => b.created - a.created);

  const [users, playerDb, ktcRows] = await Promise.all([
    fetchLeagueUsers(leagueId),
    fetchAllPlayers(),
    getKTCValues(),
  ]);

  const referencedIds = new Set<string>();
  for (const tx of transactions) {
    if (tx.adds) Object.keys(tx.adds).forEach((id) => referencedIds.add(id));
    if (tx.drops) Object.keys(tx.drops).forEach((id) => referencedIds.add(id));
  }

  const txPlayers: Record<string, { full_name: string; position: string; age: number | null }> =
    {};
  referencedIds.forEach((id) => {
    const p = playerDb?.[id];
    if (!p?.full_name) return;
    txPlayers[id] = {
      full_name: p.full_name,
      position: String(p.position ?? '').toUpperCase(),
      age: p.age ?? null,
    };
  });

  const ktcByNameLower: Record<string, number> = {};
  for (const v of ktcRows) {
    ktcByNameLower[v.player_name.toLowerCase()] = v.ktc_value;
  }

  return NextResponse.json({
    transactions,
    users: (users ?? []).map((u) => ({
      user_id: u.user_id,
      username: u.username,
      display_name: u.display_name,
      avatar: u.avatar,
    })),
    txPlayers,
    ktcByNameLower,
    weeksFetched,
    currentWeek,
  });
}
