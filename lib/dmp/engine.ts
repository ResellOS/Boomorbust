/**
 * DMP (Dynasty Manager Profile) engine.
 *
 * Silently profiles every manager in every league.
 * Labels are never exposed raw — only the derived Title is surfaced.
 * Powers the Smart Counter Engine trade personalization.
 *
 * Data source: Sleeper transaction history (all completed trades)
 * Storage: dmp_profiles table (registered users only; opponents computed in-memory)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchTransactions, fetchLeagueRosters } from '@/lib/sleeper';
import { fetchAllPlayers, type PlayerMap } from '@/lib/sleeper/players';
import { getKTCValues } from '@/lib/values/ktc';
import type { SleeperTransaction } from '@/lib/sleeper';

// ─── Public types ─────────────────────────────────────────────────────────────

export type DMPTitle =
  | 'THE_ARCHITECT'
  | 'THE_SHARK'
  | 'THE_GAMBLER'
  | 'THE_PROFESSOR'
  | 'THE_HUSTLER'
  | 'THE_LOYALIST'
  | 'THE_PROPHET'
  | 'THE_CONTENDER'
  | 'THE_GHOST'
  | 'THE_WILDCARD';

export const DMP_TITLE_META: Record<
  DMPTitle,
  { display: string; description: string; pitch: string }
> = {
  THE_ARCHITECT: {
    display: 'The Architect',
    description: 'Builds through the draft. Never overpays. Plays the 3-year game.',
    pitch: 'Offer youth and picks — they always buy future upside at a slight discount.',
  },
  THE_SHARK: {
    display: 'The Shark',
    description: 'Consistently wins trades. Ruthless negotiator who never leaves value on the table.',
    pitch: 'Lead with a fair offer — they know the numbers. Padding will get you ghosted.',
  },
  THE_GAMBLER: {
    display: 'The Gambler',
    description: 'High risk, high reward. Loves boom-or-bust profiles and upside chases.',
    pitch: 'Package a high-ceiling player with a low floor. They see upside, not risk.',
  },
  THE_PROFESSOR: {
    display: 'The Professor',
    description: 'Purely data-driven. Never makes emotional moves.',
    pitch: 'Lead with metrics. Name the KTC delta, the TFO trajectory, the draft capital.',
  },
  THE_HUSTLER: {
    display: 'The Hustler',
    description: 'Always dealing. High-volume trader who is always in the market.',
    pitch: "Send anything — they'll engage. Start with a lowball and let them counter.",
  },
  THE_LOYALIST: {
    display: 'The Loyalist',
    description: 'Rarely trades. Builds through patience and roster stability.',
    pitch: 'Needs to visibly win the deal. Lead with something obvious and overpay slightly.',
  },
  THE_PROPHET: {
    display: 'The Prophet',
    description: 'Consistently ahead of the market. Buys before the breakout.',
    pitch: 'Offer an emerging talent before their value spikes — they spot undervalued assets.',
  },
  THE_CONTENDER: {
    display: 'The Contender',
    description: 'Win-now mode. Mortgages future assets freely for proven starters.',
    pitch: "Offer a proven vet for their youth and picks. They're buyers at fair value or above.",
  },
  THE_GHOST: {
    display: 'The Ghost',
    description: 'Inactive. Autopilot manager. Rarely responds, never initiates.',
    pitch: 'Try a friendly offer via the league chat. Keep it simple and obvious.',
  },
  THE_WILDCARD: {
    display: 'The Wildcard',
    description: 'Unpredictable. No clear pattern. Could do anything.',
    pitch: "Mix value and narrative — you can't predict what will land. Offer variety.",
  },
};

// ─── Label schema (stored as jsonb in dmp_profiles.labels) ───────────────────

export interface DMPLabels {
  // ── Core behavioral (12 primary scores from spec) ───────────────────────
  trade_volume: number;          // trades per season, 0-100 normalized
  age_preference: number;        // >50 = youth buyer, <50 = vet buyer
  pick_hoarding: number;         // >50 = acquires picks, <50 = trades away
  win_now_index: number;         // ratio of vets acquired vs youth
  rebuild_index: number;         // inverse of win_now_index
  star_chasing: number;          // frequency of acquiring top-50 KTC players
  value_awareness: number;       // correlation between buy price and KTC value
  patience_score: number;        // avg days between acquiring and re-trading a player
  panic_score: number;           // frequency of selling after 2+ bad weeks
  counter_rate: number;          // % of complex multi-step deals (proxy for countering)
  response_speed: number;        // higher = faster trade cadence
  lowball_rate: number;          // % of trades where they got significantly more than they gave
  overpay_rate: number;          // % of trades where they gave significantly more than they got

  // ── Position tendencies ──────────────────────────────────────────────────
  qb_priority: number;
  rb_priority: number;
  wr_priority: number;
  te_priority: number;
  pick_priority: number;

  // ── Activity patterns ────────────────────────────────────────────────────
  weekly_engagement: number;
  offer_acceptance_rate: number;
  counteroffer_rate: number;
  multi_player_deal_freq: number;
  pick_inclusion_freq: number;

  // ── Market timing ────────────────────────────────────────────────────────
  buy_low_tendency: number;
  sell_high_tendency: number;
  deadline_trading: number;
  early_season_trading: number;
  offseason_activity: number;

  // ── Risk profile ─────────────────────────────────────────────────────────
  injury_risk_tolerance: number;
  age_risk_tolerance: number;
  unproven_upside_appetite: number;
  proven_production_bias: number;
  boom_bust_appetite: number;

  // ── Dynasty strategy ─────────────────────────────────────────────────────
  rebuild_depth: number;
  contention_window_clarity: number;
  pick_capital_hoarding: number;
  youth_movement: number;
  veteran_dependency: number;

  // ── Catch-all index signature (supports jsonb round-trip) ────────────────
  [key: string]: number;
}

export interface DMPProfile {
  user_id: string;       // auth UUID for registered users; Sleeper owner_id for opponents
  league_id: string;
  title: DMPTitle;
  title_display: string;
  title_description: string;
  pitch_angle: string;
  labels: DMPLabels;
  trade_count: number;
  calculated_at: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}

/** Build a KTC lookup map from player full-name (lowercase) → KTC value. */
async function buildKtcMap(): Promise<Map<string, number>> {
  const list = await getKTCValues();
  const map = new Map<string, number>();
  for (const v of list ?? []) {
    if (v.player_name) map.set(v.player_name.toLowerCase(), v.ktc_value);
  }
  return map;
}

function resolveKtc(
  playerId: string,
  playerDb: PlayerMap,
  ktcByName: Map<string, number>,
): number {
  const name = (playerDb[playerId as keyof typeof playerDb] as { full_name?: string } | undefined)
    ?.full_name ?? '';
  return ktcByName.get(name.toLowerCase()) ?? 0;
}

function resolveAge(playerId: string, playerDb: PlayerMap): number {
  return (playerDb[playerId as keyof typeof playerDb] as { age?: number } | undefined)?.age ?? 26;
}

function resolvePosition(playerId: string, playerDb: PlayerMap): string {
  return (
    (playerDb[playerId as keyof typeof playerDb] as { position?: string } | undefined)
      ?.position ?? ''
  ).toUpperCase();
}

// ─── Transaction batch fetch ───────────────────────────────────────────────────
// Fetches all weeks, stops early after 3 consecutive empty weeks past week 8.

async function fetchAllLeagueTrades(leagueId: string): Promise<SleeperTransaction[]> {
  const trades: SleeperTransaction[] = [];
  let emptyRun = 0;

  for (let week = 1; week <= 18; week++) {
    const txns = await fetchTransactions(leagueId, week);
    const completed = (txns ?? []).filter(
      (t) => t.type === 'trade' && t.status === 'complete',
    );
    trades.push(...completed);

    if (completed.length === 0) {
      emptyRun++;
      if (week > 8 && emptyRun >= 3) break; // offseason — no more data
    } else {
      emptyRun = 0;
    }
  }

  return trades;
}

// ─── Per-trade value computation ───────────────────────────────────────────────

interface TradeSide {
  players: string[];
  picks: number;
  totalKtc: number;
}

function extractSides(
  trade: SleeperTransaction,
  rosterId: number,
  playerDb: PlayerMap,
  ktcByName: Map<string, number>,
): { acquired: TradeSide; sent: TradeSide } {
  const acquired: string[] = [];
  const sent: string[] = [];

  if (trade.adds) {
    for (const [pid, rId] of Object.entries(trade.adds)) {
      if (rId === rosterId) acquired.push(pid);
      else if (trade.roster_ids.includes(rosterId)) sent.push(pid);
    }
  }

  // In Sleeper, `drops` mirrors `adds` — same info from opposite perspective
  // We rely on `adds` and infer sends from the other roster_ids
  if (trade.drops) {
    for (const [pid, rId] of Object.entries(trade.drops)) {
      if (rId === rosterId) sent.push(pid);
    }
  }

  let picksAcq = 0;
  let picksSent = 0;
  for (const pick of trade.draft_picks ?? []) {
    if (pick.owner_id === rosterId) picksAcq++;
    if (pick.previous_owner_id === rosterId) picksSent++;
  }

  const acqKtc = acquired.reduce((s, pid) => s + resolveKtc(pid, playerDb, ktcByName), 0);
  const sentKtc = sent.reduce((s, pid) => s + resolveKtc(pid, playerDb, ktcByName), 0);

  // Rough pick KTC estimate (average mid-round pick value)
  const PICK_KTC = 2200;
  const totalAcq = acqKtc + picksAcq * PICK_KTC;
  const totalSent = sentKtc + picksSent * PICK_KTC;

  return {
    acquired: { players: acquired, picks: picksAcq, totalKtc: totalAcq },
    sent: { players: sent, picks: picksSent, totalKtc: totalSent },
  };
}

// ─── Timing metrics ─────────────────────────────────────────────────────────

interface TimingMetrics {
  responseSpeed: number;
  earlySeasonActivity: number;
  deadlineActivity: number;
  offseasonActivity: number;
}

function computeTimingMetrics(trades: SleeperTransaction[]): TimingMetrics {
  if (!trades.length) {
    return { responseSpeed: 20, earlySeasonActivity: 50, deadlineActivity: 50, offseasonActivity: 50 };
  }

  const timestamps = trades.map((t) => t.created).sort((a, b) => a - b);

  // Avg days between consecutive trades → lower = more active = faster response
  const gaps: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    gaps.push((timestamps[i]! - timestamps[i - 1]!) / (1000 * 60 * 60 * 24));
  }
  const avgGapDays = gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 60;
  // Map: 0-day gap → 100, 60+ days → 10
  const responseSpeed = clamp(100 - (avgGapDays / 60) * 90);

  // Seasonal distribution (month-based approximation)
  const months = trades.map((t) => new Date(t.created).getMonth()); // 0-indexed
  const n = trades.length;
  const earlyCt = months.filter((m) => m === 8 || m === 9).length;   // Sep-Oct
  const deadlineCt = months.filter((m) => m >= 10 || m === 0).length; // Nov-Jan
  const offseasonCt = months.filter((m) => m >= 1 && m <= 7).length;  // Feb-Aug

  return {
    responseSpeed,
    earlySeasonActivity: clamp((earlyCt / n) * 200),   // ×2 since ~50% of trades in this window = 100
    deadlineActivity: clamp((deadlineCt / n) * 200),
    offseasonActivity: clamp((offseasonCt / n) * 200),
  };
}

// ─── Position priority labels ─────────────────────────────────────────────────

function computePositionPriorities(
  acquiredIds: string[],
  picksAcquired: number,
  playerDb: PlayerMap,
): { qb: number; rb: number; wr: number; te: number; pick: number } {
  const counts: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0 };
  for (const pid of acquiredIds) {
    const pos = resolvePosition(pid, playerDb);
    if (pos in counts) counts[pos]!++;
  }

  const playerTotal = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
  const grandTotal = playerTotal + picksAcquired;

  // Scale each: if they split equally across 4 positions = 25% each → normalize to 50
  return {
    qb: clamp((counts['QB']! / playerTotal) * 200),
    rb: clamp((counts['RB']! / playerTotal) * 130),
    wr: clamp((counts['WR']! / playerTotal) * 130),
    te: clamp((counts['TE']! / playerTotal) * 200),
    pick: grandTotal > 0 ? clamp((picksAcquired / grandTotal) * 300) : 25,
  };
}

// ─── Title classifier (aligned to spec) ──────────────────────────────────────

function classifyTitle(labels: DMPLabels, tradeCount: number): DMPTitle {
  if (tradeCount < 2 || labels.trade_volume < 5) return 'THE_GHOST';

  const scores: Record<DMPTitle, number> = {
    // Architect: high rebuild + high value awareness + low star chasing
    THE_ARCHITECT:
      labels.rebuild_index * 0.40 +
      labels.value_awareness * 0.35 +
      (100 - labels.star_chasing) * 0.25,

    // Shark: high value awareness + low overpay + high counter rate
    THE_SHARK:
      labels.value_awareness * 0.40 +
      (100 - labels.overpay_rate) * 0.35 +
      labels.counter_rate * 0.25,

    // Gambler: high star chasing + high trade volume + low value awareness
    THE_GAMBLER:
      labels.star_chasing * 0.40 +
      labels.trade_volume * 0.35 +
      (100 - labels.value_awareness) * 0.25,

    // Professor: high value awareness + low panic + low lowball rate
    THE_PROFESSOR:
      labels.value_awareness * 0.40 +
      (100 - labels.panic_score) * 0.35 +
      (100 - labels.lowball_rate) * 0.25,

    // Hustler: high trade volume + high counter rate + high response speed
    THE_HUSTLER:
      labels.trade_volume * 0.40 +
      labels.counter_rate * 0.35 +
      labels.response_speed * 0.25,

    // Loyalist: low trade volume + low win now + high patience
    THE_LOYALIST:
      (100 - labels.trade_volume) * 0.40 +
      (100 - labels.win_now_index) * 0.35 +
      labels.patience_score * 0.25,

    // Prophet: high value awareness + buy low tendency + early mover
    THE_PROPHET:
      labels.value_awareness * 0.40 +
      labels.buy_low_tendency * 0.40 +
      (100 - labels.star_chasing) * 0.20,

    // Contender: high win now + high star chasing + low rebuild
    THE_CONTENDER:
      labels.win_now_index * 0.40 +
      labels.star_chasing * 0.35 +
      (100 - labels.rebuild_index) * 0.25,

    // Ghost: very low trade volume + low response speed
    THE_GHOST:
      (100 - labels.trade_volume) * 0.60 +
      (100 - labels.response_speed) * 0.40,

    THE_WILDCARD: 0,
  };

  // Sort by score descending (excluding THE_WILDCARD)
  const ranked = (Object.entries(scores) as [DMPTitle, number][])
    .filter(([k]) => k !== 'THE_WILDCARD')
    .sort(([, a], [, b]) => b - a);

  const top = ranked[0];
  const second = ranked[1];

  // If top two are within 10 pts → no clear dominant pattern → Wildcard
  if (top && second && top[1] - second[1] < 10) {
    return 'THE_WILDCARD';
  }

  return top?.[0] ?? 'THE_WILDCARD';
}

// ─── Core computation ─────────────────────────────────────────────────────────

async function computeLabels(
  rosterId: number,
  allTrades: SleeperTransaction[],
  playerDb: PlayerMap,
  ktcByName: Map<string, number>,
): Promise<{ labels: DMPLabels; tradeCount: number }> {
  const myTrades = allTrades.filter((t) => t.roster_ids.includes(rosterId));
  const tradeCount = myTrades.length;

  if (tradeCount === 0) {
    return { labels: buildDefaultLabels(0), tradeCount: 0 };
  }

  // ── Aggregate trade data ────────────────────────────────────────────────

  let totalAcqKtc = 0;
  let totalSentKtc = 0;
  let totalAcqAge = 0;
  let ageCount = 0;
  let picksAcquired = 0;
  let picksSent = 0;
  let topKtcAcquires = 0;       // players acquired with KTC ≥ 6500 (top-50 proxy)
  let overpaidTrades = 0;       // gave > got by 15%+
  let underwrote = 0;           // got > gave by 15%+ (sent a "lowball" that landed)
  let multiPlayerDeals = 0;     // trades with 3+ total assets on each side
  let picksInDeal = 0;
  const acquiredIds: string[] = [];

  for (const trade of myTrades) {
    const { acquired, sent } = extractSides(trade, rosterId, playerDb, ktcByName);

    acquiredIds.push(...acquired.players);
    picksAcquired += acquired.picks;
    picksSent += sent.picks;

    if (acquired.totalKtc > 0 || sent.totalKtc > 0) {
      totalAcqKtc += acquired.totalKtc;
      totalSentKtc += sent.totalKtc;

      // Overpay / lowball detection
      if (sent.totalKtc > 0 && acquired.totalKtc / sent.totalKtc < 0.85) overpaidTrades++;
      if (acquired.totalKtc > 0 && sent.totalKtc / acquired.totalKtc < 0.85) underwrote++;
    }

    for (const pid of acquired.players) {
      const ktc = resolveKtc(pid, playerDb, ktcByName);
      const age = resolveAge(pid, playerDb);
      if (ktc >= 6500) topKtcAcquires++;
      if (age) { totalAcqAge += age; ageCount++; }
    }

    const totalAssets =
      (acquired.players.length + acquired.picks) + (sent.players.length + sent.picks);
    if (totalAssets >= 6) multiPlayerDeals++;    // 3+ per side
    if (acquired.picks + sent.picks > 0) picksInDeal++;
  }

  // ── Derived metrics ────────────────────────────────────────────────────────

  const avgAcqKtc = tradeCount > 0 ? totalAcqKtc / tradeCount : 4000;
  const avgSentKtc = tradeCount > 0 ? totalSentKtc / tradeCount : 4000;
  const avgAcqAge = ageCount > 0 ? totalAcqAge / ageCount : 26;

  // Trade volume: normalized vs league average of ~8 trades/season → 8 = 50
  const tradeVolume = clamp((tradeCount / 16) * 100);

  // Age preference: >50 = youth buyer (low avg acquired age)
  const agePreference = clamp(normalize(34 - avgAcqAge, 0, 12));

  // Pick hoarding
  const pickTotal = picksAcquired + picksSent;
  const pickHoarding = pickTotal > 0 ? clamp((picksAcquired / pickTotal) * 100) : 50;

  // Win now: buying higher KTC = contender move
  const ktcDelta = avgAcqKtc - avgSentKtc;
  const winNow = clamp(50 + ktcDelta / 100);
  const rebuildIndex = 100 - winNow;

  // Star chasing: % of acquisitions that are top-50 KTC (≥6500)
  const starChasing = acquiredIds.length > 0
    ? clamp((topKtcAcquires / acquiredIds.length) * 100 * 3)
    : 20;

  // Value awareness: getting more KTC than you give → good deal-maker
  const valueAwareness = avgSentKtc > 0
    ? clamp(50 + (avgAcqKtc - avgSentKtc) / 80)
    : 50;

  // Patience: inverse of how frequently they flip players
  // High trade volume + average hold time → lower patience
  const patienceScore = clamp(100 - tradeVolume * 0.75);

  // Panic: proxy — high volume + selling young players (age < 24)
  const panicScore = clamp(tradeVolume * 0.40 + ((avgAcqAge < 25 ? 55 : 25) * 0.60));

  // Overpay rate and lowball rate
  const overpayRate = tradeCount > 0 ? clamp((overpaidTrades / tradeCount) * 100) : 30;
  const lowballRate = tradeCount > 0 ? clamp((underwrote / tradeCount) * 100) : 30;

  // Counter rate: proxy from multi-player deal frequency (complex = negotiated)
  const counterRate = tradeCount > 0
    ? clamp((multiPlayerDeals / tradeCount) * 100 * 2)
    : 40;

  // Pick inclusion frequency
  const pickInclusionFreq = tradeCount > 0
    ? clamp((picksInDeal / tradeCount) * 100)
    : 25;

  // Buy low tendency: inverse of star chasing
  const buyLowTendency = clamp(100 - starChasing * 0.75);

  // Timing metrics
  const timing = computeTimingMetrics(myTrades);

  // Position priorities
  const posPriority = computePositionPriorities(acquiredIds, picksAcquired, playerDb);

  // ── Assemble labels ────────────────────────────────────────────────────────

  const labels: DMPLabels = {
    // Core 13
    trade_volume: tradeVolume,
    age_preference: agePreference,
    pick_hoarding: pickHoarding,
    win_now_index: winNow,
    rebuild_index: rebuildIndex,
    star_chasing: starChasing,
    value_awareness: valueAwareness,
    patience_score: patienceScore,
    panic_score: panicScore,
    counter_rate: counterRate,
    response_speed: timing.responseSpeed,
    lowball_rate: lowballRate,
    overpay_rate: overpayRate,

    // Position tendencies
    qb_priority: posPriority.qb,
    rb_priority: posPriority.rb,
    wr_priority: posPriority.wr,
    te_priority: posPriority.te,
    pick_priority: posPriority.pick,

    // Activity
    weekly_engagement: tradeVolume,
    offer_acceptance_rate: clamp(100 - counterRate * 0.5),
    counteroffer_rate: counterRate,
    multi_player_deal_freq: tradeCount > 0 ? clamp((multiPlayerDeals / tradeCount) * 100) : 25,
    pick_inclusion_freq: pickInclusionFreq,

    // Market timing
    buy_low_tendency: buyLowTendency,
    sell_high_tendency: clamp(valueAwareness * 0.7 + (100 - overpayRate) * 0.3),
    deadline_trading: timing.deadlineActivity,
    early_season_trading: timing.earlySeasonActivity,
    offseason_activity: timing.offseasonActivity,

    // Risk profile
    injury_risk_tolerance: clamp(agePreference * 0.4 + starChasing * 0.6),
    age_risk_tolerance: clamp(100 - agePreference),
    unproven_upside_appetite: clamp(agePreference * 0.7 + buyLowTendency * 0.3),
    proven_production_bias: clamp(winNow * 0.5 + starChasing * 0.5),
    boom_bust_appetite: clamp(starChasing * 0.6 + (100 - patienceScore) * 0.4),

    // Dynasty strategy
    rebuild_depth: rebuildIndex,
    contention_window_clarity: winNow,
    pick_capital_hoarding: pickHoarding,
    youth_movement: agePreference,
    veteran_dependency: clamp(100 - agePreference),
  };

  return { labels, tradeCount };
}

// ─── Profile builder ──────────────────────────────────────────────────────────

function buildProfile(
  userId: string,
  leagueId: string,
  labels: DMPLabels,
  tradeCount: number,
): DMPProfile {
  const title = classifyTitle(labels, tradeCount);
  const meta = DMP_TITLE_META[title];
  return {
    user_id: userId,
    league_id: leagueId,
    title,
    title_display: meta.display,
    title_description: meta.description,
    pitch_angle: meta.pitch,
    labels,
    trade_count: tradeCount,
    calculated_at: new Date().toISOString(),
  };
}

function buildDefaultLabels(tradeCount: number): DMPLabels {
  const base: Record<string, number> = {};
  for (const k of Object.keys({
    trade_volume: 0, age_preference: 0, pick_hoarding: 0, win_now_index: 0, rebuild_index: 0,
    star_chasing: 0, value_awareness: 0, patience_score: 0, panic_score: 0, counter_rate: 0,
    response_speed: 0, lowball_rate: 0, overpay_rate: 0, qb_priority: 0, rb_priority: 0,
    wr_priority: 0, te_priority: 0, pick_priority: 0, weekly_engagement: 0,
    offer_acceptance_rate: 0, counteroffer_rate: 0, multi_player_deal_freq: 0,
    pick_inclusion_freq: 0, buy_low_tendency: 0, sell_high_tendency: 0, deadline_trading: 0,
    early_season_trading: 0, offseason_activity: 0, injury_risk_tolerance: 0, age_risk_tolerance: 0,
    unproven_upside_appetite: 0, proven_production_bias: 0, boom_bust_appetite: 0,
    rebuild_depth: 0, contention_window_clarity: 0, pick_capital_hoarding: 0,
    youth_movement: 0, veteran_dependency: 0,
  })) base[k] = tradeCount === 0 ? 0 : 50;

  return base as DMPLabels;
}

// ─── computeDMPForManager ─────────────────────────────────────────────────────

export async function computeDMPForManager(
  userId: string,
  leagueId: string,
  sleeperRosterId: number,
): Promise<DMPProfile | null> {
  const [playerDb, ktcByName, allTrades] = await Promise.all([
    fetchAllPlayers(),
    buildKtcMap(),
    fetchAllLeagueTrades(leagueId),
  ]);

  const { labels, tradeCount } = await computeLabels(
    sleeperRosterId,
    allTrades,
    (playerDb ?? {}) as PlayerMap,
    ktcByName,
  );

  return buildProfile(userId, leagueId, labels, tradeCount);
}

// ─── computeDMPForLeague ───────────────────────────────────────────────────────
// Profiles ALL managers in a league in a single transaction batch pass.
// Returns a map of Sleeper owner_id → DMPProfile.
// Registered users also persisted to dmp_profiles.

export async function computeDMPForLeague(
  leagueId: string,
): Promise<Map<string, DMPProfile>> {
  const supabase = createAdminClient();

  const [rosters, playerDb, ktcByName, allTrades] = await Promise.all([
    fetchLeagueRosters(leagueId),
    fetchAllPlayers(),
    buildKtcMap(),
    fetchAllLeagueTrades(leagueId),
  ]);

  if (!rosters) return new Map();

  const db = (playerDb ?? {}) as PlayerMap;
  const profileMap = new Map<string, DMPProfile>();
  const upsertRows: Record<string, unknown>[] = [];

  // Find which Sleeper owner_ids map to registered auth users
  const ownerIds = rosters.map((r) => String(r.owner_id ?? '')).filter(Boolean);
  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, sleeper_user_id')
    .in('sleeper_user_id', ownerIds);

  const authByOwner = new Map<string, string>(
    (profileRows ?? []).map((p: { id: string; sleeper_user_id: string }) => [
      String(p.sleeper_user_id),
      String(p.id),
    ]),
  );

  for (const roster of rosters) {
    const ownerId = String(roster.owner_id ?? '');
    if (!ownerId) continue;

    const { labels, tradeCount } = await computeLabels(
      roster.roster_id,
      allTrades,
      db,
      ktcByName,
    );

    const profile = buildProfile(ownerId, leagueId, labels, tradeCount);
    profileMap.set(ownerId, profile);

    // Only persist for registered users (schema FK to auth.users)
    const authUuid = authByOwner.get(ownerId);
    if (authUuid) {
      upsertRows.push({
        user_id: authUuid,
        league_id: leagueId,
        labels: profile.labels,
        title: profile.title,
        trade_count: profile.trade_count,
        calculated_at: profile.calculated_at,
        updated_at: profile.calculated_at,
      });
    }
  }

  if (upsertRows.length > 0) {
    await supabase
      .from('dmp_profiles')
      .upsert(upsertRows, { onConflict: 'user_id,league_id' });
  }

  return profileMap;
}

// ─── computeDMPForAllLeagues ──────────────────────────────────────────────────
// For the authenticated user's own profile across all their leagues.

export async function computeDMPForAllLeagues(
  authUserId: string,
  leagueIds: string[],
  sleeperUserId: string,
): Promise<DMPProfile[]> {
  const supabase = createAdminClient();
  const results: DMPProfile[] = [];

  for (const leagueId of leagueIds) {
    const rosters = await fetchLeagueRosters(leagueId);
    if (!rosters) continue;

    const myRoster = rosters.find((r) => String(r.owner_id ?? '') === sleeperUserId);
    if (!myRoster) continue;

    const [playerDb, ktcByName, allTrades] = await Promise.all([
      fetchAllPlayers(),
      buildKtcMap(),
      fetchAllLeagueTrades(leagueId),
    ]);

    const { labels, tradeCount } = await computeLabels(
      myRoster.roster_id,
      allTrades,
      (playerDb ?? {}) as PlayerMap,
      ktcByName,
    );

    const profile = buildProfile(authUserId, leagueId, labels, tradeCount);
    results.push(profile);

    await supabase.from('dmp_profiles').upsert(
      {
        user_id: authUserId,
        league_id: leagueId,
        labels: profile.labels,
        title: profile.title,
        trade_count: profile.trade_count,
        calculated_at: profile.calculated_at,
        updated_at: profile.calculated_at,
      },
      { onConflict: 'user_id,league_id' },
    );
  }

  return results;
}

// ─── getDMP ───────────────────────────────────────────────────────────────────
// Public export. managerId = Sleeper user_id.
// Looks up registered user profile from DB; returns null for unregistered managers.

export async function getDMP(
  managerId: string,
  leagueId: string,
): Promise<DMPProfile | null> {
  const supabase = createAdminClient();

  // Resolve Sleeper user_id → auth UUID
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('id')
    .eq('sleeper_user_id', managerId)
    .maybeSingle();

  if (!profileRow) return null;
  const authUuid = (profileRow as { id: string }).id;

  const { data } = await supabase
    .from('dmp_profiles')
    .select('*')
    .eq('user_id', authUuid)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (!data) return null;

  type Row = {
    user_id: string;
    league_id: string;
    labels: DMPLabels;
    title: DMPTitle;
    trade_count: number;
    calculated_at: string;
  };
  const row = data as Row;
  const meta = DMP_TITLE_META[row.title] ?? DMP_TITLE_META.THE_WILDCARD;

  return {
    user_id: managerId,
    league_id: row.league_id,
    title: row.title,
    title_display: meta.display,
    title_description: meta.description,
    pitch_angle: meta.pitch,
    labels: row.labels,
    trade_count: row.trade_count,
    calculated_at: row.calculated_at,
  };
}

// ─── getTitle ─────────────────────────────────────────────────────────────────
// Returns just the title string for a manager.
// Falls back to 'THE_WILDCARD' if no profile exists.

export async function getTitle(
  managerId: string,
  leagueId: string,
): Promise<DMPTitle> {
  const profile = await getDMP(managerId, leagueId);
  return profile?.title ?? 'THE_WILDCARD';
}

// ─── getDMPProfile (legacy alias) ────────────────────────────────────────────

export async function getDMPProfile(
  authUserId: string,
  leagueId: string,
): Promise<DMPProfile | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('dmp_profiles')
    .select('*')
    .eq('user_id', authUserId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (!data) return null;

  type Row = {
    user_id: string;
    league_id: string;
    labels: DMPLabels;
    title: DMPTitle;
    trade_count: number;
    calculated_at: string;
  };
  const row = data as Row;
  const meta = DMP_TITLE_META[row.title] ?? DMP_TITLE_META.THE_WILDCARD;

  return {
    user_id: row.user_id,
    league_id: row.league_id,
    title: row.title,
    title_display: meta.display,
    title_description: meta.description,
    pitch_angle: meta.pitch,
    labels: row.labels,
    trade_count: row.trade_count,
    calculated_at: row.calculated_at,
  };
}
