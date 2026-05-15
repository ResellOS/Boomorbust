import type { Metadata } from 'next';
import LandingNav from '@/components/landing/LandingNav';
import LandingHeroSection from '@/components/landing/LandingHeroSection';
import LandingStatsBar from '@/components/landing/LandingStatsBar';
import LandingHowItWorksSection from '@/components/landing/LandingHowItWorksSection';
import LandingFeaturesGrid from '@/components/landing/LandingFeaturesGrid';
import LandingComparisonTable from '@/components/landing/LandingComparisonTable';
import LandingPortfolioSection from '@/components/landing/LandingPortfolioSection';
import LandingBuiltOnRealAnalysis from '@/components/landing/LandingBuiltOnRealAnalysis';
import LandingDynastyStatsSection from '@/components/landing/LandingDynastyStatsSection';
import LandingTestimonialsSection from '@/components/landing/LandingTestimonialsSection';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingFinalCta from '@/components/landing/LandingFinalCta';
import LandingMarketingFooter from '@/components/landing/LandingMarketingFooter';

const LANDING_METADATA_TITLE = 'Boom or Bust — The Bloomberg Terminal for Dynasty Football';
const LANDING_METADATA_DESCRIPTION =
  'Manage all your fantasy leagues like a portfolio. AI-powered verdicts, smart trade counter, dynasty age clock. Built for Sleeper.';

export const metadata: Metadata = {
  title: LANDING_METADATA_TITLE,
  description: LANDING_METADATA_DESCRIPTION,
  openGraph: {
    title: LANDING_METADATA_TITLE,
    description: LANDING_METADATA_DESCRIPTION,
    url: 'https://boomorbust.app',
    siteName: 'Boom or Bust',
  },
};

/** Waitlist + client islands; avoid static prerender chunk edge cases on `/`. */
export const dynamic = 'force-dynamic';

const BG = '#0a0d14';

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: BG, color: '#f8fafc' }}>
      <LandingNav />

      <main>
        <LandingHeroSection />
        <LandingStatsBar />
        <LandingHowItWorksSection />
        <LandingFeaturesGrid />
        <LandingComparisonTable />
        <LandingPortfolioSection />
        <LandingBuiltOnRealAnalysis />
        <LandingDynastyStatsSection />
        <LandingTestimonialsSection />
        <LandingPricingSection />
        <LandingFinalCta />
      </main>

      <LandingMarketingFooter />
    </div>
  );
}
