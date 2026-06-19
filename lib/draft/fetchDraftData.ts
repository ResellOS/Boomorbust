import { createAdminClient } from '@/lib/supabase/admin';
import type { DraftLeague, DraftPageData, DraftablePlayer } from './types';
import { fetchDraftSessions } from './fetchDraftSessions';
import {
  fetchOwnedPicksByLeague,
  fetchRosterByLeagueForUser,
} from '@/lib/trade/ownedPicks';
import type { OwnedPick } from '@/lib/trade/types';

const POOL_LIMIT = 440; // covers 14 teams x 20 rounds (280) with headroom

function safeScore(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

export async function fetchDraftData(userId: string): Promise<DraftPageData> {
  const empty: DraftPageData = {
    pool: [],
    leagues: [],
    scoringContext: 'dynasty',
    sessions: [],
    ownedPicksByLeague: {},
  };

  let supabase: ReturnType<typeof createAdminClient>;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[draft] createAdminClient failed:', err);
    return empty;
  }

  // Leagues for the shared Sidebar. Leagues are keyed by the Supabase auth uid
  // (user_id); the table has no owner_id / league_type columns.
  let leagues: DraftLeague[] = [];
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, status')
      .eq('user_id', userId);
    if (error) throw error;
    leagues = data ?? [];
  } catch (err) {
    console.error('[draft] leagues fetch failed:', err);
    leagues = [];
  }

  // This is a dynasty product — prefer dynasty scores, fall back to redraft so
  // the pool never blanks out before the dynasty prescore has run.
  let scoringContext: 'dynasty' | 'redraft' = 'dynasty';
  let scoreRows:
    | { player_id: string; tfo_score: number | null; verdict: string | null }[]
    | null = null;

  for (const ctx of ['dynasty', 'redraft'] as const) {
    try {
      const { data, error } = await supabase
        .from('formula_scores')
        .select('player_id, tfo_score, verdict')
        .eq('scoring_context', ctx)
        .eq('scoring_type', 'ppr')
        .eq('weight_set_name', 'default')
        .order('tfo_score', { ascending: false })
        .limit(POOL_LIMIT);
      if (error) throw error;
      if (data && data.length > 0) {
        scoreRows = data;
        scoringContext = ctx;
        break;
      }
    } catch (err) {
      console.error(`[draft] ${ctx} scores fetch failed:`, err);
    }
  }

  if (!scoreRows || scoreRows.length === 0) {
    const sessions = await fetchDraftSessions(supabase, userId);
    const ownedPicksByLeague = await loadOwnedPicks(supabase, userId, leagues);
    return { ...empty, leagues, sessions, ownedPicksByLeague };
  }

  const playerIds = scoreRows.map((s) => s.player_id);

  // Player metadata
  const meta = new Map<
    string,
    { full_name: string; position: string; team: string; age: number | null }
  >();
  try {
    const batch = 200;
    for (let i = 0; i < playerIds.length; i += batch) {
      const slice = playerIds.slice(i, i + batch);
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name, position, team, age')
        .in('id', slice);
      if (error) throw error;
      for (const p of data ?? []) {
        meta.set(String(p.id), {
          full_name: p.full_name ?? 'Unknown Player',
          position: (p.position ?? '—').toUpperCase(),
          team: p.team ?? 'FA',
          age: p.age ?? null,
        });
      }
    }
  } catch (err) {
    console.error('[draft] player meta fetch failed:', err);
  }

  // Market value (KTC) → ADP / market-rank proxy.
  const ktcByPlayer = new Map<string, number>();
  try {
    const { data, error } = await supabase
      .from('bbv_values')
      .select('player_id, ktc_value')
      .in('player_id', playerIds);
    if (error) throw error;
    for (const row of data ?? []) {
      if (row.ktc_value != null) ktcByPlayer.set(String(row.player_id), Number(row.ktc_value));
    }
  } catch (err) {
    console.error('[draft] market data fetch failed:', err);
  }

  // Build the pool. Keep only players we have real positions for (QB/RB/WR/TE).
  type Interim = Omit<DraftablePlayer, 'bobRank' | 'marketRank' | 'adp'> & {
    ktc: number;
  };
  const interim: Interim[] = [];
  for (const s of scoreRows) {
    const m = meta.get(s.player_id);
    if (!m) continue;
    if (!['QB', 'RB', 'WR', 'TE'].includes(m.position)) continue;
    interim.push({
      playerId: s.player_id,
      name: m.full_name,
      position: m.position,
      team: m.team,
      age: m.age,
      tfoScore: safeScore(s.tfo_score),
      verdict: s.verdict ?? 'NEUTRAL',
      ktc: ktcByPlayer.get(s.player_id) ?? 0,
    });
  }

  // BOB rank = TFO order (already sorted desc). Market rank = KTC order desc;
  // players with no KTC sink to the back of the market board.
  const byMarket = [...interim].sort((a, b) => b.ktc - a.ktc);
  const marketRankById = new Map<string, number>();
  byMarket.forEach((p, i) => marketRankById.set(p.playerId, i + 1));

  const pool: DraftablePlayer[] = interim.map((p, i) => {
    const marketRank = marketRankById.get(p.playerId) ?? interim.length;
    return {
      playerId: p.playerId,
      name: p.name,
      position: p.position,
      team: p.team,
      age: p.age,
      tfoScore: p.tfoScore,
      verdict: p.verdict,
      bobRank: i + 1,
      marketRank,
      adp: marketRank,
      byeWeek: null,
      proj: null,
      avg: null,
      isRookie: p.age != null && p.age <= 23,
    };
  });

  const sessions = await fetchDraftSessions(supabase, userId);
  const ownedPicksByLeague = await loadOwnedPicks(supabase, userId, leagues);
  return { pool, leagues, scoringContext, sessions, ownedPicksByLeague };
}

async function loadOwnedPicks(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  leagues: DraftLeague[],
): Promise<Record<string, OwnedPick[]>> {
  if (leagues.length === 0) return {};

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('sleeper_user_id')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    const sleeperUserId = profile?.sleeper_user_id;
    if (!sleeperUserId) return {};

    const rosterByLeague = await fetchRosterByLeagueForUser(supabase, sleeperUserId);
    return fetchOwnedPicksByLeague(leagues, rosterByLeague);
  } catch (err) {
    console.error('[draft] owned picks fetch failed:', err);
    return {};
  }
}
