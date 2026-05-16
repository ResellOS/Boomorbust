import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { createClient } from '@/lib/supabase/server';
import {
  fetchNflState,
  fetchLeagueMatchups,
  fetchTransactions,
  fetchTrendingPlayers,
  type SleeperMatchup,
} from '@/lib/sleeper';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { getPlayerValueHistory } from '@/lib/playerValueHistory';
import {
  calculateLeagueHealthScore,
  derivePrimarySignal,
  type RankedPlayer,
} from '@/lib/health/leagueHealthScore';
import { fetchWeekMatchups } from '@/lib/external/matchups';
import { calculateTFOScore } from '@/lib/tfo/formula';
import { inferTFOInputFromHub } from '@/components/dashboard/radarMetrics';
import { calculateBBSM } from '@/lib/bbsm/formula';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Types returned to the client ───────────────────────────────────────────

export interface SnapshotPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  photoUrl: string;
  league_name?: string;
  current_points?: number;
  projected_points?: number;
}

export interface SnapshotLeague {
  id: string;
  name: string;
  ticker: string;
  healthScore: number;
  primarySignal: 'BOOM' | 'BUST' | 'STABLE';
  weekScore: number | null;
  oppScore: number | null;
  signalTone: 'green' | 'amber' | 'red' | 'gray';
}

export interface SnapshotWeeklyHistory {
  week: number;
  label: string;
  pointsFor: number;
  pointsAgainst: number;
}

export interface SnapshotAnnotation {
  index: number;
  player: string;
  note?: string;
}

export interface SnapshotMarketTrend {
  label: string;
  value: number;
  delta: number;
  unit?: string;
}

export interface SnapshotOffer {
  id: string;
  /** Sleeper player_id — used for TFO verdict lookup + PlayerAvatar. */
  player_id?: string;
  player: string;
  position: string;
  team: string;
  league: string;
  score: number;
  photoUrl?: string;
}

export interface SnapshotPlayerGap {
  id: string;
  player: string;
  positionLabel: string;
  pct: number;
}

export interface SnapshotWaiverTarget {
  player_id: string;
  name: string;
  position: string;
  team: string;
  photoUrl: string;
  addCount: number;
  addValue: string;
  trending: boolean;
  tfoScore?: number;
  grade?: string;
  verdict?: string;
  signal?: string;
  signalColor?: string;
}

export interface RotationPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  photoUrl: string;
  /** Most recent week pts if known, otherwise undefined. */
  current_points?: number;
  /** KTC value at time of snapshot (used as the headline delta when no live pts). */
  ktc_value?: number;
  /** Rolling prior-week PPG (owned leagues, best line that week). */
  seasonAvgPpg?: number;
  /** This week pts minus seasonAvgPpg (boom positive, bust negative). */
  forecastDelta?: number;
}

/** Player Hub spotlight row: `tfo_*` from `tfo_cache` + narrative from live TFO formula. */
export interface HubSpotlightPlayer extends RotationPlayer {
  tfoScore: number;
  tfoGrade: string;
  tfoReasoning: string;
  /** Raw `tfo_cache.verdict` for wire / comparisons (may differ from live formula verdict). */
  tfoVerdict: string | null;
}

export type HubSpotlightByLeague = Record<string, { boom: HubSpotlightPlayer | null; bust: HubSpotlightPlayer | null }>;

/** Per-league KTC rollup by skill position for portfolio chart drill-down. */
export interface LeaguePositionKtcTotals {
  QB: number;
  RB: number;
  WR: number;
  TE: number;
}

export interface PortfolioPoint {
  /** Index 0..n-1 in the rolling history window. */
  index: number;
  /** Display label for the X axis (e.g. "Wk 7" or relative tick). */
  label: string;
  /** Total empire value at this point. */
  total: number;
  /** Per-league value at this point keyed by league_id. */
  byLeague: Record<string, number>;
  /** Per-league KTC sums by QB/RB/WR/TE at this history index (same players as byLeague). */
  byLeaguePositionKtc: Record<string, LeaguePositionKtcTotals>;
}

/** Per-league portfolio MVP: biggest share of your weekly team scoring. */
export interface PortfolioMvpSlice {
  leagueId: string;
  leagueName: string;
  /** 0–100 share of your team's points this week. */
  winContributionPct: number;
  player: SnapshotPlayer;
  ktcValue: number;
  /** Last few KTC snapshots for sparkline. */
  valueHistory: number[];
  weeklyPts: number;
  /** NFL matchup for current week, e.g. "ATL vs CIN" (from Sleeper schedule). */
  matchupLabel?: string | null;
  /** `tfo_cache.verdict` for this player in this league (when present). */
  tfoVerdict?: string | null;
}

export interface LeagueHealthSlice {
  leagueName: string;
  injured: number;
  questionable: number;
  suspended: number;
  /** Same formula as global roster health, scoped to this league's roster. */
  readinessScore: number;
}

export interface OvervaluedPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  photoUrl: string;
  ktcValue: number;
  weeklyPts: number;
  /** Rolling prior-week PPG used for percentile cut. */
  seasonAvgPpg: number;
  /** Market vs output composite (higher = more premium vs production). */
  moPts: number;
  /** Higher = more "market premium" vs this week's scoring. */
  overvalueScore: number;
  /** First matching `tfo_cache.verdict` across the user's leagues that roster this player. */
  tfoVerdict?: string | null;
  /** BVI score from `player_values` (when table is populated). */
  bviScore?: number;
  /** bvi_score − ktc_value; negative = overvalued by market vs BVI model. */
  bviDelta?: number;
}

/** Cross-league positional gap: how many of the user's leagues have a weak slot at this position. */
export interface CrossLeagueGap {
  /** e.g. "WR2", "RB1" */
  positionLabel: string;
  /** Number of leagues where this slot is weak (BUST verdict or below KTC threshold). */
  weakCount: number;
  /** Total leagues where user has players at this position. */
  totalCount: number;
  /** weakCount / totalCount × 100, rounded. */
  fillPct: number;
}

export interface TradeScenario {
  sell: SnapshotPlayer;
  buy: SnapshotPlayer;
  leagueName: string;
  /** Model-implied edge % on the buy side. */
  gainPct: number;
  summaryLine: string;
}

export interface ExposureTopRow {
  player_id: string;
  name: string;
  position: string;
  leagueCount: number;
}

/** A BVI-undervalued player that fills a roster gap in a specific league. */
export interface RecommendedTarget {
  player_id: string;
  name: string;
  position: string;
  team: string;
  photoUrl: string;
  /** BVI score from `player_values.bvi_score` (rounded). */
  bviScore: number;
  /** KTC value from `player_values.ktc_value` (rounded). */
  ktcValue: number;
  /** bvi_score - ktc_value; positive = undervalued by market. */
  bviDelta: number;
  /** Roster-gap signal, e.g. "You're thin at WR2". */
  gapReason: string;
  /** Display string: "BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED" */
  bviLine: string;
  tfoVerdict?: string | null;
  leagueId: string;
  leagueName: string;
}

export interface DashboardSnapshot {
  loading: false;
  /** Subscription tier for in-dashboard chrome (matches NavBar logic). */
  userTier: 'free' | 'pro' | 'elite' | 'all_pro_terminal';
  season: string;
  week: number;
  empire: {
    score: number;
    oppScore: number;
    winning: number;
    total: number;
    winProbability: number;
    leaguesCount: number;
    activeTrades: number;
    portfolioValue: number;
  };
  mvp: SnapshotPlayer | null;
  /** Owned player underperforming vs recent PPG (bust spotlight); not opponent threats. */
  threat: SnapshotPlayer | null;
  /** Up to 10 owned players with week-over-season boom signal for hub rotation. */
  topRotation: RotationPlayer[];
  /** Up to 10 owned players with week-over-season bust signal for hub rotation. */
  threatRotation: RotationPlayer[];
  weeklyHistory: SnapshotWeeklyHistory[];
  weeklyAnnotations: SnapshotAnnotation[];
  /** Rolling KTC portfolio value series (last ~8 ticks) — empire total + per-league. */
  portfolioHistory: PortfolioPoint[];
  /** Sum of per-league average roster KTC (league-average "empire" benchmark). */
  portfolioBenchmark: number;
  /** Per-league average roster KTC (all teams in that league). */
  leaguePortfolioBenchmark: Record<string, number>;
  /** Portfolio MVP spotlight, one row per league (rotate in UI). */
  portfolioMvpByLeague: PortfolioMvpSlice[];
  /** Per-league injury counts for the roster rester subtitle rotation. */
  leagueHealthRotation: LeagueHealthSlice[];
  /** Top owned assets where KTC run ahead of this week's points. */
  overvalued: OvervaluedPlayer[];
  /** Concrete sell / buy idea derived from gaps + waivers. */
  tradeScenario: TradeScenario | null;
  starTist: {
    player: SnapshotPlayer;
    status: string;
    metric: string;
    subline: string;
  } | null;
  rosterHealth: {
    score: number;
    headline: string;
    injured: number;
    suspended: number;
    questionable: number;
    healthy: number;
  };
  waivers: SnapshotWaiverTarget[];
  latestOffers: SnapshotOffer[];
  marketTrends: SnapshotMarketTrend[];
  playerGaps: SnapshotPlayerGap[];
  leagues: SnapshotLeague[];
  /** All `player_id` values on your Sleeper rosters (defense-in-depth for client filters). */
  ownedPlayerIds?: string[];
  /** Same player held across multiple leagues (concentration risk). */
  exposureTop?: ExposureTopRow[];
  tradeNote: {
    body: string;
    verdict: 'BOOM' | 'BUST' | 'FAIR';
    confidence: number;
  };
  /** Per-league BOOM/BUST from `tfo_cache` (your roster only). */
  hubSpotlightByLeague: HubSpotlightByLeague;
  /** `tfo_cache.verdict` keyed by Sleeper `player_id` (first league with a row wins). */
  tfoVerdictByPlayerId: Record<string, string>;
  /**
   * 2–3 BVI-undervalued acquisition targets per league, prioritising roster gaps.
   * Empty array when `player_values` table is not yet populated (show skeleton).
   */
  recommendedTargets: RecommendedTarget[];
  /**
   * Top 3 positional slots that are consistently weak across the user's leagues.
   * "WR2 — weak in 8 of 15 leagues". Derived from tfo_cache verdicts + KTC thresholds.
   */
  crossLeagueGaps: CrossLeagueGap[];
}

// ── Helpers ────────────────────────────────────────────────────────────────

const PHOTO_BASE = 'https://sleepercdn.com/content/nfl/players';
/** Sleeper headshot; full-size asset — scale in HUD for crisp display. */
const photoUrl = (id: string) => `${PHOTO_BASE}/${id}.jpg`;

const SKILL_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE']);
const INJURED_STATUSES = new Set(['Out', 'Doubtful', 'O']);
const QUESTIONABLE_STATUSES = new Set(['Questionable', 'Q']);
const SUSPENDED_STATUSES = new Set(['Suspended', 'SUS', 'IR', 'PUP']);

function deriveTicker(name: string, index: number): string {
  const words = (name || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
  const suffix = String(index + 1).padStart(2, '0');
  if (words.length >= 2) return (words[0]?.[0] ?? 'L') + (words[1]?.[0] ?? 'G') + suffix;
  return (words[0]?.slice(0, 2) ?? 'LG') + suffix;
}

function shortenName(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length < 2) return name;
  return `${parts[0]![0]}. ${parts.slice(1).join(' ')}`;
}

function toneFromSignal(signal: 'BOOM' | 'BUST' | 'STABLE'): SnapshotLeague['signalTone'] {
  if (signal === 'BOOM') return 'green';
  if (signal === 'BUST') return 'red';
  return 'amber';
}

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

type TfoCachePick = { player_id: string; tfo_score: number; grade: string | null; verdict: string | null };

function buildHubSpotlightPlayer(
  row: TfoCachePick,
  players: PlayerMap,
  ktcMap: Record<string, number>,
  currentWeekPtsByPid: Record<string, number>,
  seasonAvgPpg: Record<string, number>,
  forecast: 'boom' | 'bust',
): HubSpotlightPlayer | null {
  const p = players[row.player_id];
  if (!p || !SKILL_POSITIONS.has(String(p.position ?? '').toUpperCase())) return null;
  const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
  const cur = currentWeekPtsByPid[row.player_id];
  const avg = seasonAvgPpg[row.player_id];
  const hub = {
    player_id: row.player_id,
    position: p.position,
    team: p.team ?? '—',
    ktc_value: ktcVal,
    seasonAvgPpg: avg !== undefined ? Math.round(avg * 10) / 10 : undefined,
    current_points: cur,
    forecastDelta:
      avg !== undefined && cur !== undefined ? Math.round((cur - avg) * 10) / 10 : undefined,
  };
  const tfoReasoning = calculateTFOScore(inferTFOInputFromHub(hub, forecast)).reasoning;
  const gradeStr = String(row.grade ?? 'VIABLE').replace(/_/g, ' ');
  return {
    player_id: row.player_id,
    name: p.full_name,
    position: p.position,
    team: p.team ?? '—',
    photoUrl: photoUrl(row.player_id),
    current_points: cur,
    ktc_value: ktcVal,
    seasonAvgPpg: hub.seasonAvgPpg,
    forecastDelta: hub.forecastDelta,
    tfoScore: Math.round(Number(row.tfo_score) * 10) / 10,
    tfoGrade: gradeStr,
    tfoReasoning,
    tfoVerdict: row.verdict ? String(row.verdict).trim().toUpperCase().replace(/\s+/g, '_') : null,
  };
}

async function loadHubSpotlightByLeague(
  supabase: ReturnType<typeof createClient>,
  leagues: Array<{ id: string }>,
  userRosterByLeague: Record<string, { players: string[] }>,
  players: PlayerMap,
  ktcMap: Record<string, number>,
  currentWeekPtsByPid: Record<string, number>,
  seasonAvgPpg: Record<string, number>,
): Promise<HubSpotlightByLeague> {
  const entries = await Promise.all(
    leagues.map(async (lg) => {
      const my = userRosterByLeague[lg.id];
      if (!my) return [lg.id, { boom: null, bust: null }] as const;
      const skillPids = my.players.filter((pid) => {
        const p = players[pid];
        return p && SKILL_POSITIONS.has(String(p.position ?? '').toUpperCase());
      });
      if (!skillPids.length) return [lg.id, { boom: null, bust: null }] as const;

      const { data: cacheRows, error } = await supabase
        .from('tfo_cache')
        .select('player_id,tfo_score,grade,verdict')
        .eq('league_id', lg.id)
        .in('player_id', skillPids);

      if (error || !cacheRows?.length) return [lg.id, { boom: null, bust: null }] as const;

      const byPid = new Map<string, TfoCachePick>();
      for (const raw of cacheRows) {
        const row = raw as TfoCachePick;
        const score = Number(row.tfo_score);
        const prev = byPid.get(row.player_id);
        if (!prev || score > prev.tfo_score) byPid.set(row.player_id, { ...row, tfo_score: score });
      }
      const arr = Array.from(byPid.values());
      if (!arr.length) return [lg.id, { boom: null, bust: null }] as const;

      let boomRow = arr[0]!;
      for (const r of arr) {
        if (r.tfo_score > boomRow.tfo_score || (r.tfo_score === boomRow.tfo_score && r.player_id < boomRow.player_id)) {
          boomRow = r;
        }
      }

      let bustRow: TfoCachePick | null = null;
      for (const r of arr) {
        if (r.player_id === boomRow.player_id) continue;
        if (!bustRow || r.tfo_score < bustRow.tfo_score) bustRow = r;
      }

      const boom = buildHubSpotlightPlayer(boomRow, players, ktcMap, currentWeekPtsByPid, seasonAvgPpg, 'boom');
      const bust =
        bustRow != null ? buildHubSpotlightPlayer(bustRow, players, ktcMap, currentWeekPtsByPid, seasonAvgPpg, 'bust') : null;

      return [lg.id, { boom, bust }] as const;
    }),
  );
  return Object.fromEntries(entries) as HubSpotlightByLeague;
}

function buildRankedPlayers(
  ids: string[],
  players: PlayerMap,
  ktcMap: Record<string, number>,
): RankedPlayer[] {
  const byPos: Record<string, Array<{ id: string; value: number; age: number | null; name: string }>> = {};
  for (const id of ids) {
    const p = players[id];
    if (!p) continue;
    const pos = p.position?.toUpperCase() || 'UNKNOWN';
    if (!SKILL_POSITIONS.has(pos)) continue;
    const val = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
    if (!byPos[pos]) byPos[pos] = [];
    byPos[pos]!.push({ id, value: val, age: p.age, name: p.full_name });
  }
  const ranked: RankedPlayer[] = [];
  for (const [pos, group] of Object.entries(byPos)) {
    group.sort((a, b) => b.value - a.value);
    group.forEach((p, i) => {
      ranked.push({
        id: p.id,
        name: p.name,
        position: pos,
        age: p.age,
        ktcValue: p.value,
        positionRank: i + 1,
      });
    });
  }
  return ranked;
}

// ── Route ──────────────────────────────────────────────────────────────────

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const redis = getRedis();
  const cacheKey = `dashboard:snapshot:v8:${user.id}`;
  if (redis) {
    try {
      const cached = await redis.get<DashboardSnapshot>(cacheKey);
      if (cached) return NextResponse.json(cached);
    } catch {}
  }

  // ── 1. Profile + leagues ────────────────────────────────────────────────
  const [{ data: profile }, { data: leagueRows }] = await Promise.all([
    supabase.from('profiles').select('sleeper_user_id, is_paid, subscription_tier').eq('id', user.id).maybeSingle(),
    supabase
      .from('leagues')
      .select('id, name, season, total_rosters')
      .eq('user_id', user.id)
      .order('season', { ascending: false }),
  ]);

  const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
  const leagues = leagueRows ?? [];

  let userTier: 'free' | 'pro' | 'elite' | 'all_pro_terminal' = 'free';
  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  if (rawTier === 'all_pro_terminal') userTier = 'all_pro_terminal';
  else if (rawTier === 'elite') userTier = 'elite';
  else if (rawTier === 'pro' || profile?.is_paid) userTier = 'pro';

  if (!leagues.length) {
    return NextResponse.json({
      error: 'No leagues synced yet',
      hint: 'Visit /onboarding to import your Sleeper leagues.',
    }, { status: 404 });
  }

  // ── 2. Sleeper state (current week) ─────────────────────────────────────
  const state = await fetchNflState();
  const liveSeason = state?.season ?? leagues[0]!.season;
  const liveWeek = Math.max(1, Math.min(18, state?.week ?? state?.display_week ?? 18));

  const weekGames = await fetchWeekMatchups(String(liveSeason), liveWeek);
  const opponentByTeam: Record<string, string> = {};
  for (const g of weekGames) {
    if (g.home_team && g.away_team) {
      opponentByTeam[g.home_team] = g.away_team;
      opponentByTeam[g.away_team] = g.home_team;
    }
  }

  // ── 3. Player DB + KTC values ───────────────────────────────────────────
  const [playerDb, ktcValues] = await Promise.all([fetchAllPlayers(), getKTCValues()]);
  const players: PlayerMap = playerDb ?? {};
  const ktcMap: Record<string, number> = {};
  for (const v of ktcValues ?? []) {
    if (!v.player_name) continue;
    const k = v.player_name.toLowerCase();
    ktcMap[k] = v.ktc_value;
  }

  // ── 4. Per-league rosters ───────────────────────────────────────────────
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

  // Identify the user's roster in each league
  const userRosterByLeague: Record<
    string,
    {
      roster_id: number;
      players: string[];
      starters: string[];
      settings: Record<string, number>;
    }
  > = {};
  for (const lg of leagues) {
    const rs = rostersByLeague[lg.id] ?? [];
    // Never fall back to rs[0] — that roster may belong to another manager (ghost players).
    const yours = ownerSid ? rs.find((r) => String(r.owner_id) === ownerSid) : undefined;
    if (!yours) continue;
    userRosterByLeague[lg.id] = {
      roster_id: yours.roster_id as number,
      players: (yours.players ?? []) as string[],
      starters: (yours.starters ?? []) as string[],
      settings: (yours.settings as Record<string, number>) ?? {},
    };
  }

  const rosterIds = new Set<string>();
  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    if (!my) continue;
    for (const id of my.players) rosterIds.add(id);
  }

  const tfoVerdictByLeaguePlayer = new Map<string, string>();
  const tfoVerdictByPlayerId: Record<string, string> = {};
  {
    const leagueIdsOnly = leagues.map((l) => l.id);
    if (leagueIdsOnly.length) {
      const { data: tfoRows } = await supabase
        .from('tfo_cache')
        .select('league_id, player_id, verdict')
        .in('league_id', leagueIdsOnly);
      for (const row of tfoRows ?? []) {
        const r = row as { league_id?: string; player_id?: string; verdict?: string | null };
        const lid = String(r.league_id ?? '');
        const pid = String(r.player_id ?? '');
        const ver = r.verdict != null ? String(r.verdict).trim() : '';
        if (!lid || !pid || !ver) continue;
        tfoVerdictByLeaguePlayer.set(`${lid}:${pid}`, ver);
      }
      for (const lg of leagues) {
        const my = userRosterByLeague[lg.id];
        if (!my) continue;
        for (const pid of my.players) {
          if (tfoVerdictByPlayerId[pid]) continue;
          const hit = tfoVerdictByLeaguePlayer.get(`${lg.id}:${pid}`);
          if (hit) tfoVerdictByPlayerId[pid] = hit;
        }
      }
    }
  }

  // ── 4b. Cross-league positional gap analysis ────────────────────────────
  // Identifies which positional slots (WR2, RB3 …) are consistently weak
  // across the user's leagues, using tfo_cache verdicts + KTC thresholds.
  const crossLeagueGaps: CrossLeagueGap[] = (() => {
    const posSlots = [
      { pos: 'WR', rank: 1 }, { pos: 'WR', rank: 2 }, { pos: 'WR', rank: 3 },
      { pos: 'RB', rank: 1 }, { pos: 'RB', rank: 2 },
      { pos: 'QB', rank: 1 },
      { pos: 'TE', rank: 1 },
    ] as const;

    // Minimum KTC for a slot to not be "weak" by market value alone
    const KTC_FLOOR: Record<string, number> = { WR: 3500, RB: 3000, QB: 4000, TE: 2000 };

    const results: CrossLeagueGap[] = [];
    for (const { pos, rank } of posSlots) {
      let weakCount = 0;
      let totalCount = 0;
      for (const lg of leagues) {
        const my = userRosterByLeague[lg.id];
        if (!my) continue;
        // Collect user's players at this position, sort by KTC desc
        const posPlayers = my.players
          .filter((pid) => players[pid]?.position?.toUpperCase() === pos)
          .sort(
            (a, b) =>
              (ktcMap[(players[b]?.full_name ?? '').toLowerCase()] ?? 0) -
              (ktcMap[(players[a]?.full_name ?? '').toLowerCase()] ?? 0),
          );
        totalCount++;
        const pid = posPlayers[rank - 1]; // 0-indexed target slot
        if (!pid) {
          // No player at this slot → definitely weak
          weakCount++;
          continue;
        }
        const verdict = tfoVerdictByLeaguePlayer.get(`${lg.id}:${pid}`) ?? '';
        const ktcAtSlot = ktcMap[(players[pid]?.full_name ?? '').toLowerCase()] ?? 0;
        const floor = KTC_FLOOR[pos] ?? 2500;
        if (verdict.includes('BUST') || ktcAtSlot < floor) weakCount++;
      }
      if (totalCount > 0) {
        results.push({
          positionLabel: `${pos}${rank}`,
          weakCount,
          totalCount,
          fillPct: Math.round((weakCount / totalCount) * 100),
        });
      }
    }
    return results.sort((a, b) => b.fillPct - a.fillPct).slice(0, 3);
  })();

  // ── 5. Current week matchups (in parallel) ──────────────────────────────
  const matchupsByLeague = await Promise.all(
    leagues.map(async (lg) => {
      const m = await fetchLeagueMatchups(lg.id, liveWeek);
      return { leagueId: lg.id, matchups: m ?? [] };
    }),
  );
  const matchupMap = new Map(matchupsByLeague.map((m) => [m.leagueId, m.matchups]));

  // ── 6. Empire score for current week ────────────────────────────────────
  let empireScore = 0;
  let empireOpp = 0;
  let winningCount = 0;
  let totalMatchups = 0;

  // Track best player on your roster this week (spotlight). Bust spotlight is set after §8b.
  let mvp: { player_id: string; pts: number; leagueName: string } | null = null;
  let threat: { player_id: string; pts: number; leagueName: string } | null = null;

  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
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

    // MVP candidate from your roster only
    for (const [pid, pts] of Object.entries(myMatchup.players_points ?? {})) {
      if (typeof pts !== 'number') continue;
      if (!my.players.includes(pid)) continue;
      if (!mvp || pts > mvp.pts) {
        mvp = { player_id: pid, pts, leagueName: lg.name };
      }
    }
  }

  // ── 6b. Portfolio MVP per league (largest share of your team's week points) ─
  const portfolioMvpDraft: Array<{
    leagueId: string;
    leagueName: string;
    winContributionPct: number;
    weeklyPts: number;
    playerId: string;
    ktcValue: number;
  }> = [];

  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    const matchups = matchupMap.get(lg.id) ?? [];
    if (!my || !matchups.length) continue;
    const mine = matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id);
    const pp = mine?.players_points;
    if (!mine || !pp) continue;
    const teamPts = Math.max(1, mine.points ?? 0);
    const cand = new Set<string>();
    for (const pid of my.starters ?? []) cand.add(pid);
    for (const pid of my.players) {
      if (pp[pid] !== undefined) cand.add(pid);
    }
    let bestPid: string | null = null;
    let bestShare = -1;
    for (const pid of Array.from(cand)) {
      const pts = pp[pid];
      if (typeof pts !== 'number') continue;
      const share = (pts / teamPts) * 100;
      if (share > bestShare + 1e-6) {
        bestShare = share;
        bestPid = pid;
      }
    }
    if (!bestPid || !my.players.includes(bestPid)) continue;
    const p = players[bestPid];
    if (!p) continue;
    const kv = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
    portfolioMvpDraft.push({
      leagueId: lg.id,
      leagueName: lg.name ?? 'League',
      winContributionPct: Math.round(bestShare * 10) / 10,
      weeklyPts: typeof pp[bestPid] === 'number' ? (pp[bestPid] as number) : 0,
      playerId: bestPid,
      ktcValue: kv,
    });
  }

  const mvpHistories = await Promise.all(
    portfolioMvpDraft.map((d) => getPlayerValueHistory(d.playerId)),
  );
  const portfolioMvpByLeague: PortfolioMvpSlice[] = portfolioMvpDraft.map((d, i) => {
    const p = players[d.playerId];
    if (!p) {
      return {
        leagueId: d.leagueId,
        leagueName: d.leagueName,
        winContributionPct: d.winContributionPct,
        weeklyPts: d.weeklyPts,
        ktcValue: d.ktcValue,
        valueHistory: mvpHistories[i] ?? [],
        matchupLabel: null,
        tfoVerdict: tfoVerdictByLeaguePlayer.get(`${d.leagueId}:${d.playerId}`) ?? null,
        player: {
          player_id: d.playerId,
          name: 'Unknown',
          position: '—',
          team: '—',
          photoUrl: photoUrl(d.playerId),
          league_name: d.leagueName,
          current_points: d.weeklyPts,
        },
      };
    }
    const teamAbbr = (p.team ?? '').toUpperCase();
    const opp = teamAbbr ? opponentByTeam[teamAbbr] : undefined;
    const matchupLabel = teamAbbr && opp ? `${teamAbbr} vs ${opp}` : null;
    return {
      leagueId: d.leagueId,
      leagueName: d.leagueName,
      winContributionPct: d.winContributionPct,
      weeklyPts: d.weeklyPts,
      ktcValue: d.ktcValue,
      valueHistory: mvpHistories[i] ?? [],
      matchupLabel,
      tfoVerdict: tfoVerdictByLeaguePlayer.get(`${d.leagueId}:${d.playerId}`) ?? null,
      player: {
        player_id: d.playerId,
        name: p.full_name,
        position: p.position,
        team: p.team ?? '—',
        photoUrl: photoUrl(d.playerId),
        league_name: d.leagueName,
        current_points: d.weeklyPts,
      },
    };
  });

  // ── 7. Weekly history (last 6 weeks) ────────────────────────────────────
  const historyWeeks = Array.from({ length: 6 }, (_, i) => liveWeek - 5 + i).filter(
    (w) => w >= 1,
  );

  const historyRequests: Array<Promise<{ week: number; pf: number; pa: number }>> = [];
  for (const w of historyWeeks) {
    historyRequests.push(
      (async () => {
        let pf = 0;
        let pa = 0;
        await Promise.all(
          leagues.map(async (lg) => {
            const my = userRosterByLeague[lg.id];
            if (!my) return;
            const matchups =
              w === liveWeek ? matchupMap.get(lg.id) ?? [] : (await fetchLeagueMatchups(lg.id, w)) ?? [];
            if (!matchups.length) return;
            const mine = matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id);
            if (!mine) return;
            const opp = matchups.find(
              (m: SleeperMatchup) =>
                m.matchup_id === mine.matchup_id && m.roster_id !== my.roster_id,
            );
            pf += mine.points ?? 0;
            if (opp) pa += opp.points ?? 0;
          }),
        );
        return { week: w, pf, pa };
      })(),
    );
  }
  const historyRaw = await Promise.all(historyRequests);
  const weeklyHistory: SnapshotWeeklyHistory[] = historyRaw.map((h) => ({
    week: h.week,
    label: `Wk ${h.week}`,
    pointsFor: Math.round(h.pf * 10) / 10,
    pointsAgainst: Math.round(h.pa * 10) / 10,
  }));

  // ── 8. Weekly chart annotations: best player each historical week ───────
  const weeklyAnnotations: SnapshotAnnotation[] = [];
  for (let i = 0; i < historyWeeks.length; i++) {
    const w = historyWeeks[i]!;
    let topId: string | null = null;
    let topPts = 0;
    let topLeague: string = leagues[0]!.name;
    await Promise.all(
      leagues.map(async (lg) => {
        const my = userRosterByLeague[lg.id];
        if (!my) return;
        const matchups =
          w === liveWeek ? matchupMap.get(lg.id) ?? [] : (await fetchLeagueMatchups(lg.id, w)) ?? [];
        const mine = matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id);
        if (!mine) return;
        for (const [pid, pts] of Object.entries(mine.players_points ?? {})) {
          if (!rosterIds.has(pid)) continue;
          if (typeof pts === 'number' && pts > topPts) {
            topPts = pts;
            topId = pid;
            topLeague = lg.name;
          }
        }
      }),
    );
    if (topId) {
      const p = players[topId];
      if (p) {
        weeklyAnnotations.push({
          index: i,
          player: shortenName(p.full_name),
          note: `${topPts.toFixed(1)} pts · ${topLeague}`,
        });
      }
    }
  }

  // ── 8b. Prior-week PPG vs this week (owned skill only) — boom / bust hubs ─
  const LOOKBACK = 5;
  const priorWeeks = Array.from({ length: LOOKBACK }, (_, i) => liveWeek - 1 - i).filter(
    (w) => w >= 1,
  );
  const sumsByPid: Record<string, number> = {};
  const countsByPid: Record<string, number> = {};

  for (const w of priorWeeks) {
    const bestByPid: Record<string, number> = {};
    await Promise.all(
      leagues.map(async (lg) => {
        const my = userRosterByLeague[lg.id];
        if (!my) return;
        const matchups =
          w === liveWeek ? matchupMap.get(lg.id) ?? [] : (await fetchLeagueMatchups(lg.id, w)) ?? [];
        const mine = matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id);
        if (!mine?.players_points) return;
        for (const pid of my.players) {
          if (!rosterIds.has(pid)) continue;
          const pts = mine.players_points[pid];
          if (typeof pts !== 'number') continue;
          const pos = players[pid]?.position?.toUpperCase() ?? '';
          if (!SKILL_POSITIONS.has(pos)) continue;
          bestByPid[pid] = Math.max(bestByPid[pid] ?? 0, pts);
        }
      }),
    );
    for (const [pid, pts] of Object.entries(bestByPid)) {
      sumsByPid[pid] = (sumsByPid[pid] ?? 0) + pts;
      countsByPid[pid] = (countsByPid[pid] ?? 0) + 1;
    }
  }

  const seasonAvgPpg: Record<string, number> = {};
  for (const pid of Object.keys(sumsByPid)) {
    const n = countsByPid[pid] ?? 1;
    seasonAvgPpg[pid] = n > 0 ? sumsByPid[pid]! / n : 0;
  }

  const currentWeekPtsByPid: Record<string, number> = {};
  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    if (!my) continue;
    const mine = (matchupMap.get(lg.id) ?? []).find((m: SleeperMatchup) => m.roster_id === my.roster_id);
    if (!mine?.players_points) continue;
    for (const pid of my.players) {
      if (!rosterIds.has(pid)) continue;
      const pts = mine.players_points[pid];
      if (typeof pts !== 'number') continue;
      const pos = players[pid]?.position?.toUpperCase() ?? '';
      if (!SKILL_POSITIONS.has(pos)) continue;
      currentWeekPtsByPid[pid] = Math.max(currentWeekPtsByPid[pid] ?? 0, pts);
    }
  }

  type ForecastCand = { pid: string; ratio: number; cur: number; avg: number };
  const boomCandidates: ForecastCand[] = [];
  const bustCandidates: ForecastCand[] = [];
  for (const pid of Array.from(rosterIds)) {
    const pos = players[pid]?.position?.toUpperCase() ?? '';
    if (!SKILL_POSITIONS.has(pos)) continue;
    const cur = currentWeekPtsByPid[pid] ?? 0;
    const avg = seasonAvgPpg[pid] ?? 0;
    if (avg >= 2 && cur > avg * 1.08) {
      boomCandidates.push({ pid, ratio: cur / avg, cur, avg });
    }
    if (avg >= 4 && cur < avg * 0.92) {
      bustCandidates.push({ pid, ratio: avg / Math.max(cur, 0.25), cur, avg });
    }
  }
  boomCandidates.sort((a, b) => b.ratio - a.ratio);
  bustCandidates.sort((a, b) => b.ratio - a.ratio);

  function toForecastRotation(list: ForecastCand[]): RotationPlayer[] {
    const out: RotationPlayer[] = [];
    for (const c of list.slice(0, 10)) {
      if (!rosterIds.has(c.pid)) continue;
      const p = players[c.pid];
      if (!p) continue;
      const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
      out.push({
        player_id: c.pid,
        name: p.full_name,
        position: p.position,
        team: p.team ?? '—',
        photoUrl: photoUrl(c.pid),
        current_points: c.cur,
        ktc_value: ktcVal,
        seasonAvgPpg: Math.round(c.avg * 10) / 10,
        forecastDelta: Math.round((c.cur - c.avg) * 10) / 10,
      });
    }
    return out;
  }

  const boomRotation = toForecastRotation(boomCandidates);
  const bustRotation = toForecastRotation(bustCandidates);

  let hubSpotlightByLeague: HubSpotlightByLeague = {};
  try {
    hubSpotlightByLeague = await loadHubSpotlightByLeague(
      supabase,
      leagues,
      userRosterByLeague,
      players,
      ktcMap,
      currentWeekPtsByPid,
      seasonAvgPpg,
    );
  } catch (err) {
    console.error('[snapshot] hubSpotlightByLeague:', err);
    for (const lg of leagues) {
      hubSpotlightByLeague[lg.id] = { boom: null, bust: null };
    }
  }

  if (bustCandidates[0]) {
    const bc = bustCandidates[0]!;
    threat = {
      player_id: bc.pid,
      pts: bc.cur,
      leagueName: `${bc.avg.toFixed(1)} avg`,
    };
  }

  // ── 9. Roster health across all leagues ─────────────────────────────────
  let injured = 0;
  let suspended = 0;
  let questionable = 0;
  let healthy = 0;
  Array.from(rosterIds).forEach((id) => {
    const p = players[id];
    const status = (p?.injury_status ?? '').trim();
    if (!status || status === 'Healthy') {
      healthy++;
    } else if (INJURED_STATUSES.has(status)) {
      injured++;
    } else if (SUSPENDED_STATUSES.has(status)) {
      suspended++;
    } else if (QUESTIONABLE_STATUSES.has(status)) {
      questionable++;
    } else {
      healthy++;
    }
  });
  const rosterTotal = rosterIds.size || 1;
  const healthScorePct = Math.round(((healthy + questionable * 0.7) / rosterTotal) * 100);
  const headline =
    healthScorePct >= 85 ? 'Great' : healthScorePct >= 70 ? 'Stable' : healthScorePct >= 50 ? 'Patchwork' : 'Critical';

  const leagueHealthRotation: LeagueHealthSlice[] = [];
  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    if (!my) continue;
    let li = 0;
    let ls = 0;
    let lq = 0;
    let lh = 0;
    for (const id of my.players) {
      const p = players[id];
      const status = (p?.injury_status ?? '').trim();
      if (!status || status === 'Healthy') {
        lh++;
      } else if (INJURED_STATUSES.has(status)) {
        li++;
      } else if (SUSPENDED_STATUSES.has(status)) {
        ls++;
      } else if (QUESTIONABLE_STATUSES.has(status)) {
        lq++;
      } else {
        lh++;
      }
    }
    const rosterL = my.players.length || 1;
    const readinessScore = Math.round(((lh + lq * 0.7) / rosterL) * 100);
    leagueHealthRotation.push({
      leagueName: lg.name ?? 'League',
      injured: li,
      questionable: lq,
      suspended: ls,
      readinessScore,
    });
  }

  // ── 10. StarTist: highest-KTC player on user's combined roster ──────────
  let starTist: DashboardSnapshot['starTist'] = null;
  let topKtcId: string | null = null;
  let topKtc = 0;
  Array.from(rosterIds).forEach((id) => {
    const p = players[id];
    if (!p) return;
    const v = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
    if (v > topKtc) {
      topKtc = v;
      topKtcId = id;
    }
  });
  if (portfolioMvpByLeague.length > 0) {
    const slice = portfolioMvpByLeague[0]!;
    const p = slice.player;
    starTist = {
      player: {
        player_id: p.player_id,
        name: p.name,
        position: p.position,
        team: p.team,
        photoUrl: p.photoUrl,
        league_name: slice.leagueName,
        current_points: slice.weeklyPts,
      },
      status: slice.winContributionPct >= 22 ? 'MVP week' : 'Carrying',
      metric: `${Math.round(slice.ktcValue)} KTC`,
      subline: `${slice.weeklyPts.toFixed(1)} pts · ${slice.winContributionPct.toFixed(0)}% win share · ${slice.leagueName}`,
    };
  } else if (topKtcId && players[topKtcId]) {
    const p = players[topKtcId];
    let weeklyPts: number | undefined;
    const allMatchups = Array.from(matchupMap.values());
    for (const matchups of allMatchups) {
      for (const m of matchups) {
        const pp = m.players_points?.[topKtcId];
        if (typeof pp === 'number') {
          weeklyPts = pp;
          break;
        }
      }
      if (weeklyPts !== undefined) break;
    }
    starTist = {
      player: {
        player_id: topKtcId,
        name: p.full_name,
        position: p.position,
        team: p.team ?? '—',
        photoUrl: photoUrl(topKtcId),
      },
      status: weeklyPts && weeklyPts > 18 ? 'Booming' : 'Great',
      metric: `${topKtc.toFixed(0)} KTC`,
      subline: weeklyPts !== undefined ? `${weeklyPts.toFixed(1)} pts this wk` : 'Cornerstone asset',
    };
  }

  // ── 11. Trending adds (waiver wire) ─────────────────────────────────────
  const trending = (await fetchTrendingPlayers('add', 24, 24)) ?? [];
  const ownedSet = rosterIds;
  const waivers: SnapshotWaiverTarget[] = [];
  for (const t of trending) {
    if (ownedSet.has(t.player_id)) continue;
    const p = players[t.player_id];
    if (!p) continue;
    if (!SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '')) continue;
    const ktcCurrent = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
    const depthOrder = (p as { depth_chart_order?: number }).depth_chart_order ?? 2;
    const opportunityScore = depthOrder === 1 ? 85 : depthOrder === 2 ? 55 : 30;
    let tfoScore: number | undefined;
    let grade: string | undefined;
    let verdict: string | undefined;
    let signal: string | undefined;
    let signalColor: string | undefined;
    const pos = p.position?.toUpperCase() as 'QB' | 'RB' | 'WR' | 'TE' | undefined;
    if (pos && ['QB', 'RB', 'WR', 'TE'].includes(pos) && p.team) {
      try {
        const tfo = calculateTFOScore({
          playerId: t.player_id,
          position: pos,
          age: p.age ?? 25,
          team: p.team,
          ocScheme: 'default',
          opportunityScore,
          olGrade: 65,
          wrCastGrade: 65,
          redZoneShare: depthOrder === 1 ? 25 : 10,
          ktcValue: ktcCurrent,
        });
        const bbsm = calculateBBSM({ tfoScore: tfo.tfoScore, ktcCurrent, ktcPrior: 0 });
        tfoScore = tfo.tfoScore;
        grade = tfo.grade;
        verdict = tfo.verdict;
        signal = bbsm.signal;
        signalColor = bbsm.signalColor;
      } catch {}
    }
    waivers.push({
      player_id: t.player_id,
      name: p.full_name,
      position: p.position,
      team: p.team ?? 'FA',
      photoUrl: photoUrl(t.player_id),
      addCount: t.count,
      addValue: `+${Math.min(99, Math.round((t.count / 1000) * 100))}% Add`,
      trending: true,
      tfoScore,
      grade,
      verdict,
      signal,
      signalColor,
    });
    if (waivers.length >= 6) break;
  }

  // ── 12. Latest pending offers across leagues ────────────────────────────
  const latestOffers: SnapshotOffer[] = [];
  await Promise.all(
    leagues.slice(0, 8).map(async (lg) => {
      try {
        const txns = await fetchTransactions(lg.id, liveWeek);
        if (!txns) return;
        for (const tx of txns) {
          if (tx.type !== 'trade') continue;
          const myInvolved = userRosterByLeague[lg.id]
            ? tx.roster_ids?.includes(userRosterByLeague[lg.id]!.roster_id)
            : false;
          if (!myInvolved) continue;
          // Pull each added player as a row
          for (const [pid, ridRaw] of Object.entries(tx.adds ?? {})) {
            const rid = Number(ridRaw);
            const p = players[pid];
            if (!p) continue;
            const isYou = userRosterByLeague[lg.id]?.roster_id === rid;
            const score = isYou ? Math.abs(t_random_score(pid)) : -Math.abs(t_random_score(pid));
            latestOffers.push({
              id: `${tx.transaction_id}-${pid}`,
              player_id: pid,
              player: shortenName(p.full_name),
              position: p.position,
              team: p.team ?? '—',
              league: lg.name,
              score,
              photoUrl: photoUrl(pid),
            });
          }
        }
      } catch {
        /* best-effort */
      }
    }),
  );

  // sort by abs score and trim
  latestOffers.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  const latestOffersTop = latestOffers.slice(0, 5);

  // ── 13. Per-league summaries ────────────────────────────────────────────
  const allRosterIds = Array.from(
    new Set(
      Object.values(userRosterByLeague).flatMap((r) => r.players),
    ),
  );
  const globalRanked = buildRankedPlayers(allRosterIds, players, ktcMap);
  const globalRankIndex = new Map(globalRanked.map((r) => [r.id, r.positionRank]));

  let portfolioValue = 0;
  const summaryLeagues: SnapshotLeague[] = leagues.map((lg, i) => {
    const my = userRosterByLeague[lg.id];
    const ids = my?.players ?? [];
    const ranked = buildRankedPlayers(ids, players, ktcMap).map((rp) => ({
      ...rp,
      positionRank: globalRankIndex.get(rp.id) ?? rp.positionRank,
    }));
    const healthScore = calculateLeagueHealthScore({
      rankedPlayers: ranked,
      extra1stRoundPicks: 0,
    });
    const signal = derivePrimarySignal(healthScore);
    const matchups = matchupMap.get(lg.id) ?? [];
    const mine = my ? matchups.find((m: SleeperMatchup) => m.roster_id === my.roster_id) : undefined;
    const opp = mine
      ? matchups.find(
          (m: SleeperMatchup) =>
            m.matchup_id === mine.matchup_id && m.roster_id !== mine.roster_id,
        )
      : undefined;
    const rosterValue = ids.reduce((sum, id) => {
      const p = players[id];
      const v = p ? ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0 : 0;
      return sum + v;
    }, 0);
    portfolioValue += rosterValue;
    return {
      id: lg.id,
      name: lg.name ?? 'Unknown',
      ticker: deriveTicker(lg.name ?? 'LG', i),
      healthScore,
      primarySignal: signal,
      weekScore: mine?.points ?? null,
      oppScore: opp?.points ?? null,
      signalTone: toneFromSignal(signal),
    };
  });

  const rosterKtcSum = (ids: string[]) =>
    ids.reduce((sum, pid) => {
      const pl = players[pid];
      return sum + (pl ? ktcMap[(pl.full_name ?? '').toLowerCase()] ?? 0 : 0);
    }, 0);

  const leaguePortfolioBenchmark: Record<string, number> = {};
  let portfolioBenchmark = 0;
  for (const lg of leagues) {
    const rows = rostersByLeague[lg.id] ?? [];
    const teamTotals: number[] = [];
    for (const row of rows) {
      const ids = (row.players ?? []) as string[];
      teamTotals.push(rosterKtcSum(ids));
    }
    const avg = teamTotals.length
      ? Math.round(teamTotals.reduce((a, b) => a + b, 0) / teamTotals.length)
      : 0;
    leaguePortfolioBenchmark[lg.id] = avg;
    portfolioBenchmark += avg;
  }

  // ── 14. Market trends (aggregate snapshot) ──────────────────────────────
  const marketTrends: SnapshotMarketTrend[] = [
    { label: 'Bust Risk', value: injured + suspended, delta: 0, unit: '' },
    { label: 'Boom Potential', value: waivers.length, delta: 0, unit: '' },
    {
      label: 'Pending Trades',
      value: latestOffers.length,
      delta: 0,
      unit: '',
    },
    {
      label: 'Avg Health',
      value: healthScorePct,
      delta: healthScorePct - 80,
      unit: '%',
    },
    {
      label: 'Empire Edge',
      value: empireScore - empireOpp,
      delta: empireScore && empireOpp ? ((empireScore - empireOpp) / empireOpp) * 100 : 0,
      unit: '',
    },
  ];

  // ── 15. Player gaps: top KTC players the user owns vs market position ──
  const playerGaps: SnapshotPlayerGap[] = globalRanked
    .filter((p) => p.ktcValue > 0)
    .sort((a, b) => b.ktcValue - a.ktcValue)
    .slice(0, 6)
    .map((p) => ({
      id: p.id,
      player: shortenName(p.name),
      positionLabel: `${p.position} #${p.positionRank}`,
      pct: Math.max(-30, Math.min(30, Math.round((100 - p.positionRank * 2) / 2))),
    }));

  const skillOwned = globalRanked.filter((r) => {
    const p = players[r.id];
    if (!p) return false;
    return SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '');
  });

  const ppgsSorted = skillOwned
    .map((r) => seasonAvgPpg[r.id] ?? 0)
    .filter((x) => x > 0.25)
    .sort((a, b) => a - b);
  const p40Cut =
    ppgsSorted.length === 0
      ? Infinity
      : ppgsSorted[Math.max(0, Math.floor(0.4 * (ppgsSorted.length - 1)))];

  const ktcSortedAsc = skillOwned.map((r) => r.ktcValue).sort((a, b) => a - b);
  const expensiveFloor =
    ktcSortedAsc.length === 0
      ? 0
      : ktcSortedAsc[
          Math.min(ktcSortedAsc.length - 1, Math.floor(0.7 * (ktcSortedAsc.length - 1)))
        ];

  const weekPtsBestAcrossLeagues = (pid: string): number => {
    let weekPts = 0;
    for (const lg of leagues) {
      const myRid = userRosterByLeague[lg.id]?.roster_id;
      if (myRid === undefined) continue;
      const mine = (matchupMap.get(lg.id) ?? []).find((m: SleeperMatchup) => m.roster_id === myRid);
      const pts = mine?.players_points?.[pid];
      if (typeof pts === 'number') weekPts = Math.max(weekPts, pts);
    }
    return weekPts;
  };

  const overvaluedRaw: OvervaluedPlayer[] = [];
  for (const rp of skillOwned) {
    const p = players[rp.id];
    if (!p) continue;
    const ppg = seasonAvgPpg[rp.id] ?? 0;
    if (ppg <= 0.25) continue;
    if (ppg > p40Cut) continue;
    if (rp.ktcValue < expensiveFloor) continue;

    const weekPts = weekPtsBestAcrossLeagues(rp.id);
    const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? rp.ktcValue;
    const moPts = Math.round(ktcVal / 200 - ppg * 3);
    const overvalueScore = Math.round(ktcVal - weekPts * 180 + moPts * 40);
    overvaluedRaw.push({
      player_id: rp.id,
      name: p.full_name,
      position: p.position,
      team: p.team ?? '—',
      photoUrl: photoUrl(rp.id),
      ktcValue: Math.round(ktcVal),
      weeklyPts: weekPts,
      seasonAvgPpg: Math.round(ppg * 10) / 10,
      moPts,
      overvalueScore,
      tfoVerdict: tfoVerdictByPlayerId[rp.id] ?? null,
    });
  }
  overvaluedRaw.sort((a, b) => b.moPts - a.moPts || b.ktcValue - a.ktcValue);
  let overvalued = overvaluedRaw.slice(0, 3);

  if (overvalued.length === 0 && skillOwned.length > 0) {
    /** Highest KTC roster pieces with this-week PPG below season rolling avg (negative delta). */
    const negDeltaRows: OvervaluedPlayer[] = [];
    for (const rp of skillOwned) {
      const p = players[rp.id];
      if (!p) continue;
      const ppg = seasonAvgPpg[rp.id] ?? 0;
      if (ppg <= 0.1) continue;
      const weekPts = weekPtsBestAcrossLeagues(rp.id);
      const ppgDelta = weekPts - ppg;
      if (ppgDelta >= 0) continue;
      const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? rp.ktcValue;
      const moPts = Math.round(ktcVal / 200 - ppg * 3);
      negDeltaRows.push({
        player_id: rp.id,
        name: p.full_name,
        position: p.position,
        team: p.team ?? '—',
        photoUrl: photoUrl(rp.id),
        ktcValue: Math.round(ktcVal),
        weeklyPts: weekPts,
        seasonAvgPpg: Math.round(ppg * 10) / 10,
        moPts,
        overvalueScore: Math.round(ktcVal + ppgDelta * 120),
        tfoVerdict: tfoVerdictByPlayerId[rp.id] ?? null,
      });
    }
    negDeltaRows.sort((a, b) => b.ktcValue - a.ktcValue || a.moPts - b.moPts);
    overvalued = negDeltaRows.slice(0, 3);
  }

  if (overvalued.length === 0 && skillOwned.length > 0) {
    const topKtc = [...skillOwned].sort((a, b) => b.ktcValue - a.ktcValue).slice(0, 3);
    overvalued = topKtc
      .map((rp): OvervaluedPlayer | null => {
        const p = players[rp.id];
        if (!p) return null;
        const ppg = seasonAvgPpg[rp.id] ?? 0;
        const weekPts = weekPtsBestAcrossLeagues(rp.id);
        const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? rp.ktcValue;
        const moPts = Math.round(ktcVal / 200 - ppg * 3);
        return {
          player_id: rp.id,
          name: p.full_name,
          position: p.position,
          team: p.team ?? '—',
          photoUrl: photoUrl(rp.id),
          ktcValue: Math.round(ktcVal),
          weeklyPts: weekPts,
          seasonAvgPpg: Math.round(ppg * 10) / 10,
          moPts,
          overvalueScore: Math.round(ktcVal),
          tfoVerdict: tfoVerdictByPlayerId[rp.id] ?? null,
        };
      })
      .filter((x): x is OvervaluedPlayer => x !== null);
  }

  // ── BVI join for overvalued players ─────────────────────────────────────
  // Attach player_values BVI data when available so the sidebar can display
  // "BVI: {x} | KTC: {y} | △{delta} OVERVALUED" in JetBrains Mono.
  if (overvalued.length > 0) {
    try {
      const ovIds = overvalued.map((p) => p.player_id);
      const { data: bviRows } = await supabase
        .from('player_values')
        .select('player_id, bvi_score, ktc_value, delta')
        .in('player_id', ovIds)
        .eq('scoring_type', 'ppr');
      if (bviRows?.length) {
        type BVILite = { player_id: string; bvi_score: number; ktc_value: number; delta: number };
        const bviMap = new Map<string, BVILite>(
          (bviRows as BVILite[]).map((r) => [r.player_id, r]),
        );
        overvalued = overvalued.map((p) => {
          const bvi = bviMap.get(p.player_id);
          if (!bvi) return p;
          return {
            ...p,
            bviScore: Math.round(Number(bvi.bvi_score)),
            bviDelta: Math.round(Number(bvi.delta)),
          };
        });
      }
    } catch {
      // Non-fatal — BVI fields remain undefined, sidebar falls back to KTC display
    }
  }

  let tradeScenario: TradeScenario | null = null;
  if (overvalued.length > 0 && waivers.length > 0) {
    const sellRow = overvalued[0]!;
    const buyW = waivers[0]!;
    const sellP = players[sellRow.player_id];
    const buyP = players[buyW.player_id];
    if (sellP && buyP) {
      const lgName = leagues[0]?.name ?? 'your league';
      const gainPct = Math.min(
        92,
        Math.max(8, Math.round(sellRow.overvalueScore / Math.max(400, sellRow.ktcValue / 4))),
      );
      tradeScenario = {
        sell: {
          player_id: sellRow.player_id,
          name: sellP.full_name,
          position: sellP.position,
          team: sellP.team ?? '—',
          photoUrl: photoUrl(sellRow.player_id),
        },
        buy: {
          player_id: buyW.player_id,
          name: buyP.full_name,
          position: buyP.position,
          team: buyP.team ?? '—',
          photoUrl: photoUrl(buyW.player_id),
        },
        leagueName: lgName,
        gainPct,
        summaryLine: `Sell high on ${shortenName(sellP.full_name)} in ${lgName} for ${shortenName(buyP.full_name)}`,
      };
    }
  }

  // ── 16. Build MVP / Threat output + rotation pools ──────────────────────
  const buildSnapshotPlayer = (
    cand: { player_id: string; pts: number; leagueName: string } | null,
  ): SnapshotPlayer | null => {
    if (!cand) return null;
    if (!rosterIds.has(cand.player_id)) return null;
    const p = players[cand.player_id];
    if (!p) return null;
    return {
      player_id: cand.player_id,
      name: p.full_name,
      position: p.position,
      team: p.team ?? '—',
      photoUrl: photoUrl(cand.player_id),
      league_name: cand.leagueName,
      current_points: cand.pts,
    };
  };

  // ── Recommended Targets: BVI undervalue × roster gaps ───────────────────
  // Queries `player_values` (populated nightly by BVI engine). Returns empty
  // array when table is unpopulated — client shows skeleton in that case.
  const recommendedTargets: RecommendedTarget[] = await (async () => {
    const out: RecommendedTarget[] = [];
    try {
      const { data: pvRows } = await supabase
        .from('player_values')
        .select('player_id, bvi_score, ktc_value, delta')
        .gt('delta', 100)
        .eq('scoring_type', 'ppr')
        .order('delta', { ascending: false })
        .limit(100);

      if (!pvRows || pvRows.length === 0) return out;

      // Build a fast BVI lookup by player_id
      type PVRow = { player_id: string; bvi_score: number; ktc_value: number; delta: number };
      const pvMap = new Map<string, PVRow>();
      for (const raw of pvRows) {
        const r = raw as PVRow;
        pvMap.set(r.player_id, r);
      }

      // Dynasty roster depth targets by position
      const NEEDED: Record<string, number> = { QB: 2, RB: 5, WR: 6, TE: 2 };

      for (const lg of leagues) {
        const my = userRosterByLeague[lg.id];
        if (!my) continue;

        // Sort each position bucket by KTC descending
        const byPos: Record<string, string[]> = { QB: [], RB: [], WR: [], TE: [] };
        for (const pid of my.players) {
          const p = players[pid];
          if (!p) continue;
          const pos = p.position?.toUpperCase() ?? '';
          if (byPos[pos]) byPos[pos]!.push(pid);
        }
        for (const pos of Object.keys(byPos)) {
          byPos[pos]!.sort((a, b) => {
            const ka = ktcMap[(players[a]?.full_name ?? '').toLowerCase()] ?? 0;
            const kb = ktcMap[(players[b]?.full_name ?? '').toLowerCase()] ?? 0;
            return kb - ka;
          });
        }

        // Identify the weakest position slot (lowest KTC at their Nth player)
        let gapPos = 'WR';
        let gapRank = 3;
        let worstKtc = Infinity;
        for (const [pos, needed] of Object.entries(NEEDED)) {
          const pids = byPos[pos] ?? [];
          const slotIdx = Math.min(needed - 1, pids.length); // 0-indexed target slot
          const pidAtSlot = pids[slotIdx];
          const ktcAtSlot = pidAtSlot
            ? ktcMap[(players[pidAtSlot]?.full_name ?? '').toLowerCase()] ?? 0
            : 0;
          if (ktcAtSlot < worstKtc) {
            worstKtc = ktcAtSlot;
            gapPos = pos;
            gapRank = slotIdx + 1; // 1-indexed
          }
        }
        const gapLabel = `${gapPos}${gapRank}`;

        // Filter BVI-undervalued players not on this roster, ranked by (gap boost + delta)
        const lgRosterSet = new Set(my.players);
        const candidates = pvRows
          .map((raw) => raw as PVRow)
          .filter((r) => {
            if (lgRosterSet.has(r.player_id)) return false;
            const p = players[r.player_id];
            return p && SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '') && (p.team ?? '') !== '';
          })
          .sort((a, b) => {
            const posA = players[a.player_id]?.position?.toUpperCase() ?? '';
            const posB = players[b.player_id]?.position?.toUpperCase() ?? '';
            const boostA = posA === gapPos ? 2000 : 0;
            const boostB = posB === gapPos ? 2000 : 0;
            return b.delta + boostB - (a.delta + boostA);
          })
          .slice(0, 3);

        for (const r of candidates) {
          const p = players[r.player_id];
          if (!p) continue;
          const bviScore = Math.round(Number(r.bvi_score));
          const ktcVal = Math.round(Number(r.ktc_value));
          const delta = Math.round(Number(r.delta));
          const isGapPos = (p.position?.toUpperCase() ?? '') === gapPos;
          const gapReason = isGapPos
            ? `You're thin at ${gapLabel}`
            : `BVI edge · ${p.position} undervalued`;
          const bviLine = `BVI: ${bviScore.toLocaleString()} | KTC: ${ktcVal.toLocaleString()} | △${delta >= 0 ? '+' : ''}${delta.toLocaleString()} UNDERVALUED`;
          out.push({
            player_id: r.player_id,
            name: p.full_name,
            position: p.position,
            team: p.team ?? '—',
            photoUrl: photoUrl(r.player_id),
            bviScore,
            ktcValue: ktcVal,
            bviDelta: delta,
            gapReason,
            bviLine,
            tfoVerdict: tfoVerdictByPlayerId[r.player_id] ?? null,
            leagueId: lg.id,
            leagueName: lg.name ?? 'League',
          });
        }
      }
    } catch (err) {
      console.error('[snapshot] recommendedTargets:', err);
    }
    return out;
  })();

  // Hub rotation: boom/bust vs season avg when signal exists; else KTC / roster staples.
  const topByKtcIds = globalRanked
    .filter((r) => r.ktcValue > 0)
    .slice(0, 10)
    .map((r) => r.id);
  const rosterDupCount = new Map<string, number>();
  for (const lg of leagues) {
    const my = userRosterByLeague[lg.id];
    if (!my) continue;
    for (const pid of my.players) {
      rosterDupCount.set(pid, (rosterDupCount.get(pid) ?? 0) + 1);
    }
  }
  const mostRosteredIds = Array.from(rosterDupCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
    .slice(0, 10);

  const toRotationEntry = (id: string): RotationPlayer | null => {
    const p = players[id];
    if (!p || !SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '')) return null;
    if (!rosterIds.has(id)) return null;
    let currentPts: number | undefined;
    for (const matchups of Array.from(matchupMap.values())) {
      for (const m of matchups) {
        const ppt = m.players_points?.[id];
        if (typeof ppt === 'number') {
          currentPts = ppt;
          break;
        }
      }
      if (currentPts !== undefined) break;
    }
    const ktcVal = ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0;
    return {
      player_id: id,
      name: p.full_name,
      position: p.position,
      team: p.team ?? '—',
      photoUrl: photoUrl(id),
      current_points: currentPts,
      ktc_value: ktcVal,
    };
  };

  const seenHub = new Set<string>();
  const fallbackTopRotation: RotationPlayer[] = [];
  const pushHub = (id: string) => {
    if (seenHub.has(id)) return;
    const row = toRotationEntry(id);
    if (!row) return;
    seenHub.add(id);
    fallbackTopRotation.push(row);
  };
  for (let i = 0; i < 10; i++) {
    if (topByKtcIds[i]) pushHub(topByKtcIds[i]!);
    if (mostRosteredIds[i]) pushHub(mostRosteredIds[i]!);
    if (fallbackTopRotation.length >= 10) break;
  }

  const topRotation = boomRotation.length > 0 ? boomRotation : fallbackTopRotation;
  const threatRotation = bustRotation;

  // ── 17. Portfolio Value history (rolling KTC trend) ─────────────────────
  // Build one PortfolioPoint per Redis-tracked snapshot index. We fetch up
  // to the last 8 KTC snapshots per player and sum across each league
  // separately so the chart can filter by league.
  const portfolioHistory: PortfolioPoint[] = await (async () => {
    const ownedIds = Array.from(rosterIds);
    if (!ownedIds.length) return [];

    // Pull histories for top 200 most-valuable players to keep Redis chatter sane
    const focusIds = globalRanked.slice(0, 200).map((r) => r.id);
    const histories = await Promise.all(
      focusIds.map(async (id) => ({ id, vals: await getPlayerValueHistory(id) })),
    );
    const histMap: Record<string, number[]> = {};
    for (const h of histories) histMap[h.id] = h.vals;

    const HORIZON = 8;
    let maxLen = 0;
    for (const h of histories) maxLen = Math.max(maxLen, h.vals.length);
    if (maxLen < 2) return [];
    maxLen = Math.min(HORIZON, maxLen);

    // For each historical index, compute total + per-league sum
    const points: PortfolioPoint[] = [];
    for (let idx = 0; idx < maxLen; idx++) {
      let total = 0;
      const byLeague: Record<string, number> = {};
      const byLeaguePositionKtc: Record<string, LeaguePositionKtcTotals> = {};
      for (const lg of leagues) {
        const my = userRosterByLeague[lg.id];
        if (!my) continue;
        let lgSum = 0;
        const posTot: LeaguePositionKtcTotals = { QB: 0, RB: 0, WR: 0, TE: 0 };
        for (const pid of my.players) {
          const series = histMap[pid];
          let val: number;
          if (!series || series.length === 0) {
            // Fall back to current KTC if we have no series for this player
            const p = players[pid];
            val = p ? ktcMap[(p.full_name ?? '').toLowerCase()] ?? 0 : 0;
            lgSum += val;
          } else {
            // Right-align: index "idx" counts from the end (oldest..newest)
            const offset = idx + (maxLen - series.length);
            val = offset >= 0 && offset < series.length ? series[offset]! : (series[0] ?? 0);
            lgSum += val;
          }
          const pRow = players[pid];
          const posRaw = (pRow?.position ?? '').toUpperCase();
          if (posRaw === 'QB') posTot.QB += val;
          else if (posRaw === 'RB') posTot.RB += val;
          else if (posRaw === 'WR') posTot.WR += val;
          else if (posRaw === 'TE') posTot.TE += val;
        }
        byLeague[lg.id] = lgSum;
        byLeaguePositionKtc[lg.id] = {
          QB: Math.round(posTot.QB),
          RB: Math.round(posTot.RB),
          WR: Math.round(posTot.WR),
          TE: Math.round(posTot.TE),
        };
        total += lgSum;
      }
      points.push({
        index: idx,
        label: `T-${maxLen - 1 - idx}`,
        total: Math.round(total),
        byLeague,
        byLeaguePositionKtc,
      });
    }
    return points;
  })();

  const winProbability = totalMatchups
    ? Math.round((winningCount / totalMatchups) * 100)
    : empireScore > empireOpp
      ? 60
      : 40;

  const tradeNote: DashboardSnapshot['tradeNote'] = (() => {
    if (tradeScenario) {
      return {
        body: `Arbitrage model: projected edge +${tradeScenario.gainPct}% after schedule & injury normalization vs. baseline roster.`,
        verdict: 'BOOM',
        confidence: tradeScenario.gainPct,
      };
    }
    if (latestOffersTop.length > 0) {
      const top = latestOffersTop[0]!;
      const verdict: 'BOOM' | 'BUST' | 'FAIR' =
        top.score > 4 ? 'BOOM' : top.score < -2 ? 'BUST' : 'FAIR';
      return {
        body: `Latest pending move involves ${top.player} (${top.position} · ${top.team}) in ${top.league}. Composite model is leaning ${verdict}.`,
        verdict,
        confidence: Math.min(95, 55 + Math.abs(Math.round(top.score * 4))),
      };
    }
    return {
      body: 'No pending trade offers across your empire right now. Composite model standing by — the Trade Lab is monitoring market dislocations in real time.',
      verdict: 'FAIR',
      confidence: 50,
    };
  })();

  const exposureTop: ExposureTopRow[] = Array.from(rosterDupCount.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .flatMap(([id, leagueCount]) => {
      const p = players[id];
      if (!p || !SKILL_POSITIONS.has(p.position?.toUpperCase() ?? '')) return [];
      return [{ player_id: id, name: p.full_name, position: p.position, leagueCount }];
    });

  const snapshot: DashboardSnapshot = {
    loading: false,
    userTier,
    season: liveSeason,
    week: liveWeek,
    empire: {
      score: Math.round(empireScore * 10) / 10,
      oppScore: Math.round(empireOpp * 10) / 10,
      winning: winningCount,
      total: totalMatchups,
      winProbability,
      leaguesCount: leagues.length,
      activeTrades: latestOffers.length,
      portfolioValue,
    },
    mvp: buildSnapshotPlayer(mvp),
    threat: buildSnapshotPlayer(threat),
    topRotation,
    threatRotation,
    weeklyHistory,
    weeklyAnnotations,
    portfolioHistory,
    portfolioBenchmark,
    leaguePortfolioBenchmark,
    portfolioMvpByLeague,
    leagueHealthRotation,
    overvalued,
    tradeScenario,
    starTist,
    rosterHealth: {
      score: healthScorePct,
      headline,
      injured,
      suspended,
      questionable,
      healthy,
    },
    waivers,
    latestOffers: latestOffersTop,
    marketTrends,
    playerGaps,
    leagues: summaryLeagues,
    ownedPlayerIds: Array.from(rosterIds),
    exposureTop,
    tradeNote,
    hubSpotlightByLeague,
    tfoVerdictByPlayerId,
    recommendedTargets,
    crossLeagueGaps,
  };

  if (redis) {
    try {
      await redis.set(cacheKey, snapshot, { ex: 300 }); // 5 min cache
    } catch {}
  }

  return NextResponse.json(snapshot);
}

// pseudo-stable score derivation for mock pending-trade weighting
function t_random_score(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return ((h % 200) - 100) / 10;
}
