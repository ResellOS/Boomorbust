/**
 * Smart Counter Engine — generates 3 tailored trade responses per incoming offer.
 *
 * 1. COUNTER TO WIN   — tilt the deal in your favor, personalized to opponent DMP
 * 2. COUNTER TO ACCEPT — minor improvement; friendly tone; only when EVEN or WIN
 * 3. ACCEPT AS-IS     — only when WIN; explains why the deal is already good
 *
 * Invisible to users: opponent DMP profile powers the personalization layer.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getDMP } from '@/lib/dmp/engine';
import type { DMPLabels, DMPProfile, DMPTitle } from '@/lib/dmp/engine';
import { analyzeTrade } from '@/lib/tre/engine';
import type { TREAsset, TREOffer, TREResult } from '@/lib/tre/engine';

// ─── Public types ─────────────────────────────────────────────────────────────

export type CounterStrategy = 'COUNTER_TO_WIN' | 'COUNTER_TO_ACCEPT' | 'ACCEPT_AS_IS';

export interface CounterOffer {
  strategy: CounterStrategy;
  /** UI button label. */
  headline: string;
  /** Assets you would send in this counter scenario. */
  offer_assets: TREAsset[];
  /** Assets you would receive in this counter scenario. */
  return_assets: TREAsset[];
  /** Confident, specific reasoning string. ≤2 sentences. */
  reasoning: string;
  /** Optional note — used on Counter to Accept to soften the ask. */
  note?: string;
  /** 0-100 confidence score for this response. */
  confidence: number;
}

export interface SmartCounterResult {
  opponent_archetype: DMPTitle | null;
  tre_result: TREResult;
  counters: [CounterOffer, CounterOffer, CounterOffer];
}

// ─── BVI delta resolver ───────────────────────────────────────────────────────
// Pulls stored BVI delta per player from player_values.
// Positive delta = BVI > KTC = market undervalues this player.

interface BVIDelta {
  player_id: string;
  bvi_score: number;
  ktc_value: number;
  delta: number;
}

async function loadBVIDeltas(playerIds: string[]): Promise<Map<string, BVIDelta>> {
  if (!playerIds.length) return new Map();
  const supabase = createAdminClient();

  const { data } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, ktc_value')
    .in('player_id', playerIds);

  const map = new Map<string, BVIDelta>();
  type Row = { player_id: string; bvi_score: number; ktc_value: number };
  for (const row of (data ?? []) as Row[]) {
    const delta = (row.bvi_score ?? 0) - (row.ktc_value ?? 0);
    map.set(row.player_id, {
      player_id: row.player_id,
      bvi_score: row.bvi_score ?? 0,
      ktc_value: row.ktc_value ?? 0,
      delta,
    });
  }
  return map;
}

// ─── Archetype messaging hooks ────────────────────────────────────────────────

const ARCHETYPE_HOOK: Record<DMPTitle, { opener: string; closer: string }> = {
  THE_ARCHITECT: {
    opener: 'You run a tight ship',
    closer: 'This keeps both sides in the green long-term.',
  },
  THE_SHARK: {
    opener: "You know value better than anyone",
    closer: "The numbers back this one.",
  },
  THE_GAMBLER: {
    opener: 'High ceiling on this one',
    closer: "Roll the dice — the upside is real.",
  },
  THE_PROFESSOR: {
    opener: 'The data supports this move',
    closer: 'Hard to argue with the metrics here.',
  },
  THE_HUSTLER: {
    opener: "You're always in the market",
    closer: "Let's close this and move on.",
  },
  THE_LOYALIST: {
    opener: 'You build for the long haul',
    closer: 'This fits your roster vision.',
  },
  THE_PROPHET: {
    opener: 'You see value before others do',
    closer: "You'll be ahead of the market on this one.",
  },
  THE_CONTENDER: {
    opener: "You're chasing a title this year",
    closer: 'This pushes your contention window forward.',
  },
  THE_GHOST: {
    opener: 'Clean and simple offer',
    closer: 'One swap. Done.',
  },
  THE_WILDCARD: {
    opener: "Here's the breakdown",
    closer: 'Make the call.',
  },
};

// ─── DMP-aware Counter to Win strategy ───────────────────────────────────────
// Each archetype/label configuration drives a different ask.

interface WinStrategy {
  /** Asset to drop from your send side (or null to keep all). */
  dropFromOffer: TREAsset | null;
  /** Extra asset to request from opponent. */
  extraRequest: TREAsset | null;
  /** Explanation of the strategy angle. */
  angle: string;
}

function deriveWinStrategy(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  bviMap: Map<string, BVIDelta>,
  dmp: DMPProfile | null,
  ktcGap: number,  // negative = you're losing value
): WinStrategy {
  const labels: Partial<DMPLabels> = dmp?.labels ?? {};
  const title: DMPTitle = dmp?.title ?? 'THE_WILDCARD';

  const gapAbs = Math.abs(ktcGap);
  const pickKtc = Math.round(Math.max(500, Math.min(gapAbs, 3000)) / 100) * 100;

  const midPick: TREAsset = { player_id: 'pick_mid', name: 'Mid-Round Pick', position: 'PICK', ktc_value: pickKtc };
  const firstPick: TREAsset = { player_id: 'pick_1st', name: '1st-Round Pick', position: 'PICK', ktc_value: 4500 };

  // Asset you're most overvalued sending (highest BVI delta = shouldn't be moving)
  const sortedOut = [...assetsOut].sort((a, b) => {
    const da = bviMap.get(a.player_id)?.delta ?? 0;
    const db = bviMap.get(b.player_id)?.delta ?? 0;
    return db - da; // highest BVI-delta first — most undervalued, don't send
  });
  const mostUndervaluedOut = sortedOut[0] ?? null;

  // GHOST: keep it simple — one clean swap, no picks
  if (title === 'THE_GHOST') {
    const lowestOut = [...assetsOut].sort(
      (a, b) => (a.ktc_value ?? 0) - (b.ktc_value ?? 0),
    )[0] ?? null;
    return {
      dropFromOffer: lowestOut,
      extraRequest: null,
      angle: 'Stripped to the simplest possible version — one asset swap.',
    };
  }

  // SHARK: tight counter — don't over-ask, just fix the gap with precision
  if (title === 'THE_SHARK') {
    return {
      dropFromOffer: null,
      extraRequest: midPick,
      angle: `Precise ask — a pick closes the exact BVI gap without giving them room to walk.`,
    };
  }

  // PANIC SELLER (panic_score > 65): they're motivated → ask for more picks
  const panicScore = (labels.panic_score ?? 0);
  if (panicScore > 65) {
    return {
      dropFromOffer: null,
      extraRequest: firstPick,
      angle: `They're eager to deal right now — ask for a 1st-round pick while the window is open.`,
    };
  }

  // WIN NOW / CONTENDER: offer youth + picks (they want veterans now)
  if (title === 'THE_CONTENDER' || (labels.win_now_index ?? 0) > 70) {
    // Find youngest outgoing asset to swap out and offer youth instead
    const youngestOut = [...assetsOut].sort((a, b) => (a.age ?? 26) - (b.age ?? 26))[0];
    return {
      dropFromOffer: youngestOut ?? null,
      extraRequest: midPick,
      angle: `They want proven assets now — add a pick and swap the youth out of your send for more veteran appeal.`,
    };
  }

  // ARCHITECT / PROPHET: they value draft capital → offer pick to sweeten
  if (title === 'THE_ARCHITECT' || title === 'THE_PROPHET') {
    return {
      dropFromOffer: mostUndervaluedOut,
      extraRequest: null,
      angle: `Remove your most BVI-undervalued asset from the offer — they'll recognize you're keeping real value.`,
    };
  }

  // Default: remove the most undervalued outgoing asset or request a pick
  if (mostUndervaluedOut && (bviMap.get(mostUndervaluedOut.player_id)?.delta ?? 0) > 500) {
    return {
      dropFromOffer: mostUndervaluedOut,
      extraRequest: null,
      angle: `${mostUndervaluedOut.name} is significantly undervalued by KTC — pull them from the offer.`,
    };
  }
  return {
    dropFromOffer: null,
    extraRequest: midPick,
    angle: `Ask for a pick to close the value gap.`,
  };
}

// ─── Response builders ────────────────────────────────────────────────────────

function buildCounterToWin(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  bviMap: Map<string, BVIDelta>,
  dmp: DMPProfile | null,
  treResult: TREResult,
): CounterOffer {
  const hook = dmp ? ARCHETYPE_HOOK[dmp.title] : ARCHETYPE_HOOK.THE_WILDCARD;
  const ktcGap = treResult.score_them - treResult.score_you; // normalized gap
  const strategy = deriveWinStrategy(assetsOut, assetsIn, bviMap, dmp, ktcGap);

  // Build modified offer
  const newOffer = strategy.dropFromOffer
    ? assetsOut.filter((a) => a.player_id !== strategy.dropFromOffer!.player_id)
    : [...assetsOut];

  const newReturn = strategy.extraRequest
    ? [...assetsIn, strategy.extraRequest]
    : [...assetsIn];

  const dropStr = strategy.dropFromOffer ? `dropping ${strategy.dropFromOffer.name} from your side` : null;
  const addStr = strategy.extraRequest ? `asking for a ${strategy.extraRequest.name}` : null;
  const adjustStr = [dropStr, addStr].filter(Boolean).join(' and ');
  const adjustment = adjustStr ? `By ${adjustStr}` : 'By tightening the structure';

  const inNames = assetsIn.map((a) => a.name).join(' + ');
  const reasoning =
    `${hook.opener} — ${strategy.angle} ${adjustment}, you land ${inNames} in a deal that now favors your side. ${hook.closer}`;

  const confidence = Math.min(90, 55 + (treResult.trade_score > 50 ? 15 : 0) + (dmp ? 10 : 0));

  return {
    strategy: 'COUNTER_TO_WIN',
    headline: 'Counter to Win',
    offer_assets: newOffer,
    return_assets: newReturn,
    reasoning,
    confidence,
  };
}

function buildCounterToAccept(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  bviMap: Map<string, BVIDelta>,
  dmp: DMPProfile | null,
  treResult: TREResult,
): CounterOffer {
  const hook = dmp ? ARCHETYPE_HOOK[dmp.title] : ARCHETYPE_HOOK.THE_WILDCARD;

  // Find the lowest-value incoming asset — ask for a slight upgrade or pick add
  const sortedIn = [...assetsIn].sort((a, b) => (a.ktc_value ?? 0) - (b.ktc_value ?? 0));
  const lowestIn = sortedIn[0];

  const gapKtc = assetsOut.reduce((s, a) => s + (a.ktc_value ?? 0), 0) -
                 assetsIn.reduce((s, a) => s + (a.ktc_value ?? 0), 0);
  const pickKtc = Math.round(Math.max(500, Math.min(gapKtc, 2500)) / 100) * 100;
  const pickAsk: TREAsset = {
    player_id: 'pick_mid',
    name: gapKtc > 2000 ? '1st-Round Pick' : 'Mid-Round Pick',
    position: 'PICK',
    ktc_value: pickKtc,
  };

  const returnWithPick = [...assetsIn, pickAsk];
  const inNames = assetsIn.map((a) => a.name).join(' + ');
  const tweakStr = lowestIn
    ? `swapping ${lowestIn.name} for a pick addition`
    : 'a small pick addition';

  const reasoning =
    `${hook.opener} — ${inNames} is a solid return and I'm close to accepting. ` +
    `One small tweak — ${tweakStr} gets this over the line. ${hook.closer}`;

  const note =
    "I like this deal — this small tweak works better for my roster, but open to your original if you'd prefer.";

  return {
    strategy: 'COUNTER_TO_ACCEPT',
    headline: 'Counter to Accept',
    offer_assets: assetsOut,
    return_assets: returnWithPick,
    reasoning,
    note,
    confidence: treResult.verdict === 'WIN' ? 75 : 62,
  };
}

function buildAcceptAsIs(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  bviMap: Map<string, BVIDelta>,
  dmp: DMPProfile | null,
  treResult: TREResult,
): CounterOffer {
  const hook = dmp ? ARCHETYPE_HOOK[dmp.title] : ARCHETYPE_HOOK.THE_WILDCARD;

  const inNames = assetsIn.map((a) => a.name).join(' + ');
  const outNames = assetsOut.map((a) => a.name).join(' + ');

  // Find the key advantage to highlight in the reasoning
  const bviWinners = assetsIn
    .filter((a) => (bviMap.get(a.player_id)?.delta ?? 0) > 300)
    .map((a) => a.name);

  const bviHighlight =
    bviWinners.length
      ? ` ${bviWinners[0]} is market-undervalued by BVI — you're getting more than KTC shows.`
      : '';

  const reasoning =
    treResult.verdict === 'WIN'
      ? `${hook.opener} — ${inNames} for ${outNames} already tilts in your favor.${bviHighlight} TAKE IT.`
      : `${hook.opener} — ${inNames} for ${outNames} is roughly fair value. If it fills a roster need, accepting makes sense. ${hook.closer}`;

  const confidence = treResult.verdict === 'WIN' ? 88 : 58;

  return {
    strategy: 'ACCEPT_AS_IS',
    headline: 'Accept As-Is',
    offer_assets: assetsOut,
    return_assets: assetsIn,
    reasoning,
    confidence,
  };
}

// ─── Main export: generateCounters ────────────────────────────────────────────

/**
 * Generates 3 smart counter responses for an incoming trade offer.
 *
 * @param incomingOffer  - TREOffer with assets_in (you receive) + assets_out (you send)
 * @param leagueId       - Sleeper league ID for context
 * @param ownerId        - Auth user ID of the player evaluating the offer
 * @param opponentSleeperUserId - Optional Sleeper user_id of the trade partner (for DMP lookup)
 */
export async function generateCounters(
  incomingOffer: TREOffer,
  leagueId: string,
  ownerId: string,
  opponentSleeperUserId?: string,
): Promise<SmartCounterResult> {
  const { assets_in, assets_out } = incomingOffer;

  const allPlayerIds = [...assets_in, ...assets_out]
    .map((a) => a.player_id)
    .filter((id) => !id.startsWith('pick_'));

  // Parallel: TRE analysis + BVI delta lookup + opponent DMP
  const [treResult, bviMap, opponentDmp] = await Promise.all([
    analyzeTrade(incomingOffer, leagueId, ownerId),
    loadBVIDeltas(allPlayerIds),
    opponentSleeperUserId ? getDMP(opponentSleeperUserId, leagueId) : Promise.resolve(null),
  ]);

  const dmp: DMPProfile | null = opponentDmp;

  // Counter to Win: always generated
  const counterToWin = buildCounterToWin(assets_out, assets_in, bviMap, dmp, treResult);

  // Counter to Accept: only for EVEN or WIN
  const counterToAccept =
    treResult.verdict === 'LOSS'
      ? {
          strategy: 'COUNTER_TO_ACCEPT' as CounterStrategy,
          headline: 'Counter to Accept',
          offer_assets: assets_out,
          return_assets: assets_in,
          reasoning: `This offer doesn't meet fair value — counter to win or walk away. Accepting as-is gives up too much.`,
          confidence: 20,
        }
      : buildCounterToAccept(assets_out, assets_in, bviMap, dmp, treResult);

  // Accept As-Is: only for WIN (if EVEN or LOSS, shown greyed/disabled)
  const acceptAsIs =
    treResult.verdict === 'LOSS'
      ? {
          strategy: 'ACCEPT_AS_IS' as CounterStrategy,
          headline: 'Accept As-Is',
          offer_assets: assets_out,
          return_assets: assets_in,
          reasoning: `This deal favors your trade partner. Accepting without a counter leaves value on the table.`,
          confidence: 15,
        }
      : buildAcceptAsIs(assets_out, assets_in, bviMap, dmp, treResult);

  return {
    opponent_archetype: dmp?.title ?? null,
    tre_result: treResult,
    counters: [counterToWin, counterToAccept, acceptAsIs],
  };
}

// ─── Legacy alias (backward compat) ───────────────────────────────────────────

export interface SmartCounterInput {
  league_id: string;
  owner_id: string;
  opponent_sleeper_id: string;
  assets_out: TREAsset[];
  assets_in: TREAsset[];
  ktc_gap: number;
  tre_verdict: 'WIN' | 'EVEN' | 'LOSS';
}

/** @deprecated Use generateCounters(offer, leagueId, ownerId, opponentSleeperUserId) */
export async function generateSmartCounter(
  input: SmartCounterInput,
): Promise<SmartCounterResult> {
  return generateCounters(
    { assets_in: input.assets_in, assets_out: input.assets_out },
    input.league_id,
    input.owner_id,
    input.opponent_sleeper_id,
  );
}
