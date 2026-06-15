import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchLeagueRosters,
  fetchLeagueUsers,
  fetchLeagueTrades,
  fetchNflState,
  type SleeperRoster,
  type SleeperTransaction,
  type SleeperUser,
} from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import {
  acquireCostForScore,
  generateTradeReason,
  getVerdict,
  getTradeVerdictLabel,
} from '@/lib/verdict';
import { fetchDashboardNews } from './fetchDashboardNews';
import {
  deriveLeagueStatus,
  type DashboardIncomingTrade,
  type DashboardRotationData,
  type LeagueBundle,
  type OvervaluedItem,
  type PlayerComponents,
  type RotationPlayer,
  type SignalCounts,
  type TradeTargetItem,
} from './rotation';
import { fetchMarketVerdicts } from '@/lib/verdict/fetchMarketVerdicts';

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

// Treat null AND empty/whitespace names as missing so no UI (ticker, cards)
// ever renders a blank label.
function cleanName(name: string | null | undefined): string {
  const n = (name ?? '').trim();
  return n.length > 0 ? n : 'Unknown Player';
}

function playerName(db: Record<string, { full_name?: string }>, pid: string): string {
  return cleanName(db[pid]?.full_name);
}

function pickLabel(
  round: number,
  season: string,
  rosterId: number,
  rosters: SleeperRoster[],
  users: SleeperUser[],
): string {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  const user = users.find((u) => u.user_id === roster?.owner_id);
  const team = user?.display_name ?? user?.username ?? `Team ${rosterId}`;
  const rd = round === 1 ? '1st' : round === 2 ? '2nd' : round === 3 ? '3rd' : `${round}th`;
  return `${season} ${rd} (${team})`;
}

function parsePendingTrade(
  tx: SleeperTransaction,
  leagueId: string,
  leagueName: string,
  myRosterId: number,
  rosters: SleeperRoster[],
  users: SleeperUser[],
  playerDb: Record<string, { full_name?: string }>,
  tfoMap: Map<string, number>,
): DashboardIncomingTrade | null {
  let primaryPlayerId = '';
  let primaryPlayerName = '';
  const askingParts: string[] = [];

  for (const [pid, toRoster] of Object.entries(tx.adds ?? {})) {
    const name = playerName(playerDb, pid);
    if (toRoster === myRosterId) {
      primaryPlayerId = pid;
      primaryPlayerName = name;
    } else {
      askingParts.push(name);
    }
  }

  for (const [pid, fromRoster] of Object.entries(tx.drops ?? {})) {
    if (fromRoster === myRosterId) askingParts.push(playerName(playerDb, pid));
  }

  for (const pick of tx.draft_picks ?? []) {
    const label = pickLabel(pick.round, pick.season, pick.roster_id, rosters, users);
    if (pick.owner_id === myRosterId && !primaryPlayerName) {
      primaryPlayerName = label;
    } else if (pick.owner_id !== myRosterId) {
      askingParts.push(label);
    }
  }

  if (!primaryPlayerName) return null;

  const opponentRosterId = tx.roster_ids?.find((r) => r !== myRosterId);
  const oppRoster = rosters.find((r) => r.roster_id === opponentRosterId);
  const oppUser = users.find((u) => u.user_id === oppRoster?.owner_id);
  const managerName = oppUser?.username ? `@${oppUser.username}` : '@Manager';

  const receiveScore = primaryPlayerId ? tfoMap.get(primaryPlayerId) ?? 70 : 70;
  const giveScore = askingParts.length * 12;
  const dynastyEdge = Math.round((receiveScore - giveScore * 0.3) * 0.15 * 10) / 10;

  const created = tx.created ?? Date.now();
  const isNew = Date.now() - created < 3_600_000;

  return {
    id: tx.transaction_id ?? `${leagueId}-${created}`,
    playerId: primaryPlayerId || '0',
    playerName: primaryPlayerName,
    leagueId,
    leagueName,
    managerName,
    askingFor: askingParts.length > 0 ? askingParts.join(' · ') : 'Open to counter',
    dynastyEdge: Math.max(1, dynastyEdge),
    status: isNew ? 'NEW' : 'PENDING',
    tfoScore: receiveScore,
  };
}

export async function fetchRotationData(
  userId: string,
  sleeperUserId: string,
): Promise<DashboardRotationData> {
  const nflStateRaw = await fetchNflState().catch(() => null);
  const nflSeason = {
    week: nflStateRaw?.week ?? 0,
    seasonType: nflStateRaw?.season_type ?? ('off' as const),
    inSeason:
      nflStateRaw != null &&
      nflStateRaw.season_type === 'regular' &&
      nflStateRaw.week >= 1 &&
      nflStateRaw.week <= 18,
  };

  const empty: DashboardRotationData = {
    leagues: [],
    portfolio: { players: [], teamTfo: 0, signalCounts: emptySignals(), playersRostered: 0 },
    tradeTargets: [],
    overvalued: [],
    incomingTrades: [],
    newsItems: [],
    leagueRosteredIds: {},
    nflSeason,
    scoringContext: 'dynasty',
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[dashboard] createAdminClient failed:', err);
    return empty;
  }

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

  const tfoByPlayer = new Map<string, { score: number; verdictClass: 'boom' | 'hold' | 'bust' }>();
  const tfoMap = new Map<string, number>();
  // Real engine component scores per player → radar axes (no more uniform pentagon).
  const componentsByPlayer = new Map<string, PlayerComponents>();
  if (idList.length > 0) {
    type ScoreRow = {
      player_id: string | number;
      tfo_score: number | null;
      ops_score: number | null;
      sfs_score: number | null;
      yoysi_score: number | null;
      sit_score: number | null;
      projected_ppg: number | null;
    };
    const ingestScoreRows = (rows: ScoreRow[] | null) => {
      for (const row of rows ?? []) {
        const pid = String(row.player_id);
        if (tfoByPlayer.has(pid)) continue;
        const score = safeScore(row.tfo_score);
        if (score <= 0) continue;
        tfoByPlayer.set(pid, {
          score,
          verdictClass: getVerdict(score).class as 'boom' | 'hold' | 'bust',
        });
        tfoMap.set(pid, score);
        componentsByPlayer.set(pid, {
          ops: safeScore(row.ops_score),
          sfs: safeScore(row.sfs_score),
          yoysi: safeScore(row.yoysi_score),
          sit: safeScore(row.sit_score),
          projectedPpg: safeScore(row.projected_ppg),
        });
      }
    };

    const cols = 'player_id, tfo_score, ops_score, sfs_score, yoysi_score, sit_score, projected_ppg, calculated_at';
    const batch = 150;
    try {
      for (let i = 0; i < idList.length; i += batch) {
        const slice = idList.slice(i, i + batch);
        const { data, error } = await supabase
          .from('formula_scores')
          .select(cols)
          .eq('scoring_context', scoringContext)
          .in('player_id', slice)
          .order('calculated_at', { ascending: false });
        if (error) throw error;
        ingestScoreRows(data as ScoreRow[] | null);
      }

      const missing = idList.filter((id) => !tfoByPlayer.has(id));
      if (missing.length > 0) {
        const altContext = scoringContext === 'dynasty' ? 'redraft' : 'dynasty';
        for (let i = 0; i < missing.length; i += batch) {
          const slice = missing.slice(i, i + batch);
          const { data, error } = await supabase
            .from('formula_scores')
            .select(cols)
            .eq('scoring_context', altContext)
            .in('player_id', slice)
            .order('calculated_at', { ascending: false });
          if (error) throw error;
          ingestScoreRows(data as ScoreRow[] | null);
        }
      }
    } catch (err) {
      console.error('[dashboard] scores fetch failed:', err);
    }
  }

  const metaByPlayer = new Map<string, { name: string; position: string; team: string; tfoScore: number }>();
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
          const pid = String(p.id);
          metaByPlayer.set(pid, {
            name: cleanName(p.full_name),
            position: (p.position ?? '—').toUpperCase(),
            team: p.team ?? '—',
            tfoScore: tfoMap.get(pid) ?? 0,
          });
        }
      }
    } catch (err) {
      console.error('[dashboard] player meta fetch failed:', err);
    }
  }

  // Market verdicts (BUY/SELL vs KTC) — market-wide across the scored skill pool,
  // shared with the player hub so both surfaces stay identical.
  const marketVerdictByPlayer = await fetchMarketVerdicts(supabase, scoringContext);

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

  // Every player rostered by ANY team in each league (for league-scoped news).
  const leagueRosteredIds: Record<string, string[]> = {};
  for (const [leagueId, rosters] of Array.from(sleeperByLeague.entries())) {
    const ids = new Set<string>();
    for (const r of rosters) {
      for (const pid of r.players ?? []) if (pid) ids.add(String(pid));
    }
    leagueRosteredIds[leagueId] = Array.from(ids);
  }

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
      components: componentsByPlayer.get(pid) ?? null,
      marketVerdict: marketVerdictByPlayer.get(pid) ?? null,
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

    const isOffseason = nflSeason.week === 0 || nflSeason.seasonType !== 'regular';
    const status =
      players.length === 0
        ? 'ORPHAN'
        : deriveLeagueStatus(
            gamesPlayed > 0 ? winRate / 100 : 0,
            teamTfo,
            isOffseason,
          );

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

  const tradeTargets: TradeTargetItem[] = [];
  try {
    let q = supabase
      .from('formula_scores')
      .select('player_id, tfo_score')
      .eq('scoring_context', scoringContext)
      .order('tfo_score', { ascending: false })
      .limit(12);
    if (idList.length > 0) q = q.not('player_id', 'in', `(${idList.join(',')})`);
    const { data } = await q;
    const targetIds = (data ?? []).slice(0, 4).map((r) => String(r.player_id));
    if (targetIds.length > 0) {
      const { data: meta } = await supabase
        .from('players')
        .select('id, full_name, position, team')
        .in('id', targetIds);
      const m = new Map(
        (meta ?? []).map((p) => [String(p.id), p as { full_name: string; position: string; team: string }]),
      );
      (data ?? []).slice(0, 4).forEach((r, i) => {
        const p = m.get(String(r.player_id));
        const score = safeScore(r.tfo_score) || 50;
        const verdictLabel = getTradeVerdictLabel(score);
        const lg = leagues[i % Math.max(leagues.length, 1)];
        tradeTargets.push({
          playerId: String(r.player_id),
          playerName: p?.full_name ?? 'Unknown Player',
          position: (p?.position ?? '—').toUpperCase(),
          team: p?.team ?? '—',
          leagueName: lg?.name ?? 'League',
          leagueId: lg?.id ?? '',
          tfoScore: score,
          reason: generateTradeReason(score, verdictLabel),
          acquireCost: acquireCostForScore(score),
        });
      });
    }
  } catch (err) {
    console.error('[dashboard] trade targets fetch failed:', err);
  }

  // Overvalued: hide unless we have meaningful market comparison data.
  const overvalued: OvervaluedItem[] = [];

  let playerDb: Record<string, { full_name?: string }> = {};
  try {
    playerDb = ((await fetchAllPlayers()) ?? {}) as Record<string, { full_name?: string }>;
  } catch {
    /* optional */
  }

  const incomingTrades: DashboardIncomingTrade[] = [];
  await Promise.all(
    leaguesRaw.slice(0, 15).map(async (lg) => {
      const roster = rosterByLeague.get(lg.id);
      if (!roster?.rosterId) return;

      let users: SleeperUser[] = [];
      let rosters: SleeperRoster[] = [];
      try {
        users = (await fetchLeagueUsers(lg.id)) ?? [];
        rosters = (await fetchLeagueRosters(lg.id)) ?? [];
      } catch {
        return;
      }

      try {
        const pending = (await fetchLeagueTrades(lg.id)) ?? [];
        for (const tx of pending) {
          if (!tx.roster_ids?.includes(roster.rosterId)) continue;
          if (tx.status && !['pending', 'proposed'].includes(tx.status)) continue;
          const parsed = parsePendingTrade(
            tx,
            lg.id,
            lg.name,
            roster.rosterId,
            rosters,
            users,
            playerDb,
            tfoMap,
          );
          if (parsed) incomingTrades.push(parsed);
        }
      } catch {
        /* skip */
      }
    }),
  );

  let newsItems: DashboardRotationData['newsItems'] = [];
  try {
    newsItems = await fetchDashboardNews(metaByPlayer, allPlayerIds, true);
  } catch (err) {
    console.error('[dashboard] news fetch failed:', err);
  }

  return {
    leagues,
    portfolio,
    tradeTargets,
    overvalued,
    incomingTrades,
    newsItems,
    leagueRosteredIds,
    nflSeason,
    scoringContext,
  };
}
