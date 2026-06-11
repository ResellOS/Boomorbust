import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueRosters, type SleeperRoster } from '@/lib/sleeper';
import { getVerdict } from '@/lib/verdict';
import {
  deriveLeagueStatus,
  type DashboardRotationData,
  type LeagueBundle,
  type OvervaluedItem,
  type RotationPlayer,
  type SignalCounts,
  type TradeTargetItem,
} from './rotation';

function safeScore(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

function emptySignals(): SignalCounts {
  return { boom: 0, hold: 0, bust: 0, total: 0 };
}

function tallySignals(players: RotationPlayer[]): SignalCounts {
  const s = emptySignals();
  for (const p of players) {
    if (p.tfoScore <= 0) continue;
    s.total += 1;
    if (p.verdictClass === 'boom') s.boom += 1;
    else if (p.verdictClass === 'hold') s.hold += 1;
    else s.bust += 1;
  }
  return s;
}

function avgTfo(players: RotationPlayer[]): number {
  const valid = players.map((p) => p.tfoScore).filter((s) => s > 0);
  if (valid.length === 0) return 0;
  return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 10) / 10;
}

export async function fetchRotationData(
  userId: string,
  sleeperUserId: string,
): Promise<DashboardRotationData> {
  const empty: DashboardRotationData = {
    leagues: [],
    portfolio: { players: [], teamTfo: 0, signalCounts: emptySignals(), playersRostered: 0 },
    tradeTargets: [],
    overvalued: [],
    scoringContext: 'dynasty',
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[dashboard] createAdminClient failed:', err);
    return empty;
  }

  // Prefer dynasty scores; fall back to redraft if the dynasty prescore is empty.
  let scoringContext: 'dynasty' | 'redraft' = 'dynasty';
  try {
    const { count } = await supabase
      .from('formula_scores')
      .select('id', { count: 'exact', head: true })
      .eq('scoring_context', 'dynasty');
    scoringContext = (count ?? 0) > 0 ? 'dynasty' : 'redraft';
  } catch {
    scoringContext = 'redraft';
  }

  // Leagues (keyed by auth uid). Rosters (keyed by Sleeper user id).
  let leaguesRaw: { id: string; name: string; status: string | null; total_rosters: number | null }[] = [];
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status, total_rosters')
      .eq('user_id', userId);
    if (error) throw error;
    leaguesRaw = data ?? [];
  } catch (err) {
    console.error('[dashboard] leagues fetch failed:', err);
  }

  const rosterByLeague = new Map<string, { rosterId: number | null; playerIds: string[] }>();
  const allPlayerIds = new Set<string>();
  try {
    const { data, error } = await supabase
      .from('rosters')
      .select('league_id, roster_id, players')
      .eq('owner_id', sleeperUserId);
    if (error) throw error;
    for (const row of data ?? []) {
      const ids = ((row.players as string[] | null) ?? []).filter(Boolean).map(String);
      rosterByLeague.set(String(row.league_id), {
        rosterId: (row.roster_id as number | null) ?? null,
        playerIds: ids,
      });
      for (const id of ids) allPlayerIds.add(id);
    }
  } catch (err) {
    console.error('[dashboard] rosters fetch failed:', err);
  }

  const idList = Array.from(allPlayerIds);

  // Dynasty scores for every rostered player.
  const tfoByPlayer = new Map<string, { score: number; verdictClass: 'boom' | 'hold' | 'bust' }>();
  if (idList.length > 0) {
    try {
      const { data, error } = await supabase
        .from('formula_scores')
        .select('player_id, tfo_score, calculated_at')
        .eq('scoring_context', scoringContext)
        .in('player_id', idList)
        .order('calculated_at', { ascending: false });
      if (error) throw error;
      for (const row of data ?? []) {
        const pid = String(row.player_id);
        if (tfoByPlayer.has(pid)) continue;
        const score = safeScore(row.tfo_score);
        tfoByPlayer.set(pid, { score, verdictClass: getVerdict(score).class as 'boom' | 'hold' | 'bust' });
      }
    } catch (err) {
      console.error('[dashboard] scores fetch failed:', err);
    }
  }

  // Player metadata.
  const metaByPlayer = new Map<string, { name: string; position: string; team: string }>();
  if (idList.length > 0) {
    try {
      const batch = 200;
      for (let i = 0; i < idList.length; i += batch) {
        const slice = idList.slice(i, i + batch);
        const { data, error } = await supabase
          .from('players')
          .select('id, full_name, position, team')
          .in('id', slice);
        if (error) throw error;
        for (const p of data ?? []) {
          metaByPlayer.set(String(p.id), {
            name: p.full_name ?? 'Unknown Player',
            position: (p.position ?? '—').toUpperCase(),
            team: p.team ?? '—',
          });
        }
      }
    } catch (err) {
      console.error('[dashboard] player meta fetch failed:', err);
    }
  }

  // Sleeper standings/records for every league, fetched in parallel (one initial load).
  const sleeperByLeague = new Map<string, SleeperRoster[]>();
  await Promise.all(
    leaguesRaw.map(async (l) => {
      try {
        const rosters = await fetchLeagueRosters(l.id);
        if (rosters) sleeperByLeague.set(l.id, rosters);
      } catch (err) {
        console.error(`[dashboard] sleeper rosters failed for ${l.id}:`, err);
      }
    }),
  );

  const toRotationPlayer = (pid: string): RotationPlayer | null => {
    const meta = metaByPlayer.get(pid);
    if (!meta) return null;
    const tfo = tfoByPlayer.get(pid);
    const score = tfo?.score ?? 0;
    return {
      playerId: pid,
      name: meta.name,
      position: meta.position,
      team: meta.team,
      tfoScore: score,
      verdictClass: tfo?.verdictClass ?? 'hold',
    };
  };

  const leagues: LeagueBundle[] = leaguesRaw.map((l) => {
    const roster = rosterByLeague.get(l.id);
    const players = (roster?.playerIds ?? [])
      .map(toRotationPlayer)
      .filter((p): p is RotationPlayer => p !== null)
      .sort((a, b) => b.tfoScore - a.tfoScore);

    const teamTfo = avgTfo(players);
    const signalCounts = tallySignals(players);

    // Standings + record from Sleeper.
    const sleeperRosters = sleeperByLeague.get(l.id) ?? [];
    const totalTeams = l.total_rosters ?? sleeperRosters.length ?? 0;
    let wins = 0;
    let losses = 0;
    let ties = 0;
    let standingRank = 0;

    if (sleeperRosters.length > 0 && roster?.rosterId != null) {
      const mine = sleeperRosters.find((r) => r.roster_id === roster.rosterId);
      if (mine) {
        wins = Number(mine.settings?.wins ?? 0);
        losses = Number(mine.settings?.losses ?? 0);
        ties = Number(mine.settings?.ties ?? 0);
      }
      const ranked = [...sleeperRosters].sort((a, b) => {
        const wd = Number(b.settings?.wins ?? 0) - Number(a.settings?.wins ?? 0);
        if (wd !== 0) return wd;
        return Number(b.settings?.fpts ?? 0) - Number(a.settings?.fpts ?? 0);
      });
      const idx = ranked.findIndex((r) => r.roster_id === roster.rosterId);
      standingRank = idx >= 0 ? idx + 1 : 0;
    }

    const gamesPlayed = wins + losses + ties;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 1000) / 10 : 0;
    const record = ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;

    const status = deriveLeagueStatus({
      winRate,
      teamTfo,
      standingRank,
      totalTeams,
      gamesPlayed,
      rosterSize: players.length,
    });

    return {
      id: l.id,
      name: l.name,
      status,
      winRate,
      record,
      standingRank,
      totalTeams,
      teamTfo,
      players,
      signalCounts,
    };
  });

  // Portfolio (ALL mode): every unique rostered player across leagues.
  const portfolioPlayers = idList
    .map(toRotationPlayer)
    .filter((p): p is RotationPlayer => p !== null)
    .sort((a, b) => b.tfoScore - a.tfoScore);
  const portfolio = {
    players: portfolioPlayers,
    teamTfo: avgTfo(portfolioPlayers),
    signalCounts: tallySignals(portfolioPlayers),
    playersRostered: portfolioPlayers.length,
  };

  // Trade targets: top league-wide scores the user does not roster.
  const tradeTargets: TradeTargetItem[] = [];
  try {
    let q = supabase
      .from('formula_scores')
      .select('player_id, tfo_score')
      .eq('scoring_context', scoringContext)
      .order('tfo_score', { ascending: false })
      .limit(8);
    if (idList.length > 0) q = q.not('player_id', 'in', `(${idList.join(',')})`);
    const { data } = await q;
    const targetIds = (data ?? []).map((r) => String(r.player_id));
    if (targetIds.length > 0) {
      const { data: meta } = await supabase
        .from('players')
        .select('id, full_name, position, team')
        .in('id', targetIds);
      const m = new Map(
        (meta ?? []).map((p) => [String(p.id), p as { full_name: string; position: string; team: string }]),
      );
      (data ?? []).forEach((r, i) => {
        const p = m.get(String(r.player_id));
        tradeTargets.push({
          playerId: String(r.player_id),
          playerName: p?.full_name ?? 'Unknown Player',
          position: (p?.position ?? '—').toUpperCase(),
          team: p?.team ?? '—',
          leagueName: leagues[i % Math.max(leagues.length, 1)]?.name ?? 'League',
          tfoScore: safeScore(r.tfo_score) || 50,
        });
      });
    }
  } catch (err) {
    console.error('[dashboard] trade targets fetch failed:', err);
  }

  // Overvalued: the user's lowest-scoring rostered assets.
  const overvalued: OvervaluedItem[] = portfolioPlayers
    .slice(-5)
    .reverse()
    .map((p) => ({
      playerId: p.playerId,
      playerName: p.name,
      position: p.position,
      team: p.team,
      delta: -Math.max(1, (70 - p.tfoScore) * 0.35),
    }));

  return { leagues, portfolio, tradeTargets, overvalued, scoringContext };
}
