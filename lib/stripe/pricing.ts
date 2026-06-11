import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

export type BillingInterval = 'month' | 'year';
export type PaidTierId = 'league_analyst' | 'general_manager' | 'all_pro';
export type DisplayTierId = 'free' | PaidTierId;

export const ALL_PRO_PRICE_ID = 'price_1TW56R2LZpvKsObZirbiLgDa';

export function foundingSignupsCount(): number {
  if (process.env.FOUNDING_SIGNUPS_COUNT) {
    const n = parseInt(process.env.FOUNDING_SIGNUPS_COUNT, 10);
    if (!Number.isNaN(n)) return n;
  }
  if (process.env.FOUNDING_SPOTS_REMAINING) {
    const remaining = parseInt(process.env.FOUNDING_SPOTS_REMAINING, 10);
    if (!Number.isNaN(remaining)) return Math.max(0, 100 - remaining);
  }
  return 27;
}

export function foundingSpotsRemaining(): number {
  if (process.env.FOUNDING_SPOTS_REMAINING) {
    const n = parseInt(process.env.FOUNDING_SPOTS_REMAINING, 10);
    if (!Number.isNaN(n)) return n;
  }
  const count = foundingSignupsCount();
  if (count < 100) return 100 - count;
  if (count < 500) return 500 - count;
  return 0;
}

export function earlyAccessTier(): 'founding' | 'early' | 'launch' {
  const count = foundingSignupsCount();
  if (count < 100) return 'founding';
  if (count < 500) return 'early';
  return 'launch';
}

export function couponIdForSignupCount(count: number): string | null {
  if (count < 100) return process.env.STRIPE_COUPON_FOUNDING_50 ?? null;
  if (count < 500) return process.env.STRIPE_COUPON_EARLY_25 ?? null;
  return null;
}

export function trialDaysForTier(tier: PaidTierId): number | undefined {
  if (tier === 'all_pro') return 3;
  return 7;
}

export function displayTierFromDb(raw: string | null | undefined): DisplayTierId {
  const r = (raw ?? 'free').toLowerCase();
  if (r === 'all_pro' || r === 'all_pro_terminal') return 'all_pro';
  if (r === 'general_manager' || r === 'elite' || r === 'veteran') return 'general_manager';
  if (r === 'league_analyst' || r === 'pro' || r === 'rookie') return 'league_analyst';
  return 'free';
}

export function tierFromPriceId(priceId: string): PaidTierId | null {
  const e = process.env;
  const analystMonthly = new Set(
    [e.STRIPE_LEAGUE_ANALYST_PRICE_ID, e.STRIPE_PRO_PRICE_ID, e.STRIPE_PRICE_PRO_MONTHLY].filter(Boolean),
  );
  const analystAnnual = new Set([e.STRIPE_LEAGUE_ANALYST_ANNUAL_PRICE_ID].filter(Boolean));
  const gmMonthly = new Set(
    [e.STRIPE_GENERAL_MANAGER_PRICE_ID, e.STRIPE_ELITE_PRICE_ID, e.STRIPE_PRICE_ELITE_MONTHLY].filter(Boolean),
  );
  const gmAnnual = new Set([e.STRIPE_GENERAL_MANAGER_ANNUAL_PRICE_ID].filter(Boolean));
  const allPro = new Set(
    [e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID, ALL_PRO_PRICE_ID, e.STRIPE_ALL_PRO_ANNUAL_PRICE_ID].filter(Boolean),
  );

  if (analystMonthly.has(priceId) || analystAnnual.has(priceId)) return 'league_analyst';
  if (gmMonthly.has(priceId) || gmAnnual.has(priceId)) return 'general_manager';
  if (allPro.has(priceId)) return 'all_pro';
  return null;
}

export function resolvePriceId(tier: PaidTierId, interval: BillingInterval): string | null {
  const e = process.env;
  if (tier === 'league_analyst') {
    if (interval === 'year') return e.STRIPE_LEAGUE_ANALYST_ANNUAL_PRICE_ID ?? null;
    return e.STRIPE_LEAGUE_ANALYST_PRICE_ID ?? e.STRIPE_PRO_PRICE_ID ?? null;
  }
  if (tier === 'general_manager') {
    if (interval === 'year') return e.STRIPE_GENERAL_MANAGER_ANNUAL_PRICE_ID ?? null;
    return e.STRIPE_GENERAL_MANAGER_PRICE_ID ?? e.STRIPE_ELITE_PRICE_ID ?? null;
  }
  if (interval === 'year') return e.STRIPE_ALL_PRO_ANNUAL_PRICE_ID ?? null;
  return e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID ?? ALL_PRO_PRICE_ID;
}

export function listAllowedPriceIds(): string[] {
  const tiers: PaidTierId[] = ['league_analyst', 'general_manager', 'all_pro'];
  const ids: string[] = [];
  for (const tier of tiers) {
    const m = resolvePriceId(tier, 'month');
    const y = resolvePriceId(tier, 'year');
    if (m) ids.push(m);
    if (y) ids.push(y);
  }
  return Array.from(new Set(ids));
}

export function priceIdForTier(tier: PaidTierId, interval: BillingInterval): string | null {
  return resolvePriceId(tier, interval);
}

export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string | null | undefined;
}): Promise<{ customerId: string | null; error?: string }> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[stripe] admin client failed:', err);
    return { customerId: null, error: 'Server configuration error' };
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', params.userId)
    .maybeSingle();

  if (profileErr) {
    console.error('[stripe] profile lookup failed:', profileErr);
    return { customerId: null, error: 'Profile lookup failed' };
  }

  if (profile?.stripe_customer_id) {
    return { customerId: profile.stripe_customer_id };
  }

  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    metadata: { user_id: params.userId },
  });

  const { error: updateErr } = await supabase
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', params.userId);

  if (updateErr) {
    console.error('[stripe] save customer id failed:', updateErr);
  }

  return { customerId: customer.id };
}

export async function createPricingCheckoutSession(params: {
  userId: string;
  email: string | null | undefined;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string | null; error?: string }> {
  const tier = tierFromPriceId(params.priceId);
  if (!tier) {
    return { url: null, error: 'Invalid price' };
  }

  const allowed = new Set(listAllowedPriceIds());
  if (!allowed.has(params.priceId)) {
    return { url: null, error: 'Invalid price' };
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const { customerId, error: custErr } = await getOrCreateStripeCustomer({
    userId: params.userId,
    email: params.email,
  });
  if (custErr || !customerId) {
    return { url: null, error: custErr ?? 'Could not create customer' };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const signupCount = foundingSignupsCount();
  const coupon = couponIdForSignupCount(signupCount);
  const trialDays = trialDaysForTier(tier);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl.startsWith('http') ? params.successUrl : `${site}${params.successUrl}`,
    cancel_url: params.cancelUrl.startsWith('http') ? params.cancelUrl : `${site}${params.cancelUrl}`,
    ...(coupon ? { discounts: [{ coupon }] } : {}),
    metadata: { user_id: params.userId, subscription_tier: tier },
    subscription_data: {
      trial_period_days: trialDays,
      metadata: { user_id: params.userId, subscription_tier: tier },
    },
  });

  return { url: session.url };
}
