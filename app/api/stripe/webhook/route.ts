import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergePreferenceData } from '@/lib/preferences/preference-data';

function paidTierFromSubscription(sub: Stripe.Subscription): 'pro' | 'elite' | 'all_pro_terminal' {
  const m = sub.metadata?.subscription_tier;
  if (m === 'all_pro_terminal') return 'all_pro_terminal';
  if (m === 'elite') return 'elite';
  const priceId = sub.items.data[0]?.price?.id;
  if (priceId === process.env.STRIPE_ALL_PRO_TERMINAL_PRICE_ID) return 'all_pro_terminal';
  const elitePriceIds = [process.env.STRIPE_PRICE_ELITE_MONTHLY, process.env.STRIPE_ELITE_PRICE_ID].filter(
    Boolean
  ) as string[];
  if (priceId && elitePriceIds.includes(priceId)) return 'elite';
  return 'pro';
}

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.user_id;
      const customerId = session.customer as string;

      if (userId) {
        const { data: existing } = await supabase.from('profiles').select('preference_data').eq('id', userId).maybeSingle();
        const existingPd = existing?.preference_data as Record<string, unknown> | undefined;
        const tierRaw = session.metadata?.subscription_tier;
        const tier = (tierRaw === 'elite' ? 'elite' : tierRaw === 'all_pro_terminal' ? 'all_pro_terminal' : 'pro') as 'pro' | 'elite' | 'all_pro_terminal';
        const preference_data = mergePreferenceData(existingPd, { subscription_tier: tier });

        const { error } = await supabase.from('profiles').upsert({
          id: userId,
          is_paid: true,
          stripe_customer_id: customerId,
          preference_data,
        });
        if (error) throw error;
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription;
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, preference_data')
        .eq('stripe_customer_id', sub.customer as string)
        .single();
      if (lookupErr) throw lookupErr;

      if (profile) {
        const pd = { ...(mergePreferenceData(profile.preference_data as Record<string, unknown>, {}) as Record<string, unknown>) };
        delete pd.subscription_tier;
        const { error } = await supabase.from('profiles').update({ is_paid: false, preference_data: pd }).eq('id', profile.id);
        if (error) throw error;
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object as Stripe.Subscription;
      const is_paid = sub.status === 'active' || sub.status === 'trialing';
      const tier = paidTierFromSubscription(sub);
      const { data: profile, error: lookupErr } = await supabase
        .from('profiles')
        .select('id, preference_data')
        .eq('stripe_customer_id', sub.customer as string)
        .single();
      if (lookupErr) throw lookupErr;

      if (profile) {
        const raw = mergePreferenceData(profile.preference_data as Record<string, unknown>, {});
        let preference_data: Record<string, unknown>;

        if (is_paid) {
          preference_data = mergePreferenceData(raw, { subscription_tier: tier });
        } else {
          preference_data = { ...(raw as Record<string, unknown>) };
          delete preference_data.subscription_tier;
        }

        const { error } = await supabase.from('profiles').update({ is_paid, preference_data }).eq('id', profile.id);
        if (error) throw error;
      }
    }
  } catch (err) {
    console.error(`Webhook DB error [${event.type}]:`, err);
    try {
      await supabase.from('error_logs').insert({
        source: 'stripe-webhook',
        message: `${event.type}: ${String(err)}`,
      });
    } catch {
      /* don't let logging failure mask the real error */
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
