/**
 * TRE (Trade Recommendation Engine) — evaluates dynasty trade offers.
 *
 * Trade Score = (Value Delta × 0.35) + (Window Alignment × 0.25)
 *             + (Roster Need Fill × 0.25) + (Scheme/Age Risk × 0.15)
 *
 * Verdict: WIN (score > 55) | EVEN (45–55) | LOSS (score < 45)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import { ageCurveMultiplier, type TFOPosition } from '@/lib/tfo/formula';

// ─── Public types ─────────────────────────────────────────────────────────────

export type TREVerdict = 'WIN' | 'EVEN' | 'LOSS';

export interface TREAsset {
  player_id: string;
  name: string;
  position: string;
  age?: number;
  ktc_value?: number;
}

/** A proposed trade from the user's perspective. */
export interface TREOffer {
  /** Assets YOUR team sends away. */
  assets_out: TREAsset[];
  /** Assets YOUR team receives. */
  assets_in: TREAsset[];
}

export interface TREResult {
  trade_score: number;
  verdict: TREVerdict;
  /** 0-100: how strong is what you receive */
  score_you: number;
  /** 0-100: how strong is what they receive */
  score_them: number;
  /** Component scores (each 0-100) */
  value_delta: number;
  window_alignment: number;
  roster_need_fill: number;
  scheme_age_risk: number;
  /** ≤2 sentence plain-English verdict. Confident tone. */
  reasoning: string;
  /** Specific risk strings: "AGING_RB", "FALLING_TFO", etc. */
  red_flags: string[];
  /** Non-null for LOSS or EVEN — brief counter text. */
  counter_suggestion: string | null;
}

export interface ProactiveTrade {
  target_player_id: string;
  target_player_name: string;
  target_position: string;
  /** e.g. "WR2", "RB1" */
  gap_filled: string;
  target_tfo: number | null;
  target_verdict: string | null;
  target_ktc: number;
  /** Estimated total KTC value to give up */
  estimated_cost_ktc: number;
  trade_score: number;
  verdict: TREVerdict;
  reasoning: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function toTFOPos(pos: string): TFOPosition {
  const p = pos.toUpperCase() as TFOPosition;
  return ['QB', 'RB', 'WR', 'TE'].includes(p) ? p : 'WR';
}

// ─── Shared data loader ───────────────────────────────────────────────────────
// One batch fetch for all components to share.

interface TREContext {
  playerDb: PlayerMap;
  ktcByName: Map<string, number>;
  ktcById: Map<string, number>;          // player_id → KTC (from player_values)
  bviById: Map<string, number>;          // player_id → bvi_score (from player_values)
  tfoByPlayer: Map<string, number[]>;   // player_id → [tfo_score, ...] desc order (up to 3)
  sfsByPlayer: Map<string, number>;      // player_id → latest sfs_score
  verdictByPlayer: Map<string, string>;  // player_id → latest verdict
}

async function loadTREContext(
  playerIds: string[],
  leagueId: string,
): Promise<TREContext> {
  const supabase = createAdminClient();
  const allIds = Array.from(new Set(playerIds));

  const [playerDb, ktcList, pvRows, tfoRows] = await Promise.all([
    fetchAllPlayers(),
    getKTCValues(),
    supabase
      .from('player_values')
      .select('player_id, bvi_score, ktc_value')
      .in('player_id', allIds),
    supabase
      .from('tfo_cache')
      .select('player_id, tfo_score, sfs_score, verdict, calculated_at')
      .in('player_id', allIds)
      .eq('league_id', leagueId)
      .order('calculated_at', { ascending: false }),
  ]);

  const db = (playerDb ?? {}) as PlayerMap;

  // KTC by name map
  const ktcByName = new Map<string, number>();
  for (const v of ktcList ?? []) {
    if (v.player_name) ktcByName.set(v.player_name.toLowerCase(), v.ktc_value);
  }

  // KTC by player_id (from player_values if populated, otherwise look up by name)
  const ktcById = new Map<string, number>();
  const bviById = new Map<string, number>();
  type PvRow = { player_id: string; bvi_score: number; ktc_value: number };
  for (const row of (pvRows.data ?? []) as PvRow[]) {
    ktcById.set(row.player_id, row.ktc_value);
    bviById.set(row.player_id, row.bvi_score);
  }
  // Fill missing KTC from name lookup
  for (const pid of allIds) {
    if (!ktcById.has(pid)) {
      const name = (db[pid as keyof typeof db] as { full_name?: string } | undefined)?.full_name ?? '';
      const ktc = ktcByName.get(name.toLowerCase()) ?? 0;
      ktcById.set(pid, ktc);
    }
  }

  // TFO rows grouped by player (already sorted desc by calculated_at)
  type TfoRow = {
    player_id: string;
    tfo_score: number | null;
    sfs_score: number | null;
    verdict: string | null;
    calculated_at: string;
  };
  const tfoByPlayer = new Map<string, number[]>();
  const sfsByPlayer = new Map<string, number>();
  const verdictByPlayer = new Map<string, string>();

  for (const row of (tfoRows.data ?? []) as TfoRow[]) {
    const pid = String(row.player_id);
    if (!tfoByPlayer.has(pid)) tfoByPlayer.set(pid, []);
    const scores = tfoByPlayer.get(pid)!;
    if (scores.length < 3 && row.tfo_score != null) scores.push(Number(row.tfo_score));
    if (!sfsByPlayer.has(pid) && row.sfs_score != null) sfsByPlayer.set(pid, Number(row.sfs_score));
    if (!verdictByPlayer.has(pid) && row.verdict) verdictByPlayer.set(pid, row.verdict);
  }

  return { playerDb: db, ktcByName, ktcById, bviById, tfoByPlayer, sfsByPlayer, verdictByPlayer };
}

function resolveKtc(pid: string, ctx: TREContext, fallback?: number): number {
  return ctx.ktcById.get(pid) ?? fallback ?? 0;
}

function resolveBvi(pid: string, ctx: TREContext): number {
  const bvi = ctx.bviById.get(pid);
  if (bvi != null) return bvi;
  // If no BVI yet, approximate from KTC (KTC is stored as 0-10000 range)
  return resolveKtc(pid, ctx);
}

function resolveAge(pid: string, asset: TREAsset, ctx: TREContext): number {
  return (ctx.playerDb[pid as keyof typeof ctx.playerDb] as { age?: number } | undefined)?.age
    ?? asset.age
    ?? 26;
}

function resolvePosition(pid: string, asset: TREAsset, ctx: TREContext): string {
  return (
    (ctx.playerDb[pid as keyof typeof ctx.playerDb] as { position?: string } | undefined)?.position
    ?? asset.position
    ?? 'WR'
  ).toUpperCase();
}

// ─── Component 1: Value Delta (0–100) ────────────────────────────────────────
// BVI-first; falls back to KTC. Positive score = you win value.

function computeValueDelta(
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  ctx: TREContext,
): { score: number; bviIn: number; bviOut: number; ktcIn: number; ktcOut: number } {
  const sumBvi = (assets: TREAsset[]) =>
    assets.reduce((s, a) => s + resolveBvi(a.player_id, ctx), 0);
  const sumKtc = (assets: TREAsset[]) =>
    assets.reduce((s, a) => s + resolveKtc(a.player_id, ctx, a.ktc_value), 0);

  const bviIn = sumBvi(assetsIn);
  const bviOut = sumBvi(assetsOut);
  const ktcIn = sumKtc(assetsIn);
  const ktcOut = sumKtc(assetsOut);

  const bviDiff = bviIn - bviOut;
  // Normalize: ±4000 BVI pts → ±50 score from neutral 50
  const score = clamp(50 + (bviDiff / 4000) * 50);

  return { score, bviIn, bviOut, ktcIn, ktcOut };
}

// ─── Component 2: Window Alignment (0–100) ────────────────────────────────────
// Does the trade fit the user's contention window?
// Derives contention status directly from rosters + Sleeper player ages.

async function computeWindowAlignment(
  leagueId: string,
  ownerId: string,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  ctx: TREContext,
): Promise<{ score: number; status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING' }> {
  const supabase = createAdminClient();

  const { data: rosterRow } = await supabase
    .from('rosters')
    .select('players, owner_id')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  const rosterPlayerIds = ((rosterRow as { players?: string[] | null } | null)?.players ?? []) as string[];
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  // Average age of skill-position players on roster
  const skillAges: number[] = [];
  for (const pid of rosterPlayerIds) {
    const p = ctx.playerDb[pid as keyof typeof ctx.playerDb] as { position?: string; age?: number } | undefined;
    if (!p || !SKILL.has((p.position ?? '').toUpperCase())) continue;
    if (p.age) skillAges.push(p.age);
  }
  const avgRosterAge = skillAges.length
    ? skillAges.reduce((s, a) => s + a, 0) / skillAges.length
    : 26;

  // Derive contention status
  let status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING';
  if (avgRosterAge >= 25 && avgRosterAge <= 28) {
    status = 'CONTENDING';
  } else if (avgRosterAge < 24) {
    status = 'REBUILDING';
  } else {
    status = 'TRANSITIONING';
  }

  // Avg age of incoming vs outgoing assets
  const avgAge = (assets: TREAsset[]) => {
    const ages = assets.map((a) => resolveAge(a.player_id, a, ctx));
    return ages.length ? ages.reduce((s, v) => s + v, 0) / ages.length : 26;
  };
  const ageIn = avgAge(assetsIn);
  const ageOut = avgAge(assetsOut);
  const gettingYounger = ageIn < ageOut; // receiving younger assets

  // Apply spec bonuses and penalties
  let base = 60;
  if (status === 'CONTENDING' && gettingYounger) {
    base -= 15; // penalty: trading away proven assets for youth while contending
  } else if (status === 'REBUILDING' && !gettingYounger && ageIn > 29) {
    base -= 20; // penalty: acquiring aging star while in rebuild
  } else if (status === 'CONTENDING' && !gettingYounger) {
    base += 10; // bonus: getting proven assets, fits contention window
  } else if (status === 'REBUILDING' && gettingYounger) {
    base += 10; // bonus: acquiring youth in rebuild
  }

  return { score: clamp(base), status };
}

// ─── Component 3: Roster Need Fill (0–100) ───────────────────────────────────
// Identifies user's weakest TFO positions in this league and checks if
// incoming assets fill those slots.

async function computeRosterNeedFill(
  leagueId: string,
  ownerId: string,
  assetsIn: TREAsset[],
  ctx: TREContext,
): Promise<{ score: number; filledGap: string | null }> {
  const supabase = createAdminClient();

  const { data: rosterRow } = await supabase
    .from('rosters')
    .select('players, owner_id')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  const rosterIds = ((rosterRow as { players?: string[] | null } | null)?.players ?? []) as string[];
  if (!rosterIds.length) return { score: 50, filledGap: null };

  // Load tfo_cache for all roster players in this league
  const { data: tfoRows } = await supabase
    .from('tfo_cache')
    .select('player_id, tfo_score, verdict')
    .eq('league_id', leagueId)
    .in('player_id', rosterIds);

  type TfoR = { player_id: string; tfo_score: number | null; verdict: string | null };
  const tfoByPid = new Map<string, TfoR>();
  for (const r of (tfoRows ?? []) as TfoR[]) {
    if (!tfoByPid.has(r.player_id)) tfoByPid.set(r.player_id, r);
  }

  // Compute average TFO per position on this roster
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);
  const posTfoSums: Record<string, number[]> = {};
  for (const pid of rosterIds) {
    const p = ctx.playerDb[pid as keyof typeof ctx.playerDb] as { position?: string } | undefined;
    const pos = (p?.position ?? '').toUpperCase();
    if (!SKILL.has(pos)) continue;
    const tfo = tfoByPid.get(pid);
    if (!posTfoSums[pos]) posTfoSums[pos] = [];
    posTfoSums[pos]!.push(tfo?.tfo_score != null ? Number(tfo.tfo_score) : 55);
  }

  const posAvgTfo: Record<string, number> = {};
  for (const [pos, scores] of Object.entries(posTfoSums)) {
    posAvgTfo[pos] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Weakest position = lowest avg TFO
  const weakestPos = Object.entries(posAvgTfo).sort(([, a], [, b]) => a - b)[0]?.[0] ?? null;
  const adjacentMap: Record<string, string[]> = {
    WR: ['TE', 'RB'],
    RB: ['WR'],
    TE: ['WR'],
    QB: [],
  };

  const inPositions = assetsIn.map((a) => a.position.toUpperCase());
  let filledGap: string | null = null;
  let score = 35; // base: no need matched

  if (weakestPos) {
    if (inPositions.some((p) => p === weakestPos)) {
      filledGap = weakestPos;
      score = 85; // direct fill: +20 → ~85
    } else if (inPositions.some((p) => adjacentMap[weakestPos]?.includes(p))) {
      filledGap = weakestPos;
      score = 65; // adjacent: +10 → ~65
    }
  }

  return { score, filledGap };
}

// ─── Component 4: Scheme/Age Risk (0–100 — higher = less risk) ───────────────
// Penalizes incoming players on downward TFO trajectory, age cliffs, OC instability.

function computeSchemeAgeRisk(
  assetsIn: TREAsset[],
  ctx: TREContext,
): { score: number; flags: string[] } {
  let riskPenalty = 0;
  const flags: string[] = [];

  for (const asset of assetsIn) {
    const pid = asset.player_id;
    const age = resolveAge(pid, asset, ctx);
    const pos = toTFOPos(resolvePosition(pid, asset, ctx));

    // TFO trajectory: last 3 scores
    const tfoScores = ctx.tfoByPlayer.get(pid) ?? [];
    if (tfoScores.length >= 2) {
      const delta = tfoScores[0]! - tfoScores[tfoScores.length - 1]!;
      if (delta < -5) {
        riskPenalty += 12;
        flags.push(`FALLING_TFO:${asset.name}`);
      } else if (delta > 5) {
        riskPenalty -= 5; // rising trajectory = risk reduction
      }
    }

    // OC / scheme stability from sfs_score
    const sfs = ctx.sfsByPlayer.get(pid);
    if (sfs != null && sfs < 45) {
      riskPenalty += 8;
      flags.push(`OC_INSTABILITY:${asset.name}`);
    }

    // Age curve — flag position-specific cliffs
    const ageMult = ageCurveMultiplier(pos, age);
    if (ageMult < 0.65) {
      riskPenalty += 15;
      flags.push(`AGE_CLIFF:${asset.name}(${pos},${age})`);
    } else if (ageMult < 0.80) {
      riskPenalty += 6;
      flags.push(`AGE_WATCH:${asset.name}(${pos},${age})`);
    }
  }

  return { score: clamp(80 - riskPenalty), flags: Array.from(new Set(flags)) };
}

// ─── Red flags ────────────────────────────────────────────────────────────────

function detectRedFlags(
  bviIn: number,
  bviOut: number,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  schemeFlags: string[],
  ctx: TREContext,
): string[] {
  const flags: string[] = [...schemeFlags];

  const valueLoss = bviOut - bviIn;
  if (valueLoss > 2500) flags.push(`LARGE_VALUE_LOSS:~${Math.round(valueLoss / 100) * 100}`);

  const agingRBsIn = assetsIn.filter(
    (a) => a.position.toUpperCase() === 'RB' && resolveAge(a.player_id, a, ctx) >= 28,
  );
  if (agingRBsIn.length) flags.push(`AGING_RB:${agingRBsIn.map((a) => a.name).join(',')}`);

  const picksOut = assetsOut.filter((a) => a.name.toLowerCase().includes('pick'));
  if (picksOut.length >= 2) flags.push(`MULTI_PICKS_SENT:${picksOut.length}`);

  // Bust/Lean Bust verdict on incoming
  for (const a of assetsIn) {
    const verdict = ctx.verdictByPlayer.get(a.player_id) ?? '';
    if (verdict.toUpperCase().includes('BUST')) {
      flags.push(`BUST_SIGNAL:${a.name}`);
    }
  }

  return Array.from(new Set(flags));
}

// ─── Reasoning builder ────────────────────────────────────────────────────────
// Matches "Verdict North Star" tone: brief, specific, confident. Max 2 sentences.

function buildReasoning(
  verdict: TREVerdict,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  ktcDiff: number,
  filledGap: string | null,
  status: 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING',
  redFlags: string[],
): string {
  const inNames = assetsIn.map((a) => a.name).join(' + ') || 'incoming assets';
  const outNames = assetsOut.map((a) => a.name).join(' + ') || 'your assets';
  const kdiff = Math.round(Math.abs(ktcDiff));
  const gapStr = filledGap ? ` plugging your ${filledGap} gap` : '';

  if (verdict === 'WIN') {
    const edge = kdiff > 1500 ? 'significant' : 'solid';
    return (
      `You land ${inNames}${gapStr} while sending ${outNames} — a ${edge} value edge of ~${kdiff.toLocaleString()} KTC in your favor.` +
      (status === 'CONTENDING'
        ? ' This fits your contention window. TAKE IT.'
        : status === 'REBUILDING'
          ? ' Acquiring youth with value upside here is exactly what a rebuild needs. TAKE IT.'
          : ' This trade tilts in your favor — TAKE IT.')
    );
  }

  if (verdict === 'LOSS') {
    const hasBustFlag = redFlags.some((f) => f.startsWith('BUST_SIGNAL'));
    const hasAgeFlag = redFlags.some((f) => f.startsWith('AGE_CLIFF'));
    let risk = '';
    if (hasBustFlag) risk = ` ${inNames.split(' + ')[0]} has a BUST signal trending the wrong direction.`;
    else if (hasAgeFlag) risk = ` Age cliff is a real concern on what you're receiving.`;
    return (
      `You're giving up ${outNames} for ${inNames} — a gap of ~${kdiff.toLocaleString()} KTC against you.${risk}` +
      ' Push back or counter before accepting.'
    );
  }

  // EVEN
  const fitNote = filledGap
    ? ` If ${filledGap} depth is your priority, the fit justifies it.`
    : ` Whether it works for you depends entirely on roster fit.`;
  return (
    `Roughly even deal — ${inNames} for ${outNames}, value within ~${kdiff.toLocaleString()} KTC either way.${fitNote}`
  );
}

// ─── Counter suggestion ────────────────────────────────────────────────────────

function buildCounterSuggestion(
  verdict: TREVerdict,
  bviOut: number,
  bviIn: number,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  ctx: TREContext,
): string | null {
  if (verdict === 'WIN') return null;

  const gap = Math.round(bviOut - bviIn);
  if (gap <= 0) return null;

  const approxPick = Math.round(gap / 100) * 100;

  if (verdict === 'EVEN') {
    return `Fair deal — to make it a clear win, ask for a mid-round pick (~${approxPick.toLocaleString()} KTC) added to the offer.`;
  }

  // LOSS — suggest removing your best outgoing asset or getting more back
  const bestOut = [...assetsOut].sort(
    (a, b) => resolveKtc(b.player_id, ctx, b.ktc_value) - resolveKtc(a.player_id, ctx, a.ktc_value),
  )[0];
  const bestIn = [...assetsIn].sort(
    (a, b) => resolveKtc(b.player_id, ctx, b.ktc_value) - resolveKtc(a.player_id, ctx, a.ktc_value),
  )[0];

  if (bestOut && gap > 3000) {
    return `Counter: Remove ${bestOut.name} from your side entirely, or ask for a 1st-round pick added to ${bestIn?.name ?? 'the offer'}.`;
  }
  return `Counter: Ask for a pick or role player added to ${bestIn?.name ?? 'the offer'} to close the ~${approxPick.toLocaleString()} KTC gap.`;
}

// ─── Side quality scorer ──────────────────────────────────────────────────────
// Rates each side of the deal 0-100 based on BVI quality of assets.

function scoreSide(assets: TREAsset[], ctx: TREContext): number {
  if (!assets.length) return 0;
  // BVI is 0-10000; normalize to 0-100 by dividing by 100, then avg
  const avg = assets.reduce((s, a) => s + resolveBvi(a.player_id, ctx), 0) / assets.length;
  return clamp(avg / 100);
}

// ─── analyzeTrade (main export) ───────────────────────────────────────────────

export async function analyzeTrade(
  offer: TREOffer,
  leagueId: string,
  ownerId: string,
): Promise<TREResult> {
  const { assets_in, assets_out } = offer;
  const allPlayerIds = [...assets_in, ...assets_out].map((a) => a.player_id);

  const ctx = await loadTREContext(allPlayerIds, leagueId);

  // All 4 components
  const { score: valueDelta, bviIn, bviOut, ktcIn, ktcOut } = computeValueDelta(
    assets_in,
    assets_out,
    ctx,
  );

  const [windowResult, needFillResult] = await Promise.all([
    computeWindowAlignment(leagueId, ownerId, assets_in, assets_out, ctx),
    computeRosterNeedFill(leagueId, ownerId, assets_in, ctx),
  ]);

  const { score: windowAlignment, status } = windowResult;
  const { score: rosterNeedFill, filledGap } = needFillResult;
  const { score: schemeAgeRisk, flags: schemeFlags } = computeSchemeAgeRisk(assets_in, ctx);

  // Weighted composite
  const rawScore =
    valueDelta * 0.35 +
    windowAlignment * 0.25 +
    rosterNeedFill * 0.25 +
    schemeAgeRisk * 0.15;

  const trade_score = Math.round(clamp(rawScore) * 10) / 10;
  const verdict: TREVerdict = trade_score > 55 ? 'WIN' : trade_score < 45 ? 'LOSS' : 'EVEN';

  const redFlags = detectRedFlags(bviIn, bviOut, assets_in, assets_out, schemeFlags, ctx);
  const ktcDiff = ktcIn - ktcOut;
  const reasoning = buildReasoning(verdict, assets_in, assets_out, ktcDiff, filledGap, status, redFlags);
  const counter_suggestion = buildCounterSuggestion(verdict, bviOut, bviIn, assets_in, assets_out, ctx);

  const score_you = Math.round(scoreSide(assets_in, ctx) * 10) / 10;
  const score_them = Math.round(scoreSide(assets_out, ctx) * 10) / 10;

  return {
    trade_score,
    verdict,
    score_you,
    score_them,
    value_delta: Math.round(valueDelta * 10) / 10,
    window_alignment: Math.round(windowAlignment * 10) / 10,
    roster_need_fill: Math.round(rosterNeedFill * 10) / 10,
    scheme_age_risk: Math.round(schemeAgeRisk * 10) / 10,
    reasoning,
    red_flags: redFlags,
    counter_suggestion,
  };
}

// ─── getProactiveTrades ───────────────────────────────────────────────────────
// Scans all other managers' rosters to surface trade opportunities
// that fill the user's weakest positional gaps.

export async function getProactiveTrades(
  leagueId: string,
  ownerId: string,
): Promise<ProactiveTrade[]> {
  const supabase = createAdminClient();

  // Load all rosters for this league
  const { data: allRosters } = await supabase
    .from('rosters')
    .select('roster_id, owner_id, players')
    .eq('league_id', leagueId);

  if (!allRosters || allRosters.length === 0) return [];

  type RosterRow = { roster_id: number; owner_id: string | null; players: string[] | null };
  const rosters = allRosters as RosterRow[];

  const myRoster = rosters.find((r) => String(r.owner_id ?? '') === ownerId);
  const myPlayerIds = (myRoster?.players ?? []) as string[];
  const otherRosters = rosters.filter((r) => String(r.owner_id ?? '') !== ownerId);

  // All player IDs in the league
  const allPlayerIds = Array.from(
    new Set([
      ...myPlayerIds,
      ...otherRosters.flatMap((r) => (r.players ?? []) as string[]),
    ]),
  );

  const ctx = await loadTREContext(allPlayerIds, leagueId);
  const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

  // Find user's weakest positions from tfo_cache
  const { data: myTfoRows } = await supabase
    .from('tfo_cache')
    .select('player_id, tfo_score, verdict')
    .eq('league_id', leagueId)
    .in('player_id', myPlayerIds);

  type TfoR = { player_id: string; tfo_score: number | null; verdict: string | null };
  const myTfoByPid = new Map<string, TfoR>();
  for (const r of (myTfoRows ?? []) as TfoR[]) {
    if (!myTfoByPid.has(r.player_id)) myTfoByPid.set(r.player_id, r);
  }

  // Average TFO by position for user's roster
  const posTfoSums: Record<string, number[]> = {};
  for (const pid of myPlayerIds) {
    const p = ctx.playerDb[pid as keyof typeof ctx.playerDb] as { position?: string } | undefined;
    const pos = (p?.position ?? '').toUpperCase();
    if (!SKILL.has(pos)) continue;
    const tfo = myTfoByPid.get(pid);
    if (!posTfoSums[pos]) posTfoSums[pos] = [];
    posTfoSums[pos]!.push(tfo?.tfo_score != null ? Number(tfo.tfo_score) : 55);
  }

  const posAvgTfo: Record<string, number> = {};
  for (const [pos, scores] of Object.entries(posTfoSums)) {
    posAvgTfo[pos] = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  // Sorted weak positions (lowest avg TFO first), with gap slot label
  const sortedGaps = Object.entries(posAvgTfo)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3);

  const proactives: ProactiveTrade[] = [];

  for (const [gapPos, myAvgTfo] of sortedGaps) {
    const gapLabel = `${gapPos}${myAvgTfo < 50 ? '1' : '2'}`;

    // Scan other rosters for good players at this position
    for (const roster of otherRosters) {
      const theirPlayerIds = (roster.players ?? []) as string[];

      for (const pid of theirPlayerIds) {
        const p = ctx.playerDb[pid as keyof typeof ctx.playerDb] as
          | { position?: string; full_name?: string }
          | undefined;
        if (!p || (p.position ?? '').toUpperCase() !== gapPos) continue;

        const tfoScores = ctx.tfoByPlayer.get(pid) ?? [];
        const latestTfo = tfoScores[0] ?? null;
        const verdict = ctx.verdictByPlayer.get(pid) ?? null;

        // Only suggest players who are worth acquiring
        if (verdict && (verdict.toUpperCase() === 'BUST')) continue;

        const targetKtc = resolveKtc(pid, ctx);
        if (targetKtc < 2000) continue; // skip low-value players

        // Estimate cost: ~equal KTC + small premium (10%)
        const estimatedCostKtc = Math.round(targetKtc * 1.10);

        // Quick TRE score estimate (no full DB roundtrip)
        const valueDeltaEst = clamp(50 + ((targetKtc - estimatedCostKtc) / 3000) * 50);
        const windowEst = 60; // neutral default
        const needFillEst = gapPos === gapPos ? 85 : 50; // direct fill
        const ageRiskEst = latestTfo != null && latestTfo > 65 ? 75 : 60;
        const tradeScoreEst = Math.round(
          clamp(
            valueDeltaEst * 0.35 +
              windowEst * 0.25 +
              needFillEst * 0.25 +
              ageRiskEst * 0.15,
          ) * 10,
        ) / 10;

        const verdictEst: TREVerdict =
          tradeScoreEst > 55 ? 'WIN' : tradeScoreEst < 45 ? 'LOSS' : 'EVEN';

        const playerName = p.full_name ?? pid;
        const tfoStr = latestTfo != null ? ` (TFO ${Math.round(latestTfo)})` : '';
        const gapFill = `your ${gapLabel} gap`;
        const reasoning =
          verdictEst === 'WIN'
            ? `${playerName}${tfoStr} is a strong fit — fills ${gapFill} and the cost is reasonable. Make this offer.`
            : verdictEst === 'EVEN'
              ? `${playerName}${tfoStr} addresses ${gapFill}. Worth exploring at roughly even value.`
              : `${playerName}${tfoStr} fills ${gapFill} but the cost may be steep. Negotiate carefully.`;

        const priority: ProactiveTrade['priority'] =
          tradeScoreEst > 65 ? 'HIGH' : tradeScoreEst > 50 ? 'MEDIUM' : 'LOW';

        proactives.push({
          target_player_id: pid,
          target_player_name: playerName,
          target_position: gapPos,
          gap_filled: gapLabel,
          target_tfo: latestTfo,
          target_verdict: verdict,
          target_ktc: targetKtc,
          estimated_cost_ktc: estimatedCostKtc,
          trade_score: tradeScoreEst,
          verdict: verdictEst,
          reasoning,
          priority,
        });
      }
    }
  }

  // Sort by score desc, deduplicate by player_id, cap at 10
  const seen = new Set<string>();
  return proactives
    .sort((a, b) => b.trade_score - a.trade_score)
    .filter((t) => {
      if (seen.has(t.target_player_id)) return false;
      seen.add(t.target_player_id);
      return true;
    })
    .slice(0, 10);
}

// ─── Legacy alias (backward compat) ──────────────────────────────────────────

/** @deprecated Use analyzeTrade(offer, leagueId, ownerId) */
export async function analyzeTradeInput(input: {
  league_id: string;
  owner_id: string;
  assets_in: TREAsset[];
  assets_out: TREAsset[];
}): Promise<TREResult> {
  return analyzeTrade(
    { assets_in: input.assets_in, assets_out: input.assets_out },
    input.league_id,
    input.owner_id,
  );
}
