import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, type CheckoutInterval, type CheckoutTier } from '@/lib/stripe/createCheckoutSession';

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let tier: CheckoutTier = 'pro';
  let interval: CheckoutInterval = 'month';
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.tier === 'elite' || body?.tier === 'pro' || body?.tier === 'all_pro_terminal') tier = body.tier;
    if (body?.interval === 'year' || body?.interval === 'month') interval = body.interval;
  } catch {
    /* defaults */
  }

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
