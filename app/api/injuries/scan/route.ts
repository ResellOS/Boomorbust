import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPlayersByIds } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { scanAllRosterInjuries } from '@/lib/injuries/broadcaster';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: leagues } = await supabase
    .from('leagues')
    .select('id, name')
    .eq('user_id', user.id);

  if (!leagues?.length) return NextResponse.json([]);

  const rosterResults = await Promise.all(
    leagues.map(async (lg) => {
      const { data } = await supabase
        .from('rosters')
        .select('roster_id, players, starters')
        .eq('league_id', lg.id)
        .single();
      return {
        league_id: lg.id,
        league_name: lg.name,
        roster_id: data?.roster_id ?? 0,
        players: (data?.players ?? []) as string[],
        starters: (data?.starters ?? []) as string[],
      };
    })
  );

  const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players)));
  const [playerData, ktcValues] = await Promise.all([
    getPlayersByIds(allIds),
    getKTCValues(),
  ]);

  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues) ktcMap[v.player_name.toLowerCase()] = v.ktc_value;

  const alerts = scanAllRosterInjuries(rosterResults, playerData, ktcMap);
  return NextResponse.json(alerts);
}
