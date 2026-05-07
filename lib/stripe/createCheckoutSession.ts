import Stripe from 'stripe';

export type CheckoutTier = 'pro' | 'elite';
export type CheckoutInterval = 'month' | 'year';

/** Resolve Stripe Price ID — falls back to STRIPE_PRICE_ID for partial env setups */
function resolvePriceId(tier: CheckoutTier, interval: CheckoutInterval): string | null {
  const legacy = process.env.STRIPE_PRICE_ID;
  if (tier === 'pro' && interval === 'month') {
    return process.env.STRIPE_PRICE_PRO_MONTHLY ?? legacy ?? null;
  }
  if (tier === 'pro' && interval === 'year') {
    return process.env.STRIPE_PRICE_PRO_YEARLY ?? legacy ?? null;
  }
  if (tier === 'elite' && interval === 'month') {
    return process.env.STRIPE_PRICE_ELITE_MONTHLY ?? legacy ?? null;
  }
  if (tier === 'elite' && interval === 'year') {
    return process.env.STRIPE_PRICE_ELITE_YEARLY ?? legacy ?? null;
  }
  return legacy ?? null;
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
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}${params.successPath ?? '/dashboard?subscribed=1'}`,
    cancel_url: `${site}${params.cancelPath ?? '/dashboard/settings'}`,
    customer_email: params.email ?? undefined,
    metadata: {
      user_id: params.userId,
      subscription_tier: params.tier === 'elite' ? 'elite' : 'pro',
    },
    subscription_data: {
      metadata: {
        user_id: params.userId,
        subscription_tier: params.tier === 'elite' ? 'elite' : 'pro',
      },
    },
  });

  return { url: session.url };
}
