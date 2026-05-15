import Link from 'next/link';
import HeroMockup from '@/components/landing/HeroMockup';

const HERO_BG = '#0a0d14';

export default function LandingHeroSection() {
  return (
    <section
      className="relative flex min-h-screen items-center overflow-hidden px-4 pb-16 pt-20"
      style={{ background: HERO_BG, color: '#f8fafc' }}
    >
      <div
        className="pointer-events-none absolute left-[-200px] top-[-200px] h-[600px] w-[600px] rounded-full bg-[#36E7A1]/[0.06] blur-[120px]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-200px] top-[-200px] h-[600px] w-[600px] rounded-full bg-[#A78BFA]/[0.06] blur-[120px]"
        aria-hidden
      />

      <div className="relative z-[1] mx-auto flex w-full max-w-[1200px] flex-col lg:flex-row lg:items-center gap-12 lg:gap-16">
        <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left">
        <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-[#36E7A1]/20 bg-[#36E7A1]/[0.06] px-4 py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#36E7A1]" />
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#36E7A1]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Built for Sleeper Players
          </span>
        </div>

        <h1 className="font-['Bebas_Neue'] leading-[0.92] mb-6 text-center lg:text-left">
          {/* Line 1 */}
          <span className="block" style={{ fontSize: 'clamp(36px, 5vw, 80px)', whiteSpace: 'nowrap' }}>
            <span className="text-white">DRAFT THE </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #36E7A1 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              BOOM
            </span>
          </span>
          {/* Line 2 */}
          <span className="block" style={{ fontSize: 'clamp(36px, 5vw, 80px)', whiteSpace: 'nowrap' }}>
            <span className="text-white">DODGE THE </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #7c3aed 0%, #A78BFA 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              BUST
            </span>
          </span>
          {/* Line 3 — tagline */}
          <span
            className="block text-white/50 font-['Inter'] font-normal mt-3"
            style={{ fontSize: 'clamp(13px, 1.6vw, 18px)', letterSpacing: '0.18em' }}
          >
            — Your fantasy edge, every single week —
          </span>
        </h1>

        <p
          className="mb-10 mt-2 max-w-[540px] text-[16px] leading-[1.7] sm:text-[18px]"
          style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}
        >
          Sync your fantasy leagues and get personalised sit/start decisions, trade analysis, and weekly edge score — both
          specific for your teams.
        </p>

        <div className="mb-8 flex flex-col items-center lg:items-start gap-4 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-[#36E7A1] px-8 py-4 text-[15px] font-black text-black shadow-[0_0_48px_rgba(54,231,161,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_64px_rgba(54,231,161,0.5)]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            🏈 Import My Leagues
          </Link>
          <Link
            href="#mockup"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-8 py-4 text-[15px] font-semibold text-white transition-all duration-200 hover:border-white/40 hover:bg-white/[0.04]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <span className="text-[#36E7A1]">▶</span> See It In Action
          </Link>
        </div>

        <div
          className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-sm"
          style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-[#36E7A1]">✓</span> 100% Free to Start
          </span>
          <span className="text-white/20">·</span>
          <span>No Credit Card</span>
          <span className="text-white/20">·</span>
          <span>Secure with Sleeper</span>
        </div>
        </div>

        <div id="mockup" className="flex-1 min-w-0">
          <div className="overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_0_80px_rgba(54,231,161,0.12),0_32px_80px_rgba(167,139,250,0.08)]">
            <HeroMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
