import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, is_paid, subscription_tier')
    .eq('id', user.id)
    .single();

  if (!profile?.is_paid) {
    return NextResponse.json({
      tier: 'free' as const,
      is_paid: false,
      renewal_unix: null,
      renewal_iso: null,
      price_label: null,
      interval: null as 'month' | 'year' | null,
      card_last4: null,
    });
  }

  const rawTier = (profile as { subscription_tier?: string } | null)?.subscription_tier;
  const storedTier: 'pro' | 'elite' | 'all_pro_terminal' =
    rawTier === 'all_pro_terminal' ? 'all_pro_terminal'
    : rawTier === 'elite' ? 'elite'
    : 'pro';

  if (!profile.stripe_customer_id) {
    return NextResponse.json({
      tier: storedTier,
      is_paid: true,
      renewal_unix: null,
      renewal_iso: null,
      price_label: null,
      interval: null,
      card_last4: null,
    });
  }

  try {
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
      expand: ['data.default_payment_method'],
    });

    const sub = subs.data[0];
    if (!sub) {
      return NextResponse.json({
        tier: storedTier,
        is_paid: true,
        renewal_unix: null,
        renewal_iso: null,
        price_label: null,
        interval: null,
        card_last4: null,
      });
    }

    const item = sub.items.data[0];
    const price = item?.price;
    const unit = price?.unit_amount;
    const cur = price?.currency?.toUpperCase() ?? 'USD';
    const price_label =
      unit != null ? `${cur === 'USD' ? '$' : cur + ' '}${(unit / 100).toFixed(2)}` : null;
    const interval = price?.recurring?.interval === 'year' ? ('year' as const) : ('month' as const);

    let card_last4: string | null = null;
    const dpm = sub.default_payment_method;
    if (dpm && typeof dpm === 'object' && dpm !== null && 'card' in dpm) {
      card_last4 = (dpm as Stripe.PaymentMethod).card?.last4 ?? null;
    } else if (typeof dpm === 'string') {
      const pm = await stripe.paymentMethods.retrieve(dpm);
      card_last4 = pm.card?.last4 ?? null;
    }

    const cpeRaw = (sub as { current_period_end?: number }).current_period_end;
    const cpe = typeof cpeRaw === 'number' ? cpeRaw : 0;

    return NextResponse.json({
      tier: storedTier,
      is_paid: true,
      renewal_unix: cpe,
      renewal_iso: cpe > 0 ? new Date(cpe * 1000).toISOString() : null,
      price_label,
      interval,
      card_last4,
    });
  } catch (e) {
    console.error('billing-summary', e);
    return NextResponse.json({ error: 'Could not load billing' }, { status: 500 });
  }
}
