import type { ConfidenceTierRow, ModelEvolutionEntry } from './types';

/** Locked win definitions — do not change after June 18, 2026. */
export const WIN_DEFINITIONS = [
  {
    title: 'Buy Now / Buy Window Hit',
    body: 'Player gains 10%+ KTC market value within 30 days of call (Buy Now) or 60 days (Buy Window). Miss = anything less than 10% gain.',
  },
  {
    title: 'Sell Now / Sell Window Hit',
    body: 'Player loses 10%+ KTC market value within 30 days of call (Sell Now) or 60 days (Sell Window). Miss = anything less than 10% loss.',
  },
  {
    title: 'Start Hit',
    body: 'Started player outscores the listed alternative in that week\'s scoring. Push = within 1 point either way. Miss = alternative scores higher.',
  },
] as const;

export const DEFINITIONS_SUBTITLE =
  'Locked June 18, 2026. Never changed retroactively.';

export const INVALIDATED_NOTE =
  'Invalidated calls (player injured before resolution) are excluded from the record and marked \'Invalidated\' in the feed. They never count as wins OR losses.';

export const EMPTY_TRACKER_MESSAGE =
  'No calls resolved yet. Season tracking begins Week 1. Every call will appear here — wins, losses, and invalidations.';

export const METHODOLOGY_POINTS = [
  {
    title: 'Opportunity',
    body: 'Target share, snap count, air yards — who actually gets the ball.',
  },
  {
    title: 'Scheme Fit',
    body: 'How the player fits their offensive system and role.',
  },
  {
    title: 'Trajectory',
    body: 'Year-over-year trend — rising or declining production.',
  },
  {
    title: 'Situation',
    body: 'Team context, game script, and weekly matchup.',
  },
  {
    title: 'Self-correction',
    body: 'Every outcome feeds back into the model.',
  },
] as const;

export const METHODOLOGY_CLOSING =
  'BOB doesn\'t claim to be perfect. It claims to be honest, documented, and improving.';

export const CONFIDENCE_TIER_META: Omit<ConfidenceTierRow, 'calls' | 'accuracy'>[] = [
  { tier: 'Smash', label: 'Smash', range: '71%+' },
  { tier: 'Strong', label: 'Strong', range: '62–70' },
  { tier: 'Lean', label: 'Lean', range: '55–61' },
];

export const SEED_MODEL_TIMELINE: ModelEvolutionEntry[] = [
  {
    date: 'June 2026',
    title: 'Engine launched',
    detail: '537 players scored · Confidence tiers validated',
    accuracyBefore: null,
    accuracyAfter: null,
  },
];

export const HERO_SUBTITLE =
  'Every prediction. Every result. No deleted misses. No cherry-picking.';

export const HERO_MUTED =
  'Season tracking begins Week 1, 2026. Every call logged automatically from that moment forward — wins and losses.';
