import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession } from '@/lib/stripe/createCheckoutSession';

/** @deprecated Prefer POST /api/stripe/create-checkout with { tier, interval } — kept for backwards compatibility */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { url, error } = await createCheckoutSession({
    userId: user.id,
    email: user.email,
    tier: 'pro',
    interval: 'month',
  });

  if (error || !url) {
    return NextResponse.json({ error: error ?? 'Could not create session' }, { status: 400 });
  }

  return NextResponse.json({ url });
}
