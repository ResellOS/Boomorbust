/**
 * Smart Counter engine — generates 3 tailored counter-offer responses
 * for a dynasty trade, personalized to the opponent's DMP archetype.
 *
 * Responses: Counter to Win | Counter to Accept | Accept As-Is
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getDMPProfile } from '@/lib/dmp/engine';
import type { DMPTitle } from '@/lib/dmp/engine';
import type { TREAsset } from '@/lib/tre/engine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CounterStrategy = 'COUNTER_TO_WIN' | 'COUNTER_TO_ACCEPT' | 'ACCEPT_AS_IS';

export interface CounterResponse {
  strategy: CounterStrategy;
  headline: string;
  message: string;
  /** Assets to add to your send-side to sweeten the deal (Counter to Accept). */
  add_to_offer: TREAsset[];
  /** Assets to remove from your send-side (Counter to Win). */
  remove_from_offer: TREAsset[];
  /** Requested add-on from the opponent. */
  request_from_opponent: TREAsset[];
  confidence: number;
}

export interface SmartCounterInput {
  league_id: string;
  /** The user doing the evaluation. */
  owner_id: string;
  /** Sleeper user ID of the trade partner. */
  opponent_sleeper_id: string;
  /** Assets your team would send. */
  assets_out: TREAsset[];
  /** Assets your team would receive. */
  assets_in: TREAsset[];
  /** KTC deficit (negative = you're getting less value). */
  ktc_gap: number;
  /** TRE verdict from trade analyzer. */
  tre_verdict: 'WIN' | 'EVEN' | 'LOSS';
}

export interface SmartCounterResult {
  opponent_archetype: DMPTitle | null;
  responses: [CounterResponse, CounterResponse, CounterResponse];
}

// ─── Archetype-aware messaging ────────────────────────────────────────────────

const ARCHETYPE_HOOK: Record<DMPTitle, { opener: string; closer: string }> = {
  THE_ARCHITECT: {
    opener: 'You run a tight operation',
    closer: 'This keeps both sides in the green.',
  },
  THE_SHARK: {
    opener: "You're always hunting value",
    closer: "Here's a deal worth biting on.",
  },
  THE_GAMBLER: {
    opener: 'High risk, high reward',
    closer: "Roll the dice on this one — it's in your favor.",
  },
  THE_PROFESSOR: {
    opener: 'The numbers tell the story',
    closer: 'This is supported by the data.',
  },
  THE_HUSTLER: {
    opener: "You're always moving",
    closer: "Let's keep the deal moving.",
  },
  THE_LOYALIST: {
    opener: 'You build for the long haul',
    closer: 'This fits your long-term vision.',
  },
  THE_PROPHET: {
    opener: 'You see value before others do',
    closer: "You'll be ahead of the market on this.",
  },
  THE_CONTENDER: {
    opener: "You're chasing a title",
    closer: 'This pushes your window forward.',
  },
  THE_GHOST: {
    opener: 'You manage a quiet powerhouse',
    closer: 'Low noise, high return.',
  },
  THE_WILDCARD: {
    opener: "No one knows what you'll do next",
    closer: "Keep them guessing — this works.",
  },
};

// ─── Response builders ────────────────────────────────────────────────────────

function buildCounterToWin(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  ktcGap: number,
  hook: { opener: string; closer: string },
): CounterResponse {
  // Remove the lowest-value asset from send-side
  const sorted = [...assetsOut].sort((a, b) => (a.ktc_value ?? 0) - (b.ktc_value ?? 0));
  const remove = sorted.slice(0, 1);
  const keepOut = sorted.slice(1);

  const removeNames = remove.map(a => a.name).join(' + ');
  const inNames = assetsIn.map(a => a.name).join(' + ');

  return {
    strategy: 'COUNTER_TO_WIN',
    headline: 'Counter to Win',
    message:
      `${hook.opener} — pull ${removeNames} from the offer and keep ${inNames}. ` +
      `This closes the ~${Math.abs(ktcGap)} KTC gap while keeping your side lean. ${hook.closer}`,
    add_to_offer: [],
    remove_from_offer: remove,
    request_from_opponent: [],
    confidence: Math.min(90, 60 + Math.round(Math.abs(ktcGap) / 100)),
  };
}

function buildCounterToAccept(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  ktcGap: number,
  hook: { opener: string; closer: string },
): CounterResponse {
  const inNames = assetsIn.map(a => a.name).join(' + ');
  const outNames = assetsOut.map(a => a.name).join(' + ');
  const gapRounded = Math.round(Math.abs(ktcGap) / 100) * 100;
  const pickAsk: TREAsset = {
    player_id: 'pick_mid',
    name: 'Mid-Round Pick',
    position: 'PICK',
    ktc_value: gapRounded,
  };

  return {
    strategy: 'COUNTER_TO_ACCEPT',
    headline: 'Counter to Accept',
    message:
      `${hook.opener} — keep the ${inNames} for ${outNames} structure, but ask for a ` +
      `mid-round pick (~${gapRounded} KTC) to close the gap. ${hook.closer}`,
    add_to_offer: [],
    remove_from_offer: [],
    request_from_opponent: [pickAsk],
    confidence: 70,
  };
}

function buildAcceptAsIs(
  assetsOut: TREAsset[],
  assetsIn: TREAsset[],
  treVerdict: 'WIN' | 'EVEN' | 'LOSS',
  hook: { opener: string; closer: string },
): CounterResponse {
  const inNames = assetsIn.map(a => a.name).join(' + ');
  const outNames = assetsOut.map(a => a.name).join(' + ');

  const confidence = treVerdict === 'WIN' ? 85 : treVerdict === 'EVEN' ? 55 : 30;

  const msg =
    treVerdict === 'WIN'
      ? `${hook.opener} — ${inNames} for ${outNames} is already in your favor. Accept as-is. ${hook.closer}`
      : treVerdict === 'EVEN'
        ? `${hook.opener} — ${inNames} for ${outNames} is roughly fair. Accepting makes sense if it fills a roster need. ${hook.closer}`
        : `${hook.opener} — ${inNames} for ${outNames} slightly favors your partner, but if fit matters more than raw value, this is defensible. ${hook.closer}`;

  return {
    strategy: 'ACCEPT_AS_IS',
    headline: 'Accept As-Is',
    message: msg,
    add_to_offer: [],
    remove_from_offer: [],
    request_from_opponent: [],
    confidence,
  };
}

// ─── Main: generateSmartCounter ───────────────────────────────────────────────

export async function generateSmartCounter(
  input: SmartCounterInput,
): Promise<SmartCounterResult> {
  const { league_id, opponent_sleeper_id, assets_out, assets_in, ktc_gap, tre_verdict } = input;
  const supabase = createAdminClient();

  // Resolve opponent's Supabase user ID from Sleeper ID
  const { data: opponentProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('sleeper_user_id', opponent_sleeper_id)
    .maybeSingle();

  const opponentUserId = (opponentProfile as { id?: string } | null)?.id ?? null;

  let opponentArchetype: DMPTitle | null = null;
  if (opponentUserId) {
    const dmp = await getDMPProfile(opponentUserId, league_id);
    opponentArchetype = dmp?.title ?? null;
  }

  const hook = opponentArchetype
    ? ARCHETYPE_HOOK[opponentArchetype]
    : { opener: "Here's the breakdown", closer: 'Make the call.' };

  const responses: [CounterResponse, CounterResponse, CounterResponse] = [
    buildCounterToWin(assets_out, assets_in, ktc_gap, hook),
    buildCounterToAccept(assets_out, assets_in, ktc_gap, hook),
    buildAcceptAsIs(assets_out, assets_in, tre_verdict, hook),
  ];

  return {
    opponent_archetype: opponentArchetype,
    responses,
  };
}
