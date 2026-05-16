import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchNflState, fetchLeagueMatchups, type SleeperMatchup } from '@/lib/sleeper';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/** Lightweight payload so empire + portfolio headline can render before the full snapshot finishes. */
export interface DashboardHeroSnapshot {
  userTier: 'free' | 'pro' | 'elite' | 'all_pro_terminal';
  week: number;
  empire: {
    score: number;
    oppScore: number;
    winning: number;
    total: number;
    winProbability: number;
    leaguesCount: number;
    portfolioValue: number;
  };
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [{ data: profile }, { data: leagueRows }] = await Promise.all([
    supabase.from('profiles').select('sleeper_user_id, is_paid, subscription_tier').eq('id', user.id).maybeSingle(),
    supabase
      .from('leagues')
      .select('id, name, season, total_rosters')
      .eq('user_id', user.id)
      .order('season', { ascending: false }),
  ]);

  const leagues = leagueRows ?? [];
  const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;

  let userTier: 'free' | 'pro' | 'elite' | 'all_pro_terminal' = 'free';
  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  if (rawTier === 'all_pro_terminal') userTier = 'all_pro_terminal';
  else if (rawTier === 'elite') userTier = 'elite';
  else if (rawTier === 'pro' || profile?.is_paid) userTier = 'pro';

  if (!leagues.length) {
    return NextResponse.json(
      { error: 'No leagues synced yet', hint: 'Visit /onboarding to import your Sleeper leagues.' },
      { status: 404 },
    );
  }

  const state = await fetchNflState();
  const liveWeek = Math.max(1, Math.min(18, state?.week ?? state?.display_week ?? 18));

  const [playerDb, ktcValues] = await Promise.all([fetchAllPlayers(), getKTCValues()]);
  const players: PlayerMap = playerDb ?? {};
  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues ?? []) {
    if (!v.player_name) continue;
    ktcMap[v.player_name.toLowerCase()] = v.ktc_value;
  }

  const { data: rosterRows } = await supabase
    .from('rosters')
    .select('league_id, roster_id, owner_id, players, starters, settings')
    .in(
      'league_id',
      leagues.map((l) => l.id),
    );

  const rostersByLeague: Record<string, typeof rosterRows> = {};
  for (const row of rosterRows ?? []) {
    if (!rostersByLeague[row.league_id]) rostersByLeague[row.league_id] = [];
    rostersByLeague[row.league_id]!.push(row);
  }

  const userRosterByLeague: Record<
    string,
    { roster_id: number; players: string[]; starters: string[]; settings: Record<string, number> }
  > = {};
  for (const lg of leagues) {
    const rs = rostersByLeague[lg.id] ?? [];
    const yours = ownerSid ? rs.find((r) => String(r.owner_id) === ownerSid) : undefined;
    if (!yours) continue;
    userRosterByLeague[lg.id] = {
      roster_id: yours.roster_id as number,
      players: (yours.players ?? []) as string[],
      starters: (yours.starters ?? []) as string[],
      settings: (yours.settings as Record<string, number>) ?? {},
    };
  }

  const matchupsByLeague = await Promise.all(
    leagues.map(async (lg) => {
      const m = await fetchLeagueMatchups(lg.id, liveWeek);
      return { leagueId: lg.id, matchups: m ?? [] };
    }),
  );
  const matchupMap = new Map(matchupsByLeague.map((m) => [m.leagueId, m.matchups]));

  let empireScore = 0;
  let empireOpp = 0;
  let winningCount = 0;
  let totalMatchups = 0;
  let portfolioValue = 0;

  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    if (my) {
      for (const pid of my.players) {
        const p = players[pid];
        portfolioValue += p ? ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0 : 0;
      }
    }

    const matchups = matchupMap.get(lg.id) ?? [];
    if (!my || !matchups.length) continue;

    const myMatchup = matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id);
    if (!myMatchup) continue;

    const opponent = matchups.find(
      (m: SleeperMatchup) =>
        m.matchup_id === myMatchup.matchup_id && m.roster_id !== my.roster_id,
    );

    empireScore += myMatchup.points ?? 0;
    if (opponent) {
      empireOpp += opponent.points ?? 0;
      if ((myMatchup.points ?? 0) > (opponent.points ?? 0)) winningCount++;
      totalMatchups++;
    }
  }

  const winProbability = totalMatchups
    ? Math.round((winningCount / totalMatchups) * 100)
    : empireScore > empireOpp
      ? 60
      : 40;

  const payload: DashboardHeroSnapshot = {
    userTier,
    week: liveWeek,
    empire: {
      score: Math.round(empireScore * 10) / 10,
      oppScore: Math.round(empireOpp * 10) / 10,
      winning: winningCount,
      total: totalMatchups,
      winProbability,
      leaguesCount: leagues.length,
      portfolioValue: Math.round(portfolioValue),
    },
  };

  return NextResponse.json(payload);
}
