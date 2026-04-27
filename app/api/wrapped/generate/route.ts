import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchTransactions } from '@/lib/sleeper';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { randomBytes } from 'crypto';

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name, total_rosters')
    .eq('user_id', user.id);

  if (!leagues?.length) return NextResponse.json({ error: 'No leagues synced' }, { status: 400 });

  // Fetch rosters to get user's roster_ids
  const rosterRows = await Promise.all(
    leagues.map(async (lg) => {
      const { data } = await supabase
        .from('rosters')
        .select('roster_id, players')
        .eq('league_id', lg.id)
        .limit(1)
        .single();
      return { league_id: lg.id, league_name: lg.name, roster_id: data?.roster_id as number, players: (data?.players ?? []) as string[] };
    })
  );

  // Fetch transactions for all leagues (weeks 1-18)
  const txByLeague = await Promise.all(
    leagues.map(async (lg) => {
      const weekTxs = await Promise.all(
        Array.from({ length: 18 }, (_, i) => fetchTransactions(lg.id, i + 1))
      );
      return weekTxs.flatMap((t) => t ?? []);
    })
  );

  const allPlayers = Array.from(new Set(rosterRows.flatMap((r) => r.players)));
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allPlayers.slice(0, 200)),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  // Aggregate stats
  let totalTrades = 0;
  let totalAdds = 0;
  let totalDrops = 0;
  const addedPlayers: Array<{ id: string; name: string; ktc: number }> = [];

  for (let li = 0; li < leagues.length; li++) {
    const rosterInfo = rosterRows[li];
    const txs = txByLeague[li];

    for (const tx of txs) {
      if (tx.type === 'trade') totalTrades++;
      if (tx.type === 'free_agent' || tx.type === 'waiver') {
        const adds = Object.keys(tx.adds ?? {});
        const drops = Object.keys(tx.drops ?? {});
        if (rosterInfo?.roster_id && adds.some((id) => tx.adds?.[id] === rosterInfo.roster_id)) {
          totalAdds++;
          for (const id of adds) {
            if (tx.adds?.[id] === rosterInfo.roster_id && playerData[id]) {
              const p = playerData[id];
              addedPlayers.push({ id, name: p.full_name, ktc: ktcMap[p.full_name.toLowerCase()] ?? 0 });
            }
          }
        }
        if (rosterInfo?.roster_id && drops.some((id) => tx.drops?.[id] === rosterInfo.roster_id)) {
          totalDrops++;
        }
      }
    }
  }

  // Top pickup by KTC value
  const bestPickup = addedPlayers.sort((a, b) => b.ktc - a.ktc)[0] ?? null;

  // Build roster top players
  const topAssets = allPlayers
    .map((id) => ({ id, p: playerData[id], ktc: ktcMap[playerData[id]?.full_name.toLowerCase() ?? ''] ?? 0 }))
    .filter((x) => x.p)
    .sort((a, b) => b.ktc - a.ktc)
    .slice(0, 5)
    .map((x) => ({ name: x.p!.full_name, position: x.p!.position, ktc: x.ktc }));

  const totalRosterValue = allPlayers.reduce((sum, id) => {
    const p = playerData[id];
    return sum + (p ? ktcMap[p.full_name.toLowerCase()] ?? 0 : 0);
  }, 0);

  const wrappedData = {
    season: '2025',
    league_count: leagues.length,
    total_trades: totalTrades,
    total_adds: totalAdds,
    total_drops: totalDrops,
    total_roster_value: Math.round(totalRosterValue),
    best_pickup: bestPickup,
    top_assets: topAssets,
    leagues: leagues.map((l) => l.name),
    generated_at: new Date().toISOString(),
  };

  const token = randomBytes(12).toString('hex');

  await supabase.from('wrapped_results').upsert(
    { user_id: user.id, season: '2025', token, data: wrappedData },
    { onConflict: 'user_id,season' }
  );

  return NextResponse.json({ token, data: wrappedData });
}
