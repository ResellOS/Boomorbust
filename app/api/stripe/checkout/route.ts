import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPricingCheckoutSession } from '@/lib/stripe/pricing';
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
  successUrl?: string;
  cancelUrl?: string;
};

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

  const successPath = body.successUrl ?? '/dashboard?upgraded=true';
  const cancelPath = body.cancelUrl ?? '/pricing';
  const priceFromClient = typeof body.priceId === 'string' ? body.priceId.trim() : '';

  if (priceFromClient) {
    const { url, error } = await createPricingCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId: priceFromClient,
      successUrl: successPath,
      cancelUrl: cancelPath,
    });
    if (error || !url) {
      return NextResponse.json({ error: error ?? 'Could not create session' }, { status: 400 });
    }
    return NextResponse.json({ url });
  }

  const planRaw = typeof body.plan === 'string' ? body.plan.trim().toLowerCase() : '';
  let priceId: string | null = null;
  if (planRaw === 'rookie' || planRaw === 'veteran' || planRaw === 'allpro') {
    priceId = resolveLandingCheckoutPriceId(planRaw);
    if (!priceId) {
      return NextResponse.json({ error: 'Checkout is not configured for this plan' }, { status: 400 });
    }
  }

  const allowed = new Set(listLandingCheckoutPriceIds());
  if (priceId && allowed.has(priceId)) {
    const subscriptionTier = subscriptionTierForLandingPriceId(priceId);
    const { url, error } = await createPricingCheckoutSession({
      userId: user.id,
      email: user.email,
      priceId,
      successUrl: successPath,
      cancelUrl: cancelPath,
    });
    if (error || !url) {
      const legacy = await createCheckoutSessionFromPriceId({
        userId: user.id,
        email: user.email,
        priceId,
        subscriptionTier,
        successPath,
        cancelPath,
      });
      if (legacy.error || !legacy.url) {
        return NextResponse.json({ error: error ?? legacy.error ?? 'Could not create session' }, { status: 400 });
      }
      return NextResponse.json({ url: legacy.url });
    }
    return NextResponse.json({ url });
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
    successPath,
    cancelPath,
  });

  if (error || !url) {
    return NextResponse.json({ error: error ?? 'Could not create session' }, { status: 400 });
  }

  return NextResponse.json({ url });
}
