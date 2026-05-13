import type { Metadata } from 'next';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import LandingHeroSection from '@/components/landing/LandingHeroSection';
import LandingStatsBar from '@/components/landing/LandingStatsBar';
import LandingFeaturesGrid from '@/components/landing/LandingFeaturesGrid';
import LandingComparisonTable from '@/components/landing/LandingComparisonTable';
import LandingPricingSection from '@/components/landing/LandingPricingSection';
import LandingTestimonialsSection from '@/components/landing/LandingTestimonialsSection';
import WaitlistStatRow from '@/components/landing/WaitlistStatRow';
import ProjectionCard, { type ProjectionCardProps } from '@/components/landing/ProjectionCard';
import LandingWaitlistUrgency from '@/components/landing/LandingWaitlistUrgency';
import LandingFooterWaitlist from '@/components/landing/LandingFooterWaitlist';
import LandingTrustedByBar from '@/components/landing/LandingTrustedByBar';
import LandingMarketingFooter from '@/components/landing/LandingMarketingFooter';
import { TWITTER_AT_DISPLAY, TWITTER_PROFILE_HREF } from '@/lib/twitter-public';

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

const SECTION_HEADING_STYLE = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(26px, 7vw, 64px)',
  letterSpacing: '0.03em',
} as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: BG, color: '#f8fafc' }}>
      <LandingNav />

      <main>
        <LandingHeroSection />
        <LandingStatsBar />
        <LandingFeaturesGrid />
        <LandingComparisonTable />
        <WeeklyPlayerPredictionsSection />
        <SocialProofBar />
        <HowItWorksSection />
        <LandingPricingSection />
        <LandingTestimonialsSection />
        <LandingWaitlistUrgency />
        <StatsBannerSection />
        <LandingFooterWaitlist />
      </main>

      <LandingTrustedByBar />
      <LandingMarketingFooter />
    </div>
  );
}

const WEEKLY_PREDICTION_SAMPLES: ProjectionCardProps[] = [
  {
    playerName: "Ja'Marr Chase",
    position: 'WR',
    team: 'CIN',
    week: 1,
    tfoScore: 91,
    grade: 'ELITE',
    verdict: 'START',
    startScore: 94,
    projLow: 18,
    projHigh: 28,
    opponent: 'PIT',
    matchupGrade: 82,
    weatherCondition: 'Dome',
    weatherTemp: 72,
    flags: ['ELITE_OPPORTUNITY'],
    reasoning: 'Elite separation in scheme built for his profile',
    verdictColor: '#36E7A1',
    gradeColor: '#36E7A1',
    matchupLabel: 'vs PIT',
    weatherIcon: '🏟️',
  },
  {
    playerName: 'Derrick Henry',
    position: 'RB',
    team: 'BAL',
    week: 1,
    tfoScore: 62,
    grade: 'VIABLE',
    verdict: 'SIT',
    startScore: 48,
    projLow: 6,
    projHigh: 14,
    opponent: 'KC',
    matchupGrade: 38,
    weatherCondition: 'Clear',
    weatherTemp: 45,
    flags: ['AGE_CLIFF', 'SCHEME_MISMATCH'],
    reasoning: 'Age curve + elite KC run defense creates floor risk',
    verdictColor: '#EF4444',
    gradeColor: '#FBBF24',
    matchupLabel: 'vs KC',
    weatherIcon: '☀️',
  },
  {
    playerName: 'Jayden Reed',
    position: 'WR',
    team: 'GB',
    week: 1,
    tfoScore: 76,
    grade: 'HIGH_VALUE',
    verdict: 'START',
    startScore: 78,
    projLow: 11,
    projHigh: 19,
    opponent: 'CHI',
    matchupGrade: 74,
    weatherCondition: 'Clear',
    weatherTemp: 55,
    flags: ['ELITE_OPPORTUNITY'],
    reasoning: 'LaFleur slot system + favorable coverage matchup',
    verdictColor: '#36E7A1',
    gradeColor: '#22D3EE',
    matchupLabel: 'vs CHI',
    weatherIcon: '☀️',
  },
];

function WeeklyPlayerPredictionsSection() {
  return (
    <section
      className="scroll-mt-24 border-y border-white/[0.06] px-4 py-14 sm:px-6 sm:py-16 lg:px-12 lg:py-[80px]"
      style={{ background: '#0a0d14' }}
    >
      <div className="mx-auto max-w-[1200px]">
        <h2
          className="text-center text-white uppercase tracking-[0.03em] text-[clamp(1.25rem,6vw,2.5rem)] sm:text-[clamp(1.5rem,4vw,2.5rem)] lg:text-[40px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          WEEKLY PLAYER PREDICTIONS
        </h2>
        <p className="mt-3 text-center text-[12px] text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
          Follow {TWITTER_AT_DISPLAY} for daily dynasty intelligence
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-8 sm:mt-12 sm:gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
          <div className="mx-auto w-full max-w-[340px] shrink-0 lg:mx-0" style={{ transform: 'rotate(-2deg)' }}>
            <ProjectionCard {...WEEKLY_PREDICTION_SAMPLES[0]} />
          </div>
          <div
            className="mx-auto w-full max-w-[340px] shrink-0 lg:mx-0 lg:mt-4"
            style={{ transform: 'rotate(0deg) scale(1.05)', zIndex: 10 }}
          >
            <ProjectionCard {...WEEKLY_PREDICTION_SAMPLES[1]} />
          </div>
          <div className="mx-auto w-full max-w-[340px] shrink-0 lg:mx-0" style={{ transform: 'rotate(2deg)' }}>
            <ProjectionCard {...WEEKLY_PREDICTION_SAMPLES[2]} />
          </div>
        </div>

        <p
          className="mt-14 text-center text-[12px] font-bold uppercase tracking-[0.08em] text-[#64748B]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          GET THESE PREDICTIONS EVERY WEEK
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-[10px] px-6 py-3 text-[14px] font-bold text-[#0a0d14] transition-opacity hover:opacity-95 sm:px-7 sm:py-[14px] sm:text-[15px]"
            style={{
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
            }}
          >
            JOIN WAITLIST →
          </Link>
        </div>
      </div>
    </section>
  );
}

function TwitterDailyIntelCallout() {
  return (
    <div className="glass-panel mx-auto w-full max-w-[400px] rounded-xl text-center lg:text-left" style={{ padding: 20, borderRadius: 12 }}>
      <h3 className="text-[20px] text-white uppercase tracking-[0.02em]" style={{ fontFamily: 'var(--font-display)' }}>
        𝕏 DAILY DYNASTY INTEL
      </h3>
      <p className="mt-3 text-[13px] leading-[1.5] text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
        Get <span className="font-mono tabular-nums">6</span> player predictions posted every day during the season. Free. No
        signup required.
      </p>
      <a
        href={TWITTER_PROFILE_HREF}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg px-5 text-[12px] font-bold uppercase tracking-wide text-white transition hover:opacity-90"
        style={{
          fontFamily: 'var(--font-body)',
          background: '#0a0d14',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 8,
          boxShadow: '0 0 20px rgba(34,211,238,0.12)',
        }}
      >
        FOLLOW {TWITTER_AT_DISPLAY.toUpperCase()}
      </a>
    </div>
  );
}

function SocialProofBar() {
  return (
    <section className="border-y border-white/[0.06] bg-[#0a0d14] py-5">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-4 sm:gap-8 sm:px-6 lg:px-12">
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:flex sm:flex-wrap sm:gap-x-10 lg:gap-14">
          <StatPair num="100+" label="Teams Optimized Daily" numColor="#36E7A1" />
          <StatPair num="8,000+" label="Trades Analyzed" numColor="#22D3EE" />
          <StatPair num="82.5%" label="Sit/Start Accuracy" numColor="#36E7A1" />
          <WaitlistStatRow />
        </div>

        <TwitterDailyIntelCallout />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
          <div className="flex flex-col gap-1 lg:max-w-[280px] lg:text-right lg:ml-auto">
            <div className="text-xl tracking-widest text-[#36E7A1]">★★★★★</div>
            <p className="text-[12px] leading-snug text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Trusted by dynasty players in <span className="font-mono tabular-nums">100+</span> Sleeper leagues
            </p>
          </div>
          <div className="text-center text-[13px] text-[#64748B] lg:text-right" style={{ fontFamily: 'var(--font-body)' }}>
            Built for <span className="font-bold text-[#22D3EE]">SLEEPER</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatPair({ num, label, numColor }: { num: string; label: string; numColor: string }) {
  return (
    <div>
      <div
        className="text-[clamp(2rem,10vw,3.25rem)] font-bold leading-none tabular-nums sm:text-[52px] font-mono"
        style={{ color: numColor }}
      >
        {num}
      </div>
      <div className="mt-0.5 text-[11px] text-[#64748B] sm:text-[12px]" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </div>
    </div>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      n: '01',
      color: '#22D3EE',
      title: 'Import Your Leagues',
      body: 'Connect your Sleeper account in one click — no API keys or coding required.',
    },
    {
      n: '02',
      color: '#36E7A1',
      title: 'We Analyze Everything',
      body: 'Rosters, projections, player values, trades, and injury status — reflected in real time.',
    },
    {
      n: '03',
      color: '#A78BFA',
      title: 'Get Actionable Intel',
      body: 'Start/sit decisions, trade opportunities, and dynasty strategic intelligence for every league in one portfolio.',
    },
  ];

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-[100px]"
      style={{ background: '#0a0d14' }}
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-white leading-[1.05]" style={SECTION_HEADING_STYLE}>
          From Sync to Dominance
          <br />
          In <span className="font-mono tabular-nums">30</span> Seconds
        </h2>

        <div className="mt-14 hidden items-stretch gap-0 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          {steps.map((s, i) => (
            <div key={s.n} className="contents">
              <StepCard {...s} />
              {i < steps.length - 1 && (
                <div className="flex items-center justify-center px-2 text-2xl text-[#475569]">→</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-6 lg:hidden">
          {steps.map((s) => (
            <StepCard key={s.n} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({
  n,
  color,
  title,
  body,
}: {
  n: string;
  color: string;
  title: string;
  body: string;
}) {
  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8">
      <div
        className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold font-mono"
        style={{
          background: `${color}14`,
          border: `1px solid ${color}4d`,
          color,
        }}
      >
        {n}
      </div>
      <h3
        className="text-[clamp(1.1rem,4vw,1.375rem)] text-white tracking-[0.03em] sm:text-[22px]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
        {body}
      </p>
    </div>
  );
}

function StatsBannerSection() {
  return (
    <section
      className="border-y py-10 sm:py-[60px]"
      style={{
        background: 'rgba(54,231,161,0.04)',
        borderColor: 'rgba(54,231,161,0.1)',
      }}
    >
      <div className="mx-auto flex max-w-[900px] flex-col items-center justify-center gap-10 px-4 sm:gap-12 md:flex-row md:gap-16 lg:gap-20 lg:px-12">
        <div className="text-center md:text-left">
          <div
            className="text-[clamp(2.5rem,12vw,4rem)] font-bold leading-none tabular-nums text-[#36E7A1] sm:text-[64px] font-mono"
          >
            13.4%
          </div>
          <div
            className="mt-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#64748B]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sit/Start Edge
          </div>
          <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Validated accuracy over ECR (<span className="font-mono tabular-nums">2023</span> Data).
          </p>
        </div>
        <div className="text-center md:text-left">
          <div className="text-[13px] font-bold text-[#22D3EE]" style={{ fontFamily: 'var(--font-body)' }}>
            VERIFIED ✓
          </div>
          <div className="mt-1 font-mono text-[clamp(1.75rem,8vw,3rem)] font-bold leading-none tabular-nums text-[#22D3EE] sm:text-[48px]">
            42-18-2 RECORD
          </div>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Performance data pulled directly from active Sleeper leagues.
          </p>
        </div>
        <div className="max-w-[260px] text-center md:text-left">
          <div className="text-[clamp(1.5rem,8vw,2rem)] sm:text-[32px]">⚙️</div>
          <div
            className="mt-2 text-[13px] font-bold uppercase tracking-wide text-[#A78BFA]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Refinement Feedback Loop
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="font-mono tabular-nums">100%</span> transparency. Every miss fuels a model adjustment.
          </p>
        </div>
      </div>
    </section>
  );
}
