import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  createCheckoutSession,
  createCheckoutSessionFromPriceId,
  listLandingCheckoutPriceIds,
  resolveLandingCheckoutPriceId,
  subscriptionTierForLandingPriceId,
  type CheckoutInterval,
  type CheckoutTier,
} from '@/lib/stripe/createCheckoutSession';

type Body = {
  priceId?: string;
  plan?: string;
  tier?: string;
  interval?: string;
};

/**
 * Landing + legacy checkout.
 * - Body `{ plan: 'rookie' | 'veteran' | 'allpro' }` resolves Stripe price from env (All-Pro falls back to canonical price id).
 * - Body `{ priceId }` allowed only if the id is in the configured allowlist (same env set).
 * - Legacy: `{ tier, interval }` or empty body → existing tier checkout.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  const planRaw = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
  const priceFromClient = typeof body.priceId === 'string' ? body.priceId.trim() : '';

  let priceId: string | null = null;
  if (planRaw === 'rookie' || planRaw === 'veteran' || planRaw === 'allpro') {
    priceId = resolveLandingCheckoutPriceId(planRaw);
    if (!priceId) {
      return NextResponse.json({ error: 'Checkout is not configured for this plan' }, { status: 400 });
    }
  } else if (priceFromClient) {
    priceId = priceFromClient;
  }

  const allowed = new Set(listLandingCheckoutPriceIds());
  if (priceId && allowed.has(priceId)) {
    const subscriptionTier = subscriptionTierForLandingPriceId(priceId);
    const { url, error } = await createCheckoutSessionFromPriceId({
      userId: user.id,
      email: user.email,
      priceId,
      subscriptionTier,
    });
    if (error || !url) {
      return NextResponse.json({ error: error ?? 'Could not create session' }, { status: 400 });
    }
    return NextResponse.json({ url });
  }

  if (priceFromClient && !allowed.has(priceFromClient)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }

  let tier: CheckoutTier = 'pro';
  let interval: CheckoutInterval = 'month';
  if (body?.tier === 'elite' || body?.tier === 'pro' || body?.tier === 'all_pro_terminal') tier = body.tier;
  if (body?.interval === 'year' || body?.interval === 'month') interval = body.interval;

  const { url, error } = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    tier,
    interval,
  });

  if (error || !url) {
    return NextResponse.json({ error: error ?? 'Could not create session' }, { status: 400 });
  }

  return NextResponse.json({ url });
}
