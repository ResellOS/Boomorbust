/**
 * TRE (Trade Return Engine) — evaluates a proposed dynasty trade.
 *
 * Trade Score = (Value Delta × 0.35) + (Window Alignment × 0.25)
 *             + (Roster Need Fill × 0.25) + (Scheme/Age Risk × 0.15)
 *
 * Verdict: WIN (score > 55) | EVEN (45–55) | LOSS (score < 45)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getKTCValueForPlayer } from '@/lib/values/ktc';

// ─── Types ────────────────────────────────────────────────────────────────────

export type TREVerdict = 'WIN' | 'EVEN' | 'LOSS';

export interface TREAsset {
  player_id: string;
  name: string;
  position: string;
  age?: number;
  ktc_value?: number;
}

export interface TREInput {
  league_id: string;
  owner_id: string;
  /** Assets your team sends away. */
  assets_out: TREAsset[];
  /** Assets your team receives. */
  assets_in: TREAsset[];
}

export interface TRERedFlag {
  code: string;
  message: string;
}

export interface TREResult {
  trade_score: number;
  verdict: TREVerdict;
  value_delta: number;
  window_alignment: number;
  roster_need_fill: number;
  scheme_age_risk: number;
  reasoning: string;
  red_flags: TRERedFlag[];
  counter_suggestion: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function assetLabel(assets: TREAsset[]): string {
  return assets.map(a => a.name).join(' + ');
}

// ─── Component 1: Value Delta (0–100) ────────────────────────────────────────

async function computeValueDelta(
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
): Promise<{ score: number; ktcIn: number; ktcOut: number }> {
  const resolve = async (assets: TREAsset[]): Promise<number> => {
    let total = 0;
    for (const a of assets) {
      const stored = a.ktc_value ?? 0;
      const live = a.name ? ((await getKTCValueForPlayer(a.name)) ?? stored) : stored;
      total += live;
    }
    return total;
  };

  const [ktcIn, ktcOut] = await Promise.all([resolve(assetsIn), resolve(assetsOut)]);
  const diff = ktcIn - ktcOut;
  // Normalize: ±3000 KTC pts → ±50 score points from neutral 50
  const score = clamp(50 + (diff / 3000) * 50);
  return { score, ktcIn, ktcOut };
}

// ─── Component 2: Window Alignment (0–100) ───────────────────────────────────
// Does the trade match the team's contention window?

async function computeWindowAlignment(
  leagueId: string,
  ownerId: string,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
): Promise<number> {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from('league_settings')
    .select('contention_window_start, contention_window_end, scoring_type')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  const currentYear = new Date().getFullYear();
  const windowStart = (settings as { contention_window_start?: number } | null)?.contention_window_start ?? currentYear;
  const windowEnd = (settings as { contention_window_end?: number } | null)?.contention_window_end ?? currentYear + 2;
  const inWindow = currentYear >= windowStart && currentYear <= windowEnd;

  // Avg age of received vs sent — getting younger signals rebuild, older signals win-now
  const avgAge = (assets: TREAsset[]) => {
    const ages = assets.map(a => a.age ?? 26).filter(Boolean);
    return ages.length ? ages.reduce((s, v) => s + v, 0) / ages.length : 26;
  };
  const ageInDiff = avgAge(assetsIn) - avgAge(assetsOut);

  if (inWindow) {
    // Contention window: reward acquiring older, proven assets
    return clamp(60 + ageInDiff * 3);
  } else {
    // Rebuild: reward acquiring youth
    return clamp(60 - ageInDiff * 3);
  }
}

// ─── Component 3: Roster Need Fill (0–100) ───────────────────────────────────

async function computeRosterNeedFill(
  leagueId: string,
  ownerId: string,
  assetsIn: TREAsset[],
): Promise<{ score: number; filledNeed: string | null }> {
  const supabase = createAdminClient();

  const { data: settings } = await supabase
    .from('league_settings')
    .select('roster_needs')
    .eq('league_id', leagueId)
    .eq('owner_id', ownerId)
    .maybeSingle();

  const needs: string[] = (settings as { roster_needs?: string[] } | null)?.roster_needs ?? [];
  if (!needs.length) return { score: 50, filledNeed: null };

  const inPositions = assetsIn.map(a => a.position.toUpperCase());
  let filledNeed: string | null = null;
  let score = 35;

  for (const need of needs) {
    const needPos = need.toUpperCase();
    if (inPositions.some(p => p === needPos || p.startsWith(needPos))) {
      filledNeed = need;
      score = 80;
      break;
    }
  }

  return { score, filledNeed };
}

// ─── Component 4: Scheme/Age Risk (0–100 — higher = less risk) ───────────────

async function computeSchemeAgeRisk(assetsIn: TREAsset[]): Promise<number> {
  const supabase = createAdminClient();

  let riskPenalty = 0;
  for (const asset of assetsIn) {
    const { data: bbv } = await supabase
      .from('bbv_values')
      .select('age, position')
      .eq('player_id', asset.player_id)
      .maybeSingle();

    const age = (bbv as { age?: number } | null)?.age ?? asset.age ?? 26;
    const pos = (bbv as { position?: string } | null)?.position ?? asset.position;

    // Age risk curves per position
    if (pos === 'RB' && age >= 28) riskPenalty += 15;
    else if (pos === 'RB' && age >= 27) riskPenalty += 8;
    else if ((pos === 'WR' || pos === 'TE') && age >= 31) riskPenalty += 12;
    else if (pos === 'QB' && age >= 35) riskPenalty += 10;

    // MRS risk signal
    const { data: med } = await supabase
      .from('medical_history')
      .select('recurrence_count, severity')
      .eq('player_id', asset.player_id);

    const highRisk = (med as Array<{ recurrence_count: number; severity: string | null }> | null)
      ?.some(m => m.recurrence_count >= 2 || m.severity === 'season_ending');
    if (highRisk) riskPenalty += 10;
  }

  return clamp(80 - riskPenalty);
}

// ─── Red Flag detector ────────────────────────────────────────────────────────

function detectRedFlags(
  ktcIn: number,
  ktcOut: number,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
): TRERedFlag[] {
  const flags: TRERedFlag[] = [];

  const valueLoss = ktcOut - ktcIn;
  if (valueLoss > 2000) {
    flags.push({
      code: 'LARGE_VALUE_LOSS',
      message: `You're sending ~${valueLoss} more KTC value than you receive.`,
    });
  }

  const rbsIn = assetsIn.filter(a => a.position.toUpperCase() === 'RB' && (a.age ?? 0) >= 28);
  if (rbsIn.length) {
    flags.push({
      code: 'AGING_RB',
      message: `Receiving aged RB: ${rbsIn.map(a => a.name).join(', ')} (28+ years old).`,
    });
  }

  const picksOut = assetsOut.filter(a => a.name.toLowerCase().includes('pick'));
  if (picksOut.length >= 2) {
    flags.push({
      code: 'MULTIPLE_PICKS_OUT',
      message: `Sending ${picksOut.length} draft picks away weakens long-term capital.`,
    });
  }

  return flags;
}

// ─── Counter suggestion ───────────────────────────────────────────────────────

function buildCounterSuggestion(
  verdict: TREVerdict,
  ktcIn: number,
  ktcOut: number,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
): string | null {
  if (verdict === 'WIN') return null;

  const gap = ktcOut - ktcIn;
  if (gap <= 0) return null;

  if (verdict === 'EVEN') {
    return `Trade is roughly fair. To tip it in your favor, ask for an additional mid-round pick (worth ~${Math.round(gap / 100) * 100} KTC).`;
  }

  const bestOut = [...assetsOut].sort((a, b) => (b.ktc_value ?? 0) - (a.ktc_value ?? 0))[0];
  if (bestOut) {
    return `Counter: Remove ${bestOut.name} from your side, or request a 1st-round pick to compensate the ${gap}-point KTC gap.`;
  }
  return `Request additional compensation — you're short by ~${gap} KTC value.`;
}

// ─── Reasoning builder ────────────────────────────────────────────────────────

function buildReasoning(
  verdict: TREVerdict,
  assetsIn: TREAsset[],
  assetsOut: TREAsset[],
  ktcIn: number,
  ktcOut: number,
  filledNeed: string | null,
  redFlags: TRERedFlag[],
): string {
  const inLabel = assetLabel(assetsIn);
  const outLabel = assetLabel(assetsOut);
  const diff = ktcIn - ktcOut;
  const direction = diff >= 0 ? `+${diff}` : `${diff}`;

  let base: string;
  if (verdict === 'WIN') {
    base = `You receive ${inLabel} and send ${outLabel}. Value edge is ${direction} KTC — this trade favors your team.`;
  } else if (verdict === 'EVEN') {
    base = `You receive ${inLabel} and send ${outLabel}. Value is roughly equal (${direction} KTC). Viability depends on fit.`;
  } else {
    base = `You receive ${inLabel} and send ${outLabel}. Value gap is ${direction} KTC — this trade favors your trade partner.`;
  }

  if (filledNeed) base += ` Acquiring ${inLabel} fills your ${filledNeed} roster need.`;
  if (redFlags.length) base += ` Warning: ${redFlags[0].message}`;

  return base;
}

// ─── Main: analyzeTrade ───────────────────────────────────────────────────────

export async function analyzeTrade(input: TREInput): Promise<TREResult> {
  const { league_id, owner_id, assets_in, assets_out } = input;

  const [valueDeltaResult, windowAlignment, needFillResult, schemeAgeRisk] = await Promise.all([
    computeValueDelta(assets_in, assets_out),
    computeWindowAlignment(league_id, owner_id, assets_in, assets_out),
    computeRosterNeedFill(league_id, owner_id, assets_in),
    computeSchemeAgeRisk(assets_in),
  ]);

  const { score: valueDelta, ktcIn, ktcOut } = valueDeltaResult;
  const { score: rosterNeedFill, filledNeed } = needFillResult;

  const rawScore =
    valueDelta * 0.35 +
    windowAlignment * 0.25 +
    rosterNeedFill * 0.25 +
    schemeAgeRisk * 0.15;

  const trade_score = Math.round(clamp(rawScore) * 10) / 10;

  const verdict: TREVerdict = trade_score > 55 ? 'WIN' : trade_score < 45 ? 'LOSS' : 'EVEN';

  const redFlags = detectRedFlags(ktcIn, ktcOut, assets_in, assets_out);
  const counterSuggestion = buildCounterSuggestion(verdict, ktcIn, ktcOut, assets_in, assets_out);
  const reasoning = buildReasoning(
    verdict,
    assets_in,
    assets_out,
    ktcIn,
    ktcOut,
    filledNeed,
    redFlags,
  );

  return {
    trade_score,
    verdict,
    value_delta: Math.round(valueDelta * 10) / 10,
    window_alignment: Math.round(windowAlignment * 10) / 10,
    roster_need_fill: Math.round(rosterNeedFill * 10) / 10,
    scheme_age_risk: Math.round(schemeAgeRisk * 10) / 10,
    reasoning,
    red_flags: redFlags,
    counter_suggestion: counterSuggestion,
  };
}
