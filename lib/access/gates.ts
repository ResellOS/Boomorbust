/**
 * Tier gate enforcement.
 *
 * Tiers: free | rookie ($5) | veteran ($10) | all_pro_terminal ($20)
 *
 * Feature gates:
 *   smart_counter      → veteran+
 *   blueprint          → veteran+
 *   proactive_trades   → all_pro_terminal
 *   mrs_scores         → rookie+
 *   bvi_scores         → rookie+
 *   dmp_profiles       → veteran+
 *   tre_suggestions    → veteran+
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'elite' | 'all_pro_terminal';

/**
 * Normalizes any DB subscription_tier value to the canonical internal tier.
 * Handles both old Stripe-written format ('pro','elite','all_pro_terminal')
 * and manually-set uppercase format ('ROOKIE','VETERAN','ALL_PRO').
 */
export function normalizeTier(
  raw: string | null | undefined,
  isPaidFallback?: boolean,
): SubscriptionTier {
  if (raw) {
    const r = raw.toLowerCase();
    if (r === 'all_pro_terminal' || r === 'all_pro') return 'all_pro_terminal';
    if (r === 'elite' || r === 'veteran') return 'elite';
    if (r === 'pro' || r === 'rookie') return 'pro';
  }
  return isPaidFallback ? 'pro' : 'free';
}

export type GatedFeature =
  | 'smart_counter'
  | 'blueprint'
  | 'proactive_trades'
  | 'mrs_scores'
  | 'bvi_scores'
  | 'dmp_profiles'
  | 'tre_suggestions';

// ─── Feature → minimum tier ───────────────────────────────────────────────────

const FEATURE_REQUIREMENTS: Record<GatedFeature, SubscriptionTier[]> = {
  mrs_scores: ['pro', 'elite', 'all_pro_terminal'],
  bvi_scores: ['pro', 'elite', 'all_pro_terminal'],
  smart_counter: ['elite', 'all_pro_terminal'],
  blueprint: ['elite', 'all_pro_terminal'],
  dmp_profiles: ['elite', 'all_pro_terminal'],
  proactive_trades: ['all_pro_terminal'],
  tre_suggestions: ['elite', 'all_pro_terminal'],
};

// ─── Tier ordering ────────────────────────────────────────────────────────────

const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 1,
  elite: 2,
  all_pro_terminal: 3,
};

// ─── canAccess ────────────────────────────────────────────────────────────────

export function canAccess(tier: SubscriptionTier, feature: GatedFeature): boolean {
  const allowed = FEATURE_REQUIREMENTS[feature];
  return allowed.some(t => TIER_RANK[tier] >= TIER_RANK[t]);
}

// ─── getUserTier ──────────────────────────────────────────────────────────────

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const supabase = createClient();
  const { data } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle();

  const raw = (data as { subscription_tier?: string } | null)?.subscription_tier;
  return normalizeTier(raw);
}

// ─── requireFeature ──────────────────────────────────────────────────────────
// Convenience: resolves auth + tier check in one call.
// Returns null on success, or a NextResponse with 401/403 on failure.

export async function requireFeature(
  feature: GatedFeature,
): Promise<{ userId: string } | NextResponse> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tier = await getUserTier(user.id);

  if (!canAccess(tier, feature)) {
    return NextResponse.json(
      {
        error: 'upgrade_required',
        feature,
        upgrade_url: '/pricing',
      },
      { status: 403 },
    );
  }

  return { userId: user.id };
}
