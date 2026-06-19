import type { PublicSignalCard } from '@/lib/public/liveSignal';
import type { LandingStats } from '@/lib/landing/fetchLandingStats';
import LandingNavbar from './LandingNavbar';
import LandingHero from './LandingHero';
import {
  LandingTrustStrip,
  LandingProblem,
  LandingFeatures,
  LandingTrackRecord,
  LandingLeagueIntel,
  LandingOrphanChallenge,
  LandingLiveSignals,
  LandingFooterFeed,
  SectionDivider,
} from './LandingSections';
import LandingPricing from './LandingPricing';
import LandingFinalCta from './LandingFinalCta';
import LandingFooter from './LandingFooter';

export default function LandingPage({
  stats,
  landingCards,
  updatedAt,
  foundingSpots,
}: {
  stats: LandingStats;
  landingCards: PublicSignalCard[];
  updatedAt: string;
  foundingSpots: number;
}) {
  return (
    <div className="min-h-screen font-figtree text-[#e8ecf4]" style={{ background: '#0a0d14' }}>
      <LandingNavbar />
      <LandingHero />
      <LandingTrustStrip stats={stats} />
      <SectionDivider />
      <LandingProblem />
      <SectionDivider />
      <LandingFeatures />
      <SectionDivider />
      <LandingTrackRecord />
      <SectionDivider />
      <LandingLeagueIntel />
      <LandingOrphanChallenge />
      <SectionDivider />
      <LandingLiveSignals cards={landingCards} updatedAt={updatedAt} />
      <SectionDivider />
      <LandingPricing foundingSpots={foundingSpots} />
      <LandingFinalCta />
      <LandingFooterFeed />
      <LandingFooter />
    </div>
  );
}
