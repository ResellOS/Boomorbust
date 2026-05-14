/**
 * Trade Hub API — unified data endpoint for the Trade Hub page.
 *
 * Returns:
 *  - incomingOffers  — recent trades involving the user (from Sleeper + trades table)
 *  - proactiveTrades — nightly TRE suggestions from notifications table
 *  - tradeHistory    — completed trades the user was part of
 *  - bviMarket       — top BVI movers (undervalued / overvalued)
 *  - leagues         — league context list
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  fetchTransactions,
  fetchLeagueUsers,
  fetchNflState,
  type SleeperTransaction,
  type SleeperUser,
} from '@/lib/sleeper';
import { fetchAllPlayers } from '@/lib/sleeper/players';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface TradeHubAsset {
  player_id: string;
  name: string;
  position: string;
  team: string;
  tfo_score: number | null;
  tfo_grade: string | null;
  bvi_score: number | null;
  ktc_value: number | null;
  bvi_delta: number | null;
}

export type TREVerdict = 'WIN' | 'EVEN' | 'LOSS';

export interface TradeHubOffer {
  id: string;
  league_id: string;
  league_name: string;
  opponent_sleeper_id: string | null;
  opponent_name: string | null;
  opponent_dmp_title: string | null;
  give: TradeHubAsset[];
  receive: TradeHubAsset[];
  /** Quick value heuristic based on BVI/KTC totals */
  tre_verdict: TREVerdict | null;
  tre_reasoning: string | null;
  created_at: string;
  week: number;
}

export interface ProactiveTradeItem {
  id: string;
  league_id: string;
  league_name: string;
  target_player: TradeHubAsset | null;
  target_player_name: string;
  target_position: string;
  gap_filled: string;
  reasoning: string;
  created_at: string;
}

export interface TradeHistoryItem {
  id: string;
  league_id: string;
  league_name: string;
  opponent_name: string | null;
  gave: TradeHubAsset[];
  received: TradeHubAsset[];
  tre_verdict: TREVerdict | null;
  outcome: 'WIN' | 'LOSS' | 'TBD';
  created_at: string;
  week: number;
}

export interface BVIMarketMover {
  player_id: string;
  name: string;
  position: string;
  team: string;
  bvi_score: number;
  ktc_value: number;
  delta: number;
  signal: 'UNDERVALUED' | 'OVERVALUED';
  trend: string | null;
}

export interface TradeHubLeague {
  id: string;
  name: string;
}

export interface TradeHubData {
  incomingOffers: TradeHubOffer[];
  proactiveTrades: ProactiveTradeItem[];
  tradeHistory: TradeHistoryItem[];
  bviUndervalued: BVIMarketMover[];
  bviOvervalued: BVIMarketMover[];
  leagues: TradeHubLeague[];
  activeLeagueId: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tfoGrade(score: number | null): string | null {
  if (score == null) return null;
  if (score >= 88) return 'ELITE';
  if (score >= 75) return 'HIGH VALUE';
  if (score >= 60) return 'VIABLE';
  if (score >= 45) return 'SPECULATIVE';
  return 'AVOID';
}

function quickVerdict(giveTotal: number, receiveTotal: number): TREVerdict {
  const delta = receiveTotal - giveTotal;
  if (delta > 300) return 'WIN';
  if (delta < -300) return 'LOSS';
  return 'EVEN';
}

function quickReasoning(verdict: TREVerdict, giveTotal: number, receiveTotal: number): string {
  const diff = Math.abs(receiveTotal - giveTotal);
  if (verdict === 'WIN') return `You gain ~${diff.toFixed(0)} BVI value — solid pickup for your roster.`;
  if (verdict === 'LOSS') return `You give up ~${diff.toFixed(0)} BVI value — look for a tighter counter.`;
  return 'Value is roughly even — fits if it fills a roster gap.';
}

function pickLabel(pick: { round: number; season: string }): string {
  const suffix = pick.round === 1 ? '1st' : pick.round === 2 ? '2nd' : pick.round === 3 ? '3rd' : `${pick.round}th`;
  return `${pick.season} ${suffix} Rd`;
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const supabaseUser = createClient();
  const {
    data: { user },
  } = await supabaseUser.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const leagueIdParam = url.searchParams.get('league_id') ?? url.searchParams.get('leagueId');
  /** When true, incoming/history/suggestions include all user leagues. */
  const scopeAllLeagues = !leagueIdParam || leagueIdParam === 'all';
  const activeLeagueId = scopeAllLeagues ? null : leagueIdParam;

  const supabase = createAdminClient();

  // ── 1. Base data: user leagues + profile ─────────────────────────────────
  const [leaguesResult, profileResult, nflStateResult] = await Promise.all([
    supabase
      .from('leagues')
      .select('id, name, season')
      .eq('user_id', user.id),
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
    fetchNflState(),
  ]);

  const leagues = (leaguesResult.data ?? []) as { id: string; name: string; season: string }[];
  const sleeperUserId = profileResult.data?.sleeper_user_id as string | null;
  const currentWeek = nflStateResult?.week ?? 1;

  const leagueList: TradeHubLeague[] = leagues.map((l) => ({ id: l.id, name: l.name }));

  // ── 2. Parallel: player DB, TFO cache, player values, DMP, rosters ───────
  const [playerDbRaw, tfoResult, pvResult, dmpResult, rosterResult, notifResult] = await Promise.all([
    fetchAllPlayers(),
    supabase
      .from('tfo_cache')
      .select('player_id, league_id, tfo_score, grade, verdict, calculated_at')
      .in('league_id', leagues.map((l) => l.id)),
    supabase
      .from('player_values')
      .select('player_id, bvi_score, ktc_value, delta, trend, signal'),
    supabase
      .from('dmp_profiles')
      .select('user_id, league_id, title')
      .in('league_id', leagues.map((l) => l.id)),
    supabase
      .from('rosters')
      .select('owner_id, player_ids, league_id, roster_id')
      .in('league_id', leagues.map((l) => l.id)),
    supabase
      .from('notifications')
      .select('id, type, message, metadata, created_at, league_id')
      .eq('user_id', user.id)
      .eq('type', 'trade_suggestion')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const playerDb = playerDbRaw ?? {};

  // Build lookup maps
  type TFORow = { player_id: string; league_id: string; tfo_score: number | null; grade: string | null; verdict: string | null };
  const tfoByLeaguePlayer = new Map<string, TFORow>();
  for (const row of (tfoResult.data ?? []) as TFORow[]) {
    tfoByLeaguePlayer.set(`${row.league_id}:${row.player_id}`, row);
  }

  type PVRow = { player_id: string; bvi_score: number; ktc_value: number; delta: number; trend: string | null; signal: string | null };
  const pvMap = new Map<string, PVRow>();
  for (const row of (pvResult.data ?? []) as PVRow[]) {
    pvMap.set(row.player_id, row);
  }

  type DMPRow = { user_id: string; league_id: string; title: string };
  const dmpMap = new Map<string, string>(); // key: `${leagueId}:${sleeperUserId}`
  for (const row of (dmpResult.data ?? []) as DMPRow[]) {
    dmpMap.set(`${row.league_id}:${row.user_id}`, row.title);
  }

  // Roster map: league_id -> roster_id for this user
  type RosterRow = { owner_id: string | null; player_ids: string[] | null; league_id: string; roster_id: number };
  const myRosterByLeague = new Map<string, RosterRow>();
  for (const row of (rosterResult.data ?? []) as RosterRow[]) {
    if (row.owner_id === sleeperUserId) {
      myRosterByLeague.set(row.league_id, row);
    }
  }

  function buildAsset(pid: string, leagueId: string): TradeHubAsset {
    const p = (playerDb as Record<string, { full_name?: string; position?: string; team?: string }>)[pid];
    const tfo = tfoByLeaguePlayer.get(`${leagueId}:${pid}`);
    const pv = pvMap.get(pid);
    return {
      player_id: pid,
      name: p?.full_name ?? pid,
      position: (p?.position ?? 'WR').toUpperCase(),
      team: p?.team ?? 'FA',
      tfo_score: tfo?.tfo_score ?? null,
      tfo_grade: tfoGrade(tfo?.tfo_score ?? null),
      bvi_score: pv?.bvi_score ?? null,
      ktc_value: pv?.ktc_value ?? null,
      bvi_delta: pv?.delta ?? null,
    };
  }

  // ── 3. Fetch Sleeper transactions: scan last 4 weeks across all leagues ──
  const incomingOffers: TradeHubOffer[] = [];
  const tradeHistory: TradeHistoryItem[] = [];

  const weeksToScan = [
    currentWeek,
    Math.max(1, currentWeek - 1),
    Math.max(1, currentWeek - 2),
    Math.max(1, currentWeek - 3),
  ];

  // Fetch league users in parallel for opponent resolution
  const leagueUsersMap = new Map<string, SleeperUser[]>();
  await Promise.all(
    leagues.slice(0, 10).map(async (lg) => {
      const users = await fetchLeagueUsers(lg.id);
      if (users) leagueUsersMap.set(lg.id, users);
    }),
  );

  // Fetch transactions per league per week
  const txnResults = await Promise.all(
    leagues.slice(0, 10).flatMap((lg) =>
      weeksToScan.map(async (week) => {
        const txns = await fetchTransactions(lg.id, week).catch(() => null);
        return { league: lg, week, txns: txns ?? [] };
      }),
    ),
  );

  const seenTxnIds = new Set<string>();

  for (const { league, week, txns } of txnResults) {
    const myRoster = myRosterByLeague.get(league.id);
    const myRosterId = myRoster?.roster_id;
    const lgUsers = leagueUsersMap.get(league.id) ?? [];

    for (const tx of txns as SleeperTransaction[]) {
      if (tx.type !== 'trade') continue;
      if (seenTxnIds.has(tx.transaction_id)) continue;

      const iAmInvolved = myRosterId != null && tx.roster_ids?.includes(myRosterId);
      if (!iAmInvolved) continue;

      seenTxnIds.add(tx.transaction_id);

      // Find opponent roster_id
      const opponentRosterId = tx.roster_ids?.find((rid) => rid !== myRosterId) ?? null;

      // Resolve opponent's Sleeper user_id via rosters table
      const opponentRosterRow = (rosterResult.data ?? []).find(
        (r) => r.league_id === league.id && (r as RosterRow).roster_id === opponentRosterId,
      ) as RosterRow | undefined;
      const opponentSleeperUserId = opponentRosterRow?.owner_id ?? null;

      // Resolve opponent display name
      const opponentUser = lgUsers.find((u) => u.user_id === opponentSleeperUserId);
      const opponentName = opponentUser?.display_name ?? opponentUser?.username ?? null;

      // DMP title for opponent
      const opponentDmpTitle = opponentSleeperUserId
        ? (dmpMap.get(`${league.id}:${opponentSleeperUserId}`) ?? null)
        : null;

      // Build asset lists from adds/drops
      const myGive: TradeHubAsset[] = [];
      const myReceive: TradeHubAsset[] = [];
      const myPicksGiven: TradeHubAsset[] = [];
      const myPicksReceived: TradeHubAsset[] = [];

      for (const [pid, toRosterId] of Object.entries(tx.adds ?? {})) {
        const asset = buildAsset(pid, league.id);
        if (toRosterId === myRosterId) {
          myReceive.push(asset);
        } else {
          myGive.push(asset);
        }
      }

      // Draft picks
      for (const pick of tx.draft_picks ?? []) {
        const pickAsset: TradeHubAsset = {
          player_id: `pick_${pick.round}_${pick.season}`,
          name: pickLabel(pick),
          position: 'PICK',
          team: '',
          tfo_score: null,
          tfo_grade: null,
          bvi_score: null,
          ktc_value: null,
          bvi_delta: null,
        };
        // Pick goes to whoever didn't own it before
        if (pick.owner_id === myRosterId) {
          myPicksReceived.push(pickAsset);
        } else {
          myPicksGiven.push(pickAsset);
        }
      }

      const allGive = [...myGive, ...myPicksGiven];
      const allReceive = [...myReceive, ...myPicksReceived];

      if (!allGive.length && !allReceive.length) continue;

      // Value heuristic
      const giveTotal = allGive.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
      const receiveTotal = allReceive.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
      const verdict = giveTotal + receiveTotal > 0 ? quickVerdict(giveTotal, receiveTotal) : null;

      const createdAt = tx.created
        ? new Date(tx.created).toISOString()
        : new Date().toISOString();

      const isRecent = week >= currentWeek - 1;

      const offer: TradeHubOffer = {
        id: tx.transaction_id,
        league_id: league.id,
        league_name: league.name,
        opponent_sleeper_id: opponentSleeperUserId,
        opponent_name: opponentName,
        opponent_dmp_title: opponentDmpTitle,
        give: allGive,
        receive: allReceive,
        tre_verdict: verdict,
        tre_reasoning: verdict ? quickReasoning(verdict, giveTotal, receiveTotal) : null,
        created_at: createdAt,
        week,
      };

      if (isRecent) {
        incomingOffers.push(offer);
      } else {
        const historyItem: TradeHistoryItem = {
          id: tx.transaction_id,
          league_id: league.id,
          league_name: league.name,
          opponent_name: opponentName,
          gave: allGive,
          received: allReceive,
          tre_verdict: verdict,
          outcome: 'TBD',
          created_at: createdAt,
          week,
        };
        tradeHistory.push(historyItem);
      }
    }
  }

  // Sort by date desc
  incomingOffers.sort((a, b) => b.created_at.localeCompare(a.created_at));
  tradeHistory.sort((a, b) => b.created_at.localeCompare(a.created_at));

  // ── 4. Proactive trades from notifications ────────────────────────────────
  type NotifRow = {
    id: string;
    type: string;
    message: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    league_id: string | null;
  };

  const proactiveTrades: ProactiveTradeItem[] = ((notifResult.data ?? []) as NotifRow[]).map((n) => {
    const meta = n.metadata ?? {};
    const targetPid = (meta.player_id as string | undefined) ?? '';
    const leagueId = n.league_id ?? '';
    const leagueName = leagues.find((l) => l.id === leagueId)?.name ?? leagueId;

    return {
      id: n.id,
      league_id: leagueId,
      league_name: leagueName,
      target_player: targetPid ? buildAsset(targetPid, leagueId) : null,
      target_player_name: (meta.player_name as string | undefined) ?? 'Unknown',
      target_position: (meta.position as string | undefined) ?? '?',
      gap_filled: (meta.gap_filled as string | undefined) ?? '',
      reasoning: n.message ?? (meta.reasoning as string | undefined) ?? '',
      created_at: n.created_at,
    };
  });

  // ── 5. BVI Market movers ─────────────────────────────────────────────────
  const allPV = (pvResult.data ?? []) as PVRow[];

  const undervalued: BVIMarketMover[] = allPV
    .filter((r) => r.delta > 500)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, 10)
    .map((r) => {
      const p = (playerDb as Record<string, { full_name?: string; position?: string; team?: string }>)[r.player_id];
      return {
        player_id: r.player_id,
        name: p?.full_name ?? r.player_id,
        position: (p?.position ?? 'WR').toUpperCase(),
        team: p?.team ?? 'FA',
        bvi_score: r.bvi_score,
        ktc_value: r.ktc_value,
        delta: r.delta,
        signal: 'UNDERVALUED' as const,
        trend: r.trend,
      };
    });

  const overvalued: BVIMarketMover[] = allPV
    .filter((r) => r.delta < -500)
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 10)
    .map((r) => {
      const p = (playerDb as Record<string, { full_name?: string; position?: string; team?: string }>)[r.player_id];
      return {
        player_id: r.player_id,
        name: p?.full_name ?? r.player_id,
        position: (p?.position ?? 'WR').toUpperCase(),
        team: p?.team ?? 'FA',
        bvi_score: r.bvi_score,
        ktc_value: r.ktc_value,
        delta: r.delta,
        signal: 'OVERVALUED' as const,
        trend: r.trend,
      };
    });

  // ── 6. Response ──────────────────────────────────────────────────────────
  function inLeagueScope<T extends { league_id: string }>(rows: T[]): T[] {
    if (scopeAllLeagues) return rows;
    return rows.filter((r) => r.league_id === leagueIdParam);
  }

  const payload: TradeHubData = {
    incomingOffers: inLeagueScope(incomingOffers),
    proactiveTrades: inLeagueScope(proactiveTrades),
    tradeHistory: inLeagueScope(tradeHistory).slice(0, 20),
    bviUndervalued: undervalued,
    bviOvervalued: overvalued,
    leagues: leagueList,
    activeLeagueId,
  };

  return NextResponse.json(payload);
}
