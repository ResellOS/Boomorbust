import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' });
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let returnPath = '/pricing';
  try {
    const body = (await request.json()) as { returnUrl?: string };
    if (body?.returnUrl) returnPath = body.returnUrl;
  } catch {
    /* default */
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const return_url = returnPath.startsWith('http') ? returnPath : `${site}${returnPath}`;

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url,
  });

  return NextResponse.json({ url: session.url });
}
