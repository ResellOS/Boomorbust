import { createClient } from '@/lib/supabase/server';
import PricingPageClient from '@/components/pricing/PricingPageClient';
import {
  displayTierFromDb,
  earlyAccessTier,
  foundingSpotsRemaining,
  resolvePriceId,
} from '@/lib/stripe/pricing';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Pricing — Boom or Bust',
  description: 'Start free. Upgrade when you are ready. Dynasty football intelligence for every league.',
};

export default async function PricingPage() {
  let currentTier: ReturnType<typeof displayTierFromDb> = 'free';
  let isLoggedIn = false;
  let hasStripeCustomer = false;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isLoggedIn = true;
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle();

      currentTier = displayTierFromDb(profile?.subscription_tier);
      hasStripeCustomer = !!profile?.stripe_customer_id;
    }
  } catch (err) {
    console.error('[pricing] auth/profile failed:', err);
  }

  const priceIds = {
    league_analyst: {
      month: resolvePriceId('league_analyst', 'month'),
      year: resolvePriceId('league_analyst', 'year'),
    },
    general_manager: {
      month: resolvePriceId('general_manager', 'month'),
      year: resolvePriceId('general_manager', 'year'),
    },
    all_pro: {
      month: resolvePriceId('all_pro', 'month'),
      year: resolvePriceId('all_pro', 'year'),
    },
  };

  return (
    <PricingPageClient
      currentTier={currentTier}
      isLoggedIn={isLoggedIn}
      hasStripeCustomer={hasStripeCustomer}
      foundingSpotsRemaining={foundingSpotsRemaining()}
      earlyAccessTier={earlyAccessTier()}
      priceIds={priceIds}
    />
  );
}
