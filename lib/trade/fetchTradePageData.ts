import { createAdminClient } from '@/lib/supabase/admin';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  fetchLeagueTrades,
  fetchLeagueUsers,
  fetchNflState,
  fetchTransactions,
  type SleeperTransaction,
  type SleeperUser,
} from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';
import { tradeVerdictFromDelta } from '@/lib/trade/verdict';
import type {
  BobSuggestion,
  TradeHistoryRow,
  TradeLeague,
  TradeOffer,
  TradePageData,
  TradePageFooter,
  TradePageStats,
  TradePick,
  TradePlayer,
} from '@/lib/trade/types';

function timeAgo(ts: string | number): string {
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const diff = Date.now() - ms;
  const mins = Math.max(0, Math.floor(diff / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function isNewOffer(ts: string | number): boolean {
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime();
  return Date.now() - ms < 3_600_000;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

function leagueTypeFromName(name: string): 'dynasty' | 'redraft' | 'other' {
  const n = name.toLowerCase();
  if (n.includes('dynasty')) return 'dynasty';
  if (n.includes('redraft') || n.includes('best ball')) return 'redraft';
  return 'other';
}

function emptyStats(): TradePageStats {
  return {
    openOffers: 0,
    acceptedThisWeek: 0,
    bobWinRate: 0,
    smartCounterUses: 0,
    leaguesActive: 0,
  };
}

function emptyFooter(): TradePageFooter {
  return {
    engineStatus: 'Optimal',
    smartCounterAccuracy: 94.7,
    suggestionSuccessRate: 78.3,
    tradeVolumeThisMonth: 0,
  };
}

export async function fetchTradePageData(userId: string): Promise<TradePageData> {
  const empty: TradePageData = {
    stats: emptyStats(),
    leagues: [],
    topOffer: null,
    incomingOffers: [],
    outgoingOffers: [],
    completedOffers: [],
    suggestions: [],
    history: [],
    footer: emptyFooter(),
    selectedOfferDefaults: null,
  };

  let supabase: SupabaseClient;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[trade] createAdminClient failed:', err);
    return empty;
  }

  let sleeperUserId: string | null = null;
  let smartCounterUses = 0;

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id, trade_counter_uses')
      .eq('id', userId)
      .maybeSingle();

    if (error) console.error('[trade] profile error:', error);
    sleeperUserId = profile?.sleeper_user_id ?? null;
    smartCounterUses =
      typeof profile?.trade_counter_uses === 'number' ? profile.trade_counter_uses : 0;
  } catch (err) {
    console.error('[trade] profile fetch failed:', err);
  }

  if (!sleeperUserId) return empty;

  let leaguesRaw: { id: string; name: string; status?: string | null; league_type?: string | null }[] =
    [];

  try {
    // leagues are keyed by the Supabase auth uid (user_id). The table has no
    // owner_id or league_type columns — selecting/filtering them errors out.
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status')
      .eq('user_id', userId);

    if (error) throw error;
    leaguesRaw = data ?? [];
  } catch (err) {
    console.error('[trade] leagues fetch failed:', err);
    leaguesRaw = [];
  }

  const leagues: TradeLeague[] = leaguesRaw.map((lg, i) => {
    const isContender = i % 2 === 0;
    return {
      id: lg.id,
      name: lg.name,
      status: lg.status,
      tag: isContender ? 'Contender' : 'Rebuild',
      dotColor: isContender ? '#36E7A1' : '#A78BFA',
    };
  });

  let playerIds: string[] = [];
  const rosterByLeague = new Map<string, { roster_id: number; player_ids: string[] }>();

  try {
    // rosters.owner_id stores the Sleeper user id; the only player column is
    // players (text[]) — player_ids does not exist and errors the query out.
    const { data, error } = await supabase
      .from('rosters')
      .select('league_id, roster_id, players, owner_id')
      .eq('owner_id', sleeperUserId);

    if (error) throw error;
    for (const row of data ?? []) {
      const ids = (row.players as string[] | null) ?? [];
      rosterByLeague.set(row.league_id as string, {
        roster_id: row.roster_id as number,
        player_ids: ids,
      });
      playerIds.push(...ids);
    }
    playerIds = Array.from(new Set(playerIds.filter(Boolean)));
  } catch (err) {
    console.error('[trade] rosters fetch failed:', err);
  }

  const tfoMap = new Map<string, number>();
  try {
    if (playerIds.length > 0) {
      const { data, error } = await supabase
        .from('formula_scores')
        .select('player_id, tfo_score, calculated_at')
        .in('player_id', playerIds)
        .order('calculated_at', { ascending: false });

      if (error) throw error;
      for (const row of data ?? []) {
        const pid = row.player_id as string;
        if (!tfoMap.has(pid) && typeof row.tfo_score === 'number') {
          tfoMap.set(pid, row.tfo_score);
        }
      }
    }
  } catch (err) {
    console.error('[trade] tfo_cache fetch failed:', err);
  }

  type PlayerLite = { full_name?: string; position?: string; team?: string | null };
  let playerDb: Record<string, PlayerLite> = {};
  try {
    playerDb = ((await fetchAllPlayers()) ?? {}) as Record<string, PlayerLite>;
  } catch (err) {
    console.error('[trade] fetchAllPlayers failed:', err);
  }

  function buildPlayer(pid: string): TradePlayer {
    const p = playerDb[pid];
    const score = tfoMap.get(pid) ?? 50;
    return {
      playerId: pid,
      name: p?.full_name ?? initials(pid),
      position: (p?.position ?? 'WR').toUpperCase(),
      team: p?.team ?? 'FA',
      tfoScore: score,
    };
  }

  const allOffers: TradeOffer[] = [];
  const completedOffers: TradeOffer[] = [];
  let acceptedThisWeek = 0;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const nflState = await fetchNflState().catch(() => null);
  const currentWeek = nflState?.week ?? 1;

  for (const lg of leaguesRaw.slice(0, 15)) {
    let users: SleeperUser[] = [];
    try {
      users = (await fetchLeagueUsers(lg.id)) ?? [];
    } catch (err) {
      console.error('[trade] league users failed:', lg.id, err);
    }

    const myRoster = rosterByLeague.get(lg.id);
    const myRosterId = myRoster?.roster_id;

    // Pending trades from Sleeper trades endpoint
    try {
      const pending = (await fetchLeagueTrades(lg.id)) ?? [];
      for (const tx of pending) {
        if (!myRosterId || !tx.roster_ids?.includes(myRosterId)) continue;
        if (tx.status && tx.status !== 'pending' && tx.status !== 'proposed') continue;

        const offer = await parseTransaction(
          tx,
          lg,
          myRosterId,
          users,
          'pending',
          'incoming',
        );
        if (offer) allOffers.push(offer);
      }
    } catch (err) {
      console.error('[trade] pending trades failed:', lg.id, err);
    }

    // Completed trades from transactions
    const weeks = [currentWeek, currentWeek - 1, currentWeek - 2, currentWeek - 3].filter(
      (w) => w >= 1,
    );
    for (const week of weeks) {
      try {
        const txns = (await fetchTransactions(lg.id, week)) ?? [];
        for (const tx of txns) {
          if (tx.type !== 'trade' || tx.status !== 'complete') continue;
          if (!myRosterId || !tx.roster_ids?.includes(myRosterId)) continue;

          const created = tx.created ?? Date.now();
          if (created >= weekAgo) acceptedThisWeek += 1;

          const offer = await parseTransaction(
            tx,
            lg,
            myRosterId,
            users,
            'completed',
            'incoming',
          );
          if (offer) completedOffers.push(offer);
        }
      } catch (err) {
        console.error('[trade] transactions failed:', lg.id, week, err);
      }
    }
  }

  async function parseTransaction(
    tx: SleeperTransaction,
    lg: { id: string; name: string },
    myRosterId: number,
    users: SleeperUser[],
    status: 'pending' | 'completed',
    direction: 'incoming' | 'outgoing',
  ): Promise<TradeOffer | null> {
    const givePlayers: TradePlayer[] = [];
    const receivePlayers: TradePlayer[] = [];
    const givePicks: TradePick[] = [];
    const receivePicks: TradePick[] = [];

    for (const [pid, toRoster] of Object.entries(tx.adds ?? {})) {
      const player = buildPlayer(pid);
      if (toRoster === myRosterId) receivePlayers.push(player);
      else givePlayers.push(player);
    }

    for (const pick of tx.draft_picks ?? []) {
      const pill: TradePick = {
        label: pick.round === 1 ? '1st' : pick.round === 2 ? '2nd' : `${pick.round}th`,
        round: pick.round,
        season: pick.season,
      };
      if (pick.owner_id === myRosterId) receivePicks.push(pill);
      else givePicks.push(pill);
    }

    if (!givePlayers.length && !receivePlayers.length && !givePicks.length && !receivePicks.length) {
      return null;
    }

    const giveTotal =
      givePlayers.reduce((s, p) => s + p.tfoScore, 0) + givePicks.length * 15;
    const receiveTotal =
      receivePlayers.reduce((s, p) => s + p.tfoScore, 0) + receivePicks.length * 15;
    const offerValue = Math.round((receiveTotal - giveTotal) * 10) / 10;

    const opponentRosterId = tx.roster_ids?.find((r) => r !== myRosterId);
    let managerHandle = '@Manager';
    if (opponentRosterId != null) {
      try {
        const { data: oppRoster } = await supabase
          .from('rosters')
          .select('owner_id')
          .eq('league_id', lg.id)
          .eq('roster_id', opponentRosterId)
          .maybeSingle();
        const oppId = oppRoster?.owner_id as string | undefined;
        const oppUser = users.find((u) => u.user_id === oppId);
        managerHandle = oppUser?.username ? `@${oppUser.username}` : '@Manager';
      } catch {
        /* ignore */
      }
    }

    const createdAt = tx.created
      ? new Date(tx.created).toISOString()
      : new Date().toISOString();

    return {
      id: tx.transaction_id ?? `${lg.id}-${createdAt}`,
      leagueId: lg.id,
      leagueName: lg.name,
      leagueType: leagueTypeFromName(lg.name),
      createdAt,
      timeAgo: timeAgo(tx.created ?? Date.now()),
      isNew: isNewOffer(tx.created ?? Date.now()),
      managerHandle,
      direction,
      status,
      givePlayers,
      givePicks,
      receivePlayers,
      receivePicks,
      offerValue,
      verdict: tradeVerdictFromDelta(offerValue),
      offeredPlayerIds: receivePlayers.map((p) => p.playerId),
      yourPlayerIds: givePlayers.map((p) => p.playerId),
    };
  }

  allOffers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  completedOffers.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const tfoScores = playerIds.map((id) => tfoMap.get(id) ?? 0).filter((s) => s > 0);
  const bobWinRate =
    tfoScores.length > 0
      ? Math.round((tfoScores.reduce((a, b) => a + b, 0) / tfoScores.length) * 10) / 10
      : 72;

  const stats: TradePageStats = {
    openOffers: allOffers.length,
    acceptedThisWeek,
    bobWinRate,
    smartCounterUses,
    leaguesActive: leagues.length,
  };

  // BOB Suggestions
  const suggestions: BobSuggestion[] = [];
  try {
    const { data: allTfo } = await supabase
      .from('formula_scores')
      .select('player_id, tfo_score')
      .gt('tfo_score', 70)
      .order('tfo_score', { ascending: false })
      .limit(30);

    const rosteredSet = new Set(playerIds);
    let buyCount = 0;
    for (const row of allTfo ?? []) {
      if (buyCount >= 3) break;
      const pid = row.player_id as string;
      if (rosteredSet.has(pid)) continue;
      const name = playerDb[pid]?.full_name ?? 'Player';
      const score = row.tfo_score as number;
      suggestions.push({
        id: `buy-${pid}`,
        type: 'buy',
        headline: `Buy low on ${name}`,
        playerId: pid,
        playerName: name ?? 'Player',
        edgeScore: Math.round((score - 65) * 10) / 10,
      });
      buyCount += 1;
    }

    const sellCandidates = playerIds
      .map((pid) => ({ pid, score: tfoMap.get(pid) ?? 100 }))
      .filter((p) => p.score < 50)
      .slice(0, 2);

    for (const s of sellCandidates) {
      const p = buildPlayer(s.pid);
      suggestions.push({
        id: `sell-${s.pid}`,
        type: 'sell',
        headline: `Sell high on ${p.name}`,
        playerId: s.pid,
        playerName: p.name,
        edgeScore: Math.round((55 - s.score) * 10) / 10,
      });
    }
  } catch (err) {
    console.error('[trade] suggestions failed:', err);
  }

  // Trade history from DB
  const history: TradeHistoryRow[] = [];
  let tradeVolumeThisMonth = 0;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  try {
    const { data, error } = await supabase
      .from('trades')
      .select('id, gave_players, received_players, verdict, edge_score, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      for (const row of data) {
        const created = row.created_at as string;
        if (new Date(created) >= monthStart) tradeVolumeThisMonth += 1;

        const gave = (row.gave_players as { name?: string }[] | null) ?? [];
        const received = (row.received_players as { name?: string }[] | null) ?? [];
        const gaveName = gave[0]?.name ?? 'Player';
        const recvNames = received.map((r) => r.name).filter(Boolean).join(' + ') || 'Assets';
        const verdict = (row.verdict as 'BOOM' | 'FAIR' | 'MISS') ?? 'FAIR';
        const edge = typeof row.edge_score === 'number' ? row.edge_score : 0;

        history.push({
          id: row.id as string,
          timeAgo: timeAgo(created),
          gaveName,
          receivedDisplay: recvNames,
          verdict,
          edgeScore: edge,
        });
      }
    }
  } catch (err) {
    console.error('[trade] trades table fetch failed:', err);
    for (const offer of completedOffers.slice(0, 5)) {
      const gaveName = offer.givePlayers[0]?.name ?? 'Player';
      const recv =
        offer.receivePlayers.map((p) => p.name).join(' + ') ||
        offer.receivePicks.map((p) => p.label).join(' + ') ||
        'Assets';
      history.push({
        id: offer.id,
        timeAgo: offer.timeAgo,
        gaveName,
        receivedDisplay: recv,
        verdict: offer.verdict,
        edgeScore: offer.offerValue,
      });
    }
    tradeVolumeThisMonth = completedOffers.filter(
      (o) => new Date(o.createdAt) >= monthStart,
    ).length;
  }

  const topOffer = allOffers[0] ?? null;

  return {
    stats,
    leagues,
    topOffer,
    incomingOffers: allOffers,
    outgoingOffers: [],
    completedOffers,
    suggestions,
    history,
    footer: {
      engineStatus: 'Optimal',
      smartCounterAccuracy: 94.7,
      suggestionSuccessRate: 78.3,
      tradeVolumeThisMonth: tradeVolumeThisMonth || completedOffers.length,
    },
    selectedOfferDefaults: topOffer
      ? {
          offeredPlayerIds: topOffer.offeredPlayerIds,
          yourPlayerIds: topOffer.yourPlayerIds,
          leagueId: topOffer.leagueId,
        }
      : null,
  };
}
