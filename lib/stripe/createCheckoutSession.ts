import Stripe from 'stripe';

export type CheckoutTier = 'pro' | 'elite' | 'all_pro_terminal';
export type CheckoutInterval = 'month' | 'year';

function resolvePriceId(tier: CheckoutTier, interval: CheckoutInterval): string | null {
  const e = process.env;
  if (tier === 'pro' && interval === 'month') {
    return e.STRIPE_PRICE_PRO_MONTHLY ?? e.STRIPE_PRO_PRICE_ID ?? null;
  }
  if (tier === 'pro' && interval === 'year') {
    return e.STRIPE_PRICE_PRO_YEARLY ?? null;
  }
  if (tier === 'elite' && interval === 'month') {
    return e.STRIPE_PRICE_ELITE_MONTHLY ?? e.STRIPE_ELITE_PRICE_ID ?? null;
  }
  if (tier === 'elite' && interval === 'year') {
    return e.STRIPE_PRICE_ELITE_YEARLY ?? null;
  }
  if (tier === 'all_pro_terminal') {
    return e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID ?? null;
  }
  return null;
}

function tierMetadata(tier: CheckoutTier): string {
  if (tier === 'elite') return 'elite';
  if (tier === 'all_pro_terminal') return 'all_pro_terminal';
  return 'pro';
}

export async function createCheckoutSession(params: {
  userId: string;
  email: string | null | undefined;
  tier: CheckoutTier;
  interval: CheckoutInterval;
  successPath?: string;
  cancelPath?: string;
}): Promise<{ url: string | null; error?: string }> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const price = resolvePriceId(params.tier, params.interval);
  if (!price) {
    return { url: null, error: 'Stripe price is not configured' };
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const tierMeta = tierMetadata(params.tier);
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}${params.successPath ?? '/dashboard?subscribed=1'}`,
    cancel_url: `${site}${params.cancelPath ?? '/settings'}`,
    customer_email: params.email ?? undefined,
    metadata: { user_id: params.userId, subscription_tier: tierMeta },
    subscription_data: {
      metadata: { user_id: params.userId, subscription_tier: tierMeta },
    },
  });

  return { url: session.url };
}

/** Fallback All-Pro price (matches STRIPE_ALL_PRO_TERMINAL_PRICE_ID in env when set). */
export const ALL_PRO_CHECKOUT_PRICE_FALLBACK = 'price_1TW56R2LZpvKsObZirbiLgDa';

export function resolveLandingCheckoutPriceId(plan: 'rookie' | 'veteran' | 'allpro'): string | null {
  const e = process.env;
  if (plan === 'rookie') {
    return e.STRIPE_ROOKIE_PRICE_ID ?? e.STRIPE_PRICE_PRO_MONTHLY ?? e.STRIPE_PRO_PRICE_ID ?? null;
  }
  if (plan === 'veteran') {
    return e.STRIPE_VETERAN_PRICE_ID ?? e.STRIPE_PRICE_ELITE_MONTHLY ?? e.STRIPE_ELITE_PRICE_ID ?? null;
  }
  return e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID ?? ALL_PRO_CHECKOUT_PRICE_FALLBACK;
}

export function subscriptionTierForLandingPriceId(priceId: string): 'pro' | 'elite' | 'all_pro_terminal' {
  const e = process.env;
  const allPro = new Set(
    [e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID, ALL_PRO_CHECKOUT_PRICE_FALLBACK].filter(Boolean) as string[]
  );
  if (allPro.has(priceId)) return 'all_pro_terminal';
  const elite = new Set(
    [e.STRIPE_VETERAN_PRICE_ID, e.STRIPE_PRICE_ELITE_MONTHLY, e.STRIPE_ELITE_PRICE_ID].filter(Boolean) as string[]
  );
  if (elite.has(priceId)) return 'elite';
  return 'pro';
}

/** Price IDs allowed for POST /api/stripe/checkout (landing + existing env). */
export function listLandingCheckoutPriceIds(): string[] {
  const e = process.env;
  return [
    e.STRIPE_ROOKIE_PRICE_ID,
    e.STRIPE_PRICE_PRO_MONTHLY,
    e.STRIPE_PRO_PRICE_ID,
    e.STRIPE_VETERAN_PRICE_ID,
    e.STRIPE_PRICE_ELITE_MONTHLY,
    e.STRIPE_ELITE_PRICE_ID,
    e.STRIPE_ALL_PRO_TERMINAL_PRICE_ID,
    ALL_PRO_CHECKOUT_PRICE_FALLBACK,
  ].filter((x): x is string => !!x);
}

export async function createCheckoutSessionFromPriceId(params: {
  userId: string;
  email: string | null | undefined;
  priceId: string;
  subscriptionTier: 'pro' | 'elite' | 'all_pro_terminal';
  successPath?: string;
  cancelPath?: string;
}): Promise<{ url: string | null; error?: string }> {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const tierMeta =
    params.subscriptionTier === 'elite'
      ? 'elite'
      : params.subscriptionTier === 'all_pro_terminal'
        ? 'all_pro_terminal'
        : 'pro';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: `${site}${params.successPath ?? '/dashboard?subscribed=1'}`,
    cancel_url: `${site}${params.cancelPath ?? '/?checkout=cancel#pricing'}`,
    customer_email: params.email ?? undefined,
    metadata: { user_id: params.userId, subscription_tier: tierMeta },
    subscription_data: {
      metadata: { user_id: params.userId, subscription_tier: tierMeta },
    },
  });

  return { url: session.url };
}
