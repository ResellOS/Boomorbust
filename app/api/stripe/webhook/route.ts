import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.error('Webhook signature error:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Webhooks have no user session — must use service role to bypass RLS
  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const customerId = session.customer as string;

    if (userId) {
      await supabase.from('profiles').upsert({
        id: userId,
        is_paid: true,
        stripe_customer_id: customerId,
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', sub.customer as string)
      .single();

    if (profile) {
      await supabase.from('profiles').update({ is_paid: false }).eq('id', profile.id);
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const is_paid = sub.status === 'active' || sub.status === 'trialing';
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', sub.customer as string)
      .single();

    if (profile) {
      await supabase.from('profiles').update({ is_paid }).eq('id', profile.id);
    }
  }

  return NextResponse.json({ received: true });
}
