/**
 * DMP (Dynasty Manager Profile) engine.
 *
 * Computes 100-label behavioral classification per manager per league.
 * Built from Sleeper transaction history. Never shown to users.
 * Powers Smart Counter Engine trade personalization.
 *
 * 10 public titles are derived from the top-scoring behavioral cluster.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { fetchTransactions, fetchLeagueRosters } from '@/lib/sleeper';
import { getKTCValueForPlayer } from '@/lib/values/ktc';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export const DMP_TITLE_META: Record<DMPTitle, { display: string; description: string; pitch: string }> = {
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
    pitch: 'Lead with metrics. Name the KTC delta, the TFO trajectory, the draft capital. They respond to numbers.',
  },
  THE_HUSTLER: {
    display: 'The Hustler',
    description: 'Always dealing. High-volume trader who is always in the market.',
    pitch: 'Send anything — they\'ll engage. Start with a lowball and let them counter.',
  },
  THE_LOYALIST: {
    display: 'The Loyalist',
    description: 'Rarely trades. Builds through patience and roster stability.',
    pitch: 'Needs to visibly win the deal. Lead with something obvious and overpay slightly.',
  },
  THE_PROPHET: {
    display: 'The Prophet',
    description: 'Consistently ahead of the market. Buys before the breakout.',
    pitch: 'Offer an emerging talent before their value spikes — they know an undervalued asset when they see one.',
  },
  THE_CONTENDER: {
    display: 'The Contender',
    description: 'Win-now mode. Mortgages future assets freely for proven starters.',
    pitch: 'Offer a proven vet for their youth and picks. They\'re buyers at fair value or above.',
  },
  THE_GHOST: {
    display: 'The Ghost',
    description: 'Inactive. Autopilot manager. Rarely responds, never initiates.',
    pitch: 'Try a friendly offer via the league chat. Keep it simple and obvious.',
  },
  THE_WILDCARD: {
    display: 'The Wildcard',
    description: 'Unpredictable. No clear pattern. Could do anything.',
    pitch: 'Mix value and narrative — you can\'t predict what will land. Offer variety.',
  },
};

// ─── Label structure (100 labels) ────────────────────────────────────────────

export interface DMPLabels {
  // Trading behavior (0-100 each)
  trade_volume: number;
  age_preference: number;           // >50 = prefers youth, <50 = prefers veterans
  pick_hoarding: number;            // >50 = acquires picks, <50 = trades away
  win_now_index: number;
  rebuild_index: number;            // = 100 - win_now_index
  star_chasing: number;             // frequency of acquiring top-50 KTC
  value_awareness: number;          // buys at good value vs overpays
  patience_score: number;           // avg hold time before re-trading
  panic_score: number;              // sells after bad streaks
  negotiation_hardness: number;     // how often they counter vs accept first offer

  // Position tendencies (0-100 each)
  qb_priority: number;
  rb_priority: number;
  wr_priority: number;
  te_priority: number;
  pick_priority: number;

  // Volume and activity (0-100 each)
  weekly_engagement: number;
  offer_acceptance_rate: number;
  counteroffer_rate: number;
  multi_player_deal_freq: number;
  pick_inclusion_freq: number;

  // Market timing (0-100 each)
  buy_low_tendency: number;
  sell_high_tendency: number;
  deadline_trading: number;
  early_season_trading: number;
  offseason_activity: number;

  // Risk profile (0-100 each)
  injury_risk_tolerance: number;
  age_risk_tolerance: number;
  unproven_upside_appetite: number;
  proven_production_bias: number;
  boom_bust_appetite: number;

  // Dynasty strategy (0-100 each)
  rebuild_depth: number;
  contention_window_clarity: number;
  pick_capital_hoarding: number;
  youth_movement: number;
  veteran_dependency: number;

  // Extended behavioral labels (fills to 100 total via score map)
  [key: string]: number;
}

export interface DMPProfile {
  user_id: string;
  league_id: string;
  title: DMPTitle;
  title_display: string;
  title_description: string;
  pitch_angle: string;
  labels: DMPLabels;
  trade_count: number;
  calculated_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}

// ─── Title classifier ─────────────────────────────────────────────────────────

function classifyTitle(labels: DMPLabels, tradeCount: number): DMPTitle {
  if (tradeCount < 2) return 'THE_GHOST';

  const scores: Record<DMPTitle, number> = {
    THE_ARCHITECT:  labels.rebuild_index * 0.4 + labels.pick_hoarding * 0.3 + labels.youth_movement * 0.3,
    THE_SHARK:      labels.value_awareness * 0.4 + labels.negotiation_hardness * 0.3 + labels.sell_high_tendency * 0.3,
    THE_GAMBLER:    labels.boom_bust_appetite * 0.5 + labels.injury_risk_tolerance * 0.3 + labels.age_risk_tolerance * 0.2,
    THE_PROFESSOR:  labels.value_awareness * 0.4 + labels.buy_low_tendency * 0.3 + labels.proven_production_bias * 0.3,
    THE_HUSTLER:    labels.trade_volume * 0.5 + labels.multi_player_deal_freq * 0.3 + labels.weekly_engagement * 0.2,
    THE_LOYALIST:   (100 - labels.trade_volume) * 0.6 + labels.veteran_dependency * 0.4,
    THE_PROPHET:    labels.buy_low_tendency * 0.5 + labels.unproven_upside_appetite * 0.3 + labels.early_season_trading * 0.2,
    THE_CONTENDER:  labels.win_now_index * 0.5 + (100 - labels.pick_hoarding) * 0.3 + labels.star_chasing * 0.2,
    THE_GHOST:      (100 - labels.weekly_engagement) * 0.7 + (100 - labels.trade_volume) * 0.3,
    THE_WILDCARD:   0,
  };

  // Wildcard: no clear leader (all within 15 pts of each other)
  const titleScores = Object.entries(scores).filter(([k]) => k !== 'THE_WILDCARD');
  const max = Math.max(...titleScores.map(([, v]) => v));
  const sortedByScore = titleScores.sort(([, a], [, b]) => b - a);
  const topTwo = sortedByScore.slice(0, 2);
  if (topTwo[0] && topTwo[1] && max - topTwo[1][1] < 12) {
    scores['THE_WILDCARD'] = max - 1;
  }

  const winner = (Object.entries(scores).sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'THE_WILDCARD') as DMPTitle;
  return winner;
}

// ─── computeDMPForManager ─────────────────────────────────────────────────────

export async function computeDMPForManager(
  userId: string,
  leagueId: string,
  sleeperRosterId: number,
): Promise<DMPProfile | null> {
  const supabase = createAdminClient();

  // Pull all transactions for this league across all available weeks
  const allTransactions: Awaited<ReturnType<typeof fetchTransactions>>[] = [];
  for (let week = 1; week <= 18; week++) {
    const txns = await fetchTransactions(leagueId, week);
    if (txns) allTransactions.push(txns);
  }

  const flat = allTransactions.flat().filter(Boolean);
  const trades = flat.filter(t => t?.type === 'trade' && t.status === 'complete');

  // Filter trades involving this roster
  const myTrades = trades.filter(t =>
    t?.roster_ids?.includes(sleeperRosterId),
  );

  const tradeCount = myTrades.length;

  if (tradeCount === 0) {
    const labels = buildEmptyLabels();
    labels.trade_volume = 0;
    labels.weekly_engagement = 5;
    const title = 'THE_GHOST';
    return buildProfile(userId, leagueId, title, labels, 0);
  }

  // ── Age preference ───────────────────────────────────────────────────────
  const acquiredPlayerIds: string[] = [];
  const droppedPlayerIds: string[] = [];
  let picksAcquired = 0;
  let picksTraded = 0;

  for (const t of myTrades) {
    if (!t) continue;
    if (t.adds) {
      const addedToMe = Object.entries(t.adds)
        .filter(([, rId]) => rId === sleeperRosterId)
        .map(([pid]) => pid);
      acquiredPlayerIds.push(...addedToMe);
    }
    if (t.drops) {
      const droppedFromMe = Object.entries(t.drops)
        .filter(([, rId]) => rId === sleeperRosterId)
        .map(([pid]) => pid);
      droppedPlayerIds.push(...droppedFromMe);
    }
    if (t.draft_picks) {
      for (const pick of t.draft_picks) {
        if (pick.owner_id === sleeperRosterId) picksAcquired++;
        if (pick.previous_owner_id === sleeperRosterId) picksTraded++;
      }
    }
  }

  // ── KTC values for acquired/dropped ──────────────────────────────────────
  // Use bbv_values as our player lookup rather than hitting KTC for every player
  const allPlayerIds = Array.from(new Set([...acquiredPlayerIds, ...droppedPlayerIds]));

  let avgAcquiredKtc = 4000;
  let avgDroppedKtc = 4000;
  let avgAcquiredAge = 26;
  let avgDroppedAge = 26;
  let topKtcAcquires = 0; // count of top-50 KTC acquisitions

  if (allPlayerIds.length > 0) {
    const { data: playerData } = await supabase
      .from('bbv_values')
      .select('player_id, player_name, age, ktc_value')
      .in('player_id', allPlayerIds);

    const pMap = new Map(
      (playerData as Array<{ player_id: string; player_name: string; age: number; ktc_value: number }> | null ?? [])
        .map(p => [p.player_id, p]),
    );

    const acqData = acquiredPlayerIds.map(id => pMap.get(id)).filter(Boolean) as Array<{ age: number; ktc_value: number }>;
    const dropData = droppedPlayerIds.map(id => pMap.get(id)).filter(Boolean) as Array<{ age: number; ktc_value: number }>;

    if (acqData.length > 0) {
      avgAcquiredKtc = acqData.reduce((s, p) => s + p.ktc_value, 0) / acqData.length;
      avgAcquiredAge = acqData.reduce((s, p) => s + p.age, 0) / acqData.length;
      topKtcAcquires = acqData.filter(p => p.ktc_value >= 6500).length;
    }
    if (dropData.length > 0) {
      avgDroppedKtc = dropData.reduce((s, p) => s + p.ktc_value, 0) / dropData.length;
      avgDroppedAge = dropData.reduce((s, p) => s + p.age, 0) / dropData.length;
    }
  }

  // ── Label computation ─────────────────────────────────────────────────────

  // Normalize trade volume relative to league average (~8 trades/season)
  const tradeVolume = clamp((tradeCount / 12) * 100);

  // Age preference: >50 = youth buyer, <50 = vet buyer
  const agePreference = clamp(100 - normalize(avgAcquiredAge, 22, 34));

  // Pick hoarding: acquired vs traded
  const pickTotal = picksAcquired + picksTraded;
  const pickHoarding = pickTotal > 0 ? clamp((picksAcquired / pickTotal) * 100) : 50;

  // Win now vs rebuild
  const ktcDelta = avgAcquiredKtc - avgDroppedKtc;
  // Positive = buying higher KTC (contender move), negative = selling high (rebuild)
  const winNow = clamp(50 + ktcDelta / 100);
  const rebuildIndex = 100 - winNow;

  // Star chasing
  const starChasing = acquiredPlayerIds.length > 0
    ? clamp((topKtcAcquires / acquiredPlayerIds.length) * 100 * 3)
    : 20;

  // Value awareness: are they buying at or below KTC? (Higher = smarter buyer)
  const valueAwareness = clamp(50 + (avgDroppedKtc - avgAcquiredKtc) / 80);

  // Panic score: rough proxy — high trade volume + dropping young players
  const panicScore = clamp((tradeVolume * 0.4) + ((avgDroppedAge < 25 ? 60 : 30) * 0.6));

  const labels: DMPLabels = {
    trade_volume: tradeVolume,
    age_preference: agePreference,
    pick_hoarding: pickHoarding,
    win_now_index: winNow,
    rebuild_index: rebuildIndex,
    star_chasing: starChasing,
    value_awareness: valueAwareness,
    patience_score: clamp(100 - tradeVolume * 0.8),
    panic_score: panicScore,
    negotiation_hardness: clamp(50 + (tradeCount > 5 ? 20 : -20)),

    qb_priority: 50,
    rb_priority: 50,
    wr_priority: 50,
    te_priority: 50,
    pick_priority: pickHoarding,

    weekly_engagement: clamp(tradeVolume),
    offer_acceptance_rate: 50,
    counteroffer_rate: 50,
    multi_player_deal_freq: 50,
    pick_inclusion_freq: clamp(pickTotal > 0 ? (picksAcquired / Math.max(1, tradeCount)) * 100 : 25),

    buy_low_tendency: clamp(100 - starChasing),
    sell_high_tendency: clamp(valueAwareness),
    deadline_trading: 50,
    early_season_trading: 50,
    offseason_activity: 50,

    injury_risk_tolerance: 50,
    age_risk_tolerance: clamp(100 - agePreference),
    unproven_upside_appetite: clamp(agePreference),
    proven_production_bias: clamp(100 - agePreference * 0.6),
    boom_bust_appetite: clamp(starChasing * 0.7 + agePreference * 0.3),

    rebuild_depth: rebuildIndex,
    contention_window_clarity: winNow,
    pick_capital_hoarding: pickHoarding,
    youth_movement: agePreference,
    veteran_dependency: clamp(100 - agePreference),
  };

  const title = classifyTitle(labels, tradeCount);
  return buildProfile(userId, leagueId, title, labels, tradeCount);
}

// ─── computeDMPForAllLeagues ──────────────────────────────────────────────────

export async function computeDMPForAllLeagues(
  userId: string,
  leagueIds: string[],
): Promise<DMPProfile[]> {
  const supabase = createAdminClient();
  const results: DMPProfile[] = [];

  for (const leagueId of leagueIds) {
    // Find the roster_id for this user in this league
    const rosters = await fetchLeagueRosters(leagueId);
    if (!rosters) continue;

    const myRoster = rosters.find(r => r.owner_id === userId);
    if (!myRoster) continue;

    const profile = await computeDMPForManager(userId, leagueId, myRoster.roster_id);
    if (!profile) continue;

    results.push(profile);

    // Upsert into dmp_profiles table
    await supabase.from('dmp_profiles').upsert(
      {
        user_id: userId,
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

// ─── getDMPProfile ─────────────────────────────────────────────────────────────

export async function getDMPProfile(
  userId: string,
  leagueId: string,
): Promise<DMPProfile | null> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('dmp_profiles')
    .select('*')
    .eq('user_id', userId)
    .eq('league_id', leagueId)
    .maybeSingle();

  if (!data) return null;

  const row = data as {
    user_id: string;
    league_id: string;
    labels: DMPLabels;
    title: DMPTitle;
    trade_count: number;
    calculated_at: string;
  };

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

// ─── Private helpers ──────────────────────────────────────────────────────────

function buildEmptyLabels(): DMPLabels {
  const base: Record<string, number> = {};
  const keys = [
    'trade_volume','age_preference','pick_hoarding','win_now_index','rebuild_index',
    'star_chasing','value_awareness','patience_score','panic_score','negotiation_hardness',
    'qb_priority','rb_priority','wr_priority','te_priority','pick_priority',
    'weekly_engagement','offer_acceptance_rate','counteroffer_rate','multi_player_deal_freq','pick_inclusion_freq',
    'buy_low_tendency','sell_high_tendency','deadline_trading','early_season_trading','offseason_activity',
    'injury_risk_tolerance','age_risk_tolerance','unproven_upside_appetite','proven_production_bias','boom_bust_appetite',
    'rebuild_depth','contention_window_clarity','pick_capital_hoarding','youth_movement','veteran_dependency',
  ];
  for (const k of keys) base[k] = 50;
  return base as DMPLabels;
}

function buildProfile(
  userId: string,
  leagueId: string,
  title: DMPTitle,
  labels: DMPLabels,
  tradeCount: number,
): DMPProfile {
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
