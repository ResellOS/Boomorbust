import LandingPage from '@/components/landing/redesign/LandingPage';
import { fetchLandingStats } from '@/lib/landing/fetchLandingStats';
import { fetchLandingPageSignals } from '@/lib/public/liveSignal';
import { foundingSpotsRemaining } from '@/lib/stripe/pricing';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [stats, signals] = await Promise.all([fetchLandingStats(), fetchLandingPageSignals()]);

  return (
    <LandingPage
      stats={stats}
      landingCards={signals.landingCards}
      updatedAt={signals.updatedAt}
      foundingSpots={foundingSpotsRemaining()}
    />
  );
}
