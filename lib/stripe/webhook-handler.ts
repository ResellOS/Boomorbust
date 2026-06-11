import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergePreferenceData } from '@/lib/preferences/preference-data';
import { tierFromPriceId } from '@/lib/stripe/pricing';

export type StoredSubscriptionTier =
  | 'free'
  | 'league_analyst'
  | 'general_manager'
  | 'all_pro'
  | 'pro'
  | 'elite'
  | 'all_pro_terminal';

function tierFromMetadataOrPrice(sub: Stripe.Subscription): StoredSubscriptionTier {
  const meta = sub.metadata?.subscription_tier;
  if (meta === 'all_pro' || meta === 'all_pro_terminal') return 'all_pro';
  if (meta === 'general_manager' || meta === 'elite') return 'general_manager';
  if (meta === 'league_analyst' || meta === 'pro') return 'league_analyst';

  const priceId = sub.items.data[0]?.price?.id;
  if (priceId) {
    const mapped = tierFromPriceId(priceId);
    if (mapped) return mapped;
  }

  return 'league_analyst';
}

function tierFromSessionMetadata(raw: string | undefined): StoredSubscriptionTier {
  if (raw === 'all_pro' || raw === 'all_pro_terminal') return 'all_pro';
  if (raw === 'general_manager' || raw === 'elite') return 'general_manager';
  if (raw === 'league_analyst' || raw === 'pro') return 'league_analyst';
  return 'league_analyst';
}

export async function handleStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  const supabase = createAdminClient();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const customerId = session.customer as string;

    if (userId) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('preference_data')
        .eq('id', userId)
        .maybeSingle();
      const existingPd = existing?.preference_data as Record<string, unknown> | undefined;
      const tier = tierFromSessionMetadata(session.metadata?.subscription_tier);
      const preference_data = mergePreferenceData(existingPd, {
        subscription_tier: tier as 'pro' | 'elite' | 'all_pro_terminal',
      });

      const { error } = await supabase.from('profiles').upsert({
        id: userId,
        is_paid: true,
        subscription_tier: tier,
        stripe_customer_id: customerId,
        preference_data,
      });
      if (error) throw error;
    }
    return;
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
      const pd = {
        ...(mergePreferenceData(profile.preference_data as Record<string, unknown>, {}) as Record<
          string,
          unknown
        >),
      };
      delete pd.subscription_tier;
      const { error } = await supabase
        .from('profiles')
        .update({ is_paid: false, subscription_tier: 'free', preference_data: pd })
        .eq('id', profile.id);
      if (error) throw error;
    }
    return;
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object as Stripe.Subscription;
    const is_paid = sub.status === 'active' || sub.status === 'trialing';
    const tier = tierFromMetadataOrPrice(sub);
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
        preference_data = mergePreferenceData(raw, {
          subscription_tier: tier as 'pro' | 'elite' | 'all_pro_terminal',
        });
      } else {
        preference_data = { ...(raw as Record<string, unknown>) };
        delete preference_data.subscription_tier;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          is_paid,
          subscription_tier: is_paid ? tier : 'free',
          preference_data,
        })
        .eq('id', profile.id);
      if (error) throw error;
    }
  }
}
