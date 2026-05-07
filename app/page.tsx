import type { CSSProperties } from 'react';
import Link from 'next/link';

const BG = '#060910';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Resources', href: '#resources' },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen antialiased" style={{ background: BG, color: '#f8fafc' }}>
      <LandingNav />

      <main>
        <HeroSection />
        <SocialProofBar />
        <HowItWorksSection />
        <FeatureGridSection />
        <ComparisonSection />
        <PricingSection />
        <StatsBannerSection />
      </main>

      <SiteFooter />
    </div>
  );
}

function LandingNav() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] flex h-16 items-center border-b border-white/[0.06] px-6 lg:px-12"
      style={{
        background: 'rgba(6,9,16,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-[1400px] items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="Boom or Bust home">
          <img src="/images/logo-full2.png" height={32} width={180} className="h-8 w-auto object-contain" alt="Boom or Bust" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary" style={{ fontFamily: 'var(--font-body)' }}>
          {NAV_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] text-[#94A3B8] transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden rounded-lg border border-white/[0.15] px-5 py-2 text-[13px] text-white transition-colors hover:bg-white/[0.06] sm:inline-flex"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-1 rounded-lg px-5 py-[9px] text-[13px] font-bold text-[#060910] transition-opacity hover:opacity-95"
            style={{
              fontFamily: 'var(--font-body)',
              background: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
            }}
          >
            Import My Leagues →
          </Link>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] overflow-hidden pt-16">
      {/* Radial orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-[15%] -top-[20%] h-[600px] w-[600px] rounded-full blur-3xl"
          style={{ background: 'rgba(0,212,255,0.06)' }}
        />
        <div
          className="absolute -bottom-[25%] -right-[15%] h-[500px] w-[500px] rounded-full blur-3xl"
          style={{ background: 'rgba(54,231,161,0.04)' }}
        />
      </div>

      <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 py-[72px] lg:grid-cols-[55%_45%] lg:gap-10 lg:px-12 lg:py-[120px]">
        <div>
          <div
            className="mb-6 inline-flex items-center rounded-full border px-[14px] py-[6px] text-[11px] font-bold uppercase tracking-[0.1em] text-[#36E7A1] font-mono-tactical"
            style={{
              background: 'rgba(54,231,161,0.1)',
              borderColor: 'rgba(54,231,161,0.2)',
            }}
          >
            ⚡ Built for dynasty players
          </div>

          <h1
            className="text-white"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(48px, 6vw, 80px)',
              lineHeight: 0.95,
              letterSpacing: '0.02em',
            }}
          >
            <span className="block">Manage All Your</span>
            <span className="block">Fantasy Leagues</span>
            <span
              className="block bg-clip-text text-transparent"
              style={{
                backgroundImage: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Like a Portfolio.
            </span>
          </h1>

          <p
            className="mt-5 max-w-[480px] text-base leading-relaxed text-[#94A3B8]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            Sync your fantasy leagues and get personalized sit/start decisions, trade analytics, and dynasty intelligence —
            built specifically for your teams.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-1 rounded-[10px] px-7 py-[14px] text-[15px] font-bold text-[#060910] transition-opacity hover:opacity-95"
              style={{
                fontFamily: 'var(--font-body)',
                background: 'linear-gradient(135deg, #36E7A1, #22D3EE)',
              }}
            >
              Import My Leagues →
            </Link>
            <Link
              href="#demo"
              className="inline-flex items-center rounded-[10px] border border-white/[0.15] bg-white/[0.04] px-7 py-[14px] text-[15px] text-white transition-colors hover:bg-white/[0.08]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              See It In Action
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-5 text-[12px] text-[#64748B] font-mono-tactical">
            <span>✓ 100% Free to Start</span>
            <span>✓ No Credit Card</span>
            <span>✓ Secure with Sleeper</span>
          </div>
        </div>

        <div id="demo" className="relative w-full scroll-mt-24">
          <HeroDashboardMock />
        </div>
      </div>
    </section>
  );
}

function HeroDashboardMock() {
  const pts = [
    [0, 55],
    [160, 38],
    [320, 22],
  ];
  const pathD = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

  return (
    <div className="glass-panel w-full rounded-2xl p-5">
      <div className="flex items-end justify-between gap-3">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#64748B] font-mono-tactical">
          Portfolio value
        </span>
        <span className="text-lg font-bold tracking-tight text-[#36E7A1] font-mono-tactical">679.8k KTC</span>
      </div>

      <svg viewBox="0 0 320 80" className="mt-4 h-20 w-full" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="heroChartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#36E7A1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#36E7A1" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${pathD} L 320 80 L 0 80 Z`}
          fill="url(#heroChartFill)"
        />
        <path
          d={pathD}
          fill="none"
          stroke="#36E7A1"
          strokeWidth="2.5"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
      </svg>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniSignalCard label="BOOM" accent="#36E7A1" name="J. Chase" pos="WR" val="+12.4" />
        <MiniSignalCard label="NEUTRAL" accent="#FBBF24" name="D. Henry" pos="RB" val="+1.2" />
        <MiniSignalCard label="BUST" accent="#EF4444" name="Q. Johnston" pos="WR" val="-8.1" />
      </div>
    </div>
  );
}

function MiniSignalCard({
  label,
  accent,
  name,
  pos,
  val,
}: {
  label: string;
  accent: string;
  name: string;
  pos: string;
  val: string;
}) {
  return (
    <div
      className="rounded-lg border px-2 py-2.5"
      style={{
        borderColor: `${accent}40`,
        background: `${accent}10`,
      }}
    >
      <div className="text-[9px] font-bold uppercase tracking-wide font-mono-tactical" style={{ color: accent }}>
        {label}
      </div>
      <div className="mt-1 truncate text-[11px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
        {name}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-1">
        <span
          className="rounded px-1 py-0.5 text-[8px] font-bold text-white/90 font-mono-tactical"
          style={{ background: `${accent}35` }}
        >
          {pos}
        </span>
        <span className="text-[10px] font-bold text-white/80 font-mono-tactical">{val}</span>
      </div>
    </div>
  );
}

function SocialProofBar() {
  return (
    <section
      className="border-y border-white/[0.06] py-5"
      style={{ background: 'rgba(255,255,255,0.02)' }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:px-12">
        <div className="flex flex-wrap gap-10 lg:gap-14">
          <StatPair num="100+" label="Teams Optimized Daily" />
          <StatPair num="8,000+" label="Trades Analyzed" />
          <StatPair num="82.5%" label="Sit/Start Accuracy" />
        </div>
        <div className="flex flex-col gap-1 lg:max-w-[280px] lg:text-right">
          <div className="text-xl tracking-widest text-[#36E7A1]">★★★★★</div>
          <p className="text-[12px] leading-snug text-[#64748B] font-mono-tactical">
            Trusted by dynasty players in 100+ Sleeper leagues
          </p>
        </div>
        <div className="text-[13px] text-[#64748B] font-mono-tactical">
          Built for <span className="font-bold text-[#22D3EE]">SLEEPER</span>
        </div>
      </div>
    </section>
  );
}

function StatPair({ num, label }: { num: string; label: string }) {
  return (
    <div>
      <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
        {num}
      </div>
      <div className="mt-0.5 text-[12px] text-[#64748B] font-mono-tactical">{label}</div>
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
    <section id="how-it-works" className="scroll-mt-24 px-6 py-[100px] lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <h2
          className="text-center text-[52px] text-white leading-[1.05]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          From Sync to Dominance
          <br />
          In 30 Seconds
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
    <div className="glass-panel rounded-2xl p-8">
      <div
        className="mb-5 flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-bold font-mono-tactical"
        style={{
          background: `${color}14`,
          border: `1px solid ${color}4d`,
          color,
        }}
      >
        {n}
      </div>
      <h3
        className="text-[22px] text-white tracking-[0.03em]"
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

const FEATURE_CARDS = [
  {
    emoji: '📊',
    title: 'Impact Dashboard',
    color: '#22D3EE',
    body: 'See your entire dynasty empire at a glance. Portfolio value, boom/bust signals, and roster health.',
    href: '/auth/signup',
    link: 'See all leagues →',
  },
  {
    emoji: '⚡',
    title: 'Start/Sit Optimizer',
    color: '#36E7A1',
    body: 'Get sharp start/sit calls with matchup grades, weather, and TFO formula reasoning — not just rankings.',
    href: '/auth/signup',
    link: 'Optimize my lineup →',
  },
  {
    emoji: '🔄',
    title: 'Trade Analyzer',
    color: '#A78BFA',
    body: 'Dynasty-aware trade analysis that factors in scheme fit, age curve, and 3-year value windows.',
    href: '/auth/signup',
    link: 'Analyze a trade →',
  },
  {
    emoji: '🎯',
    title: 'Waiver Wire Targets',
    color: '#FBBF24',
    body: 'Find undervalued players before your league catches up. Powered by TFO formula + market gap detection.',
    href: '/auth/signup',
    link: 'View top targets →',
  },
  {
    emoji: '🧭',
    title: 'Dynasty Scouting Engine',
    color: '#36E7A1',
    body: 'Evaluate players on scheme fit, coaching tree tendencies, and 3-year dynasty windows.',
    href: '/auth/signup',
    link: 'Get my strategy →',
  },
  {
    emoji: '🌟',
    title: 'Rookie Pick Intelligence',
    color: '#22D3EE',
    body: 'Evaluate rookies on landing spot quality, scheme fit, and age curve before your draft.',
    href: '/auth/signup',
    link: 'View rookies board →',
  },
] as const;

function FeatureGridSection() {
  return (
    <section id="features" className="scroll-mt-24 px-6 pb-[100px] lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-[52px] text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Everything You Need to Win — In One Place
        </h2>
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURE_CARDS.map((f) => (
            <article
              key={f.title}
              className="glass-panel group rounded-2xl p-7 transition-colors hover:border-white/20"
            >
              <div className="text-[32px] leading-none">{f.emoji}</div>
              <h3 className="mt-4 text-base font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                {f.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
                {f.body}
              </p>
              <Link
                href={f.href}
                className="mt-4 inline-block text-[12px] font-mono-tactical transition-opacity hover:opacity-80"
                style={{ color: f.color }}
              >
                {f.link}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const COMPARISON_ROWS: [string, boolean, boolean, boolean, boolean][] = [
  ['Multi-league portfolio', false, false, false, true],
  ['Personalized sit/start', false, false, false, true],
  ['Trade acceleration', false, true, true, true],
  ['Start/sit optimizer', false, false, true, true],
  ['Proactive coach', false, false, false, true],
  ['Rookie pick engine', false, true, true, true],
];

function ComparisonSection() {
  return (
    <section className="px-6 pb-[100px] lg:px-12">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-[52px] text-white leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Most Tools Give Rankings.
          <br />
          We Give Decisions.
        </h2>

        <div className="glass-panel mx-auto mt-14 max-w-[800px] overflow-hidden rounded-2xl">
          <div
            className="grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] gap-2 border-b border-white/[0.06] px-5 py-3 text-center text-[12px] font-mono-tactical text-[#64748B] sm:px-6"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="text-left">FEATURE</div>
            <div>Generic Tools</div>
            <div>KTC</div>
            <div>
              <span className="hidden sm:inline">Dynasty Nerds</span>
              <span className="sm:hidden">D. Nerds</span>
            </div>
            <div className="font-bold text-[#36E7A1]">BOOM OR BUST</div>
          </div>
          {COMPARISON_ROWS.map(([feature, a, b, c, d]) => (
            <div
              key={feature}
              className="grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] gap-2 border-b border-white/[0.04] px-5 py-[14px] text-[13px] transition-colors hover:bg-white/[0.02] sm:px-6"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <div className="text-white">{feature}</div>
              <Cell ok={a} />
              <Cell ok={b} />
              <Cell ok={c} />
              <Cell ok={d} />
            </div>
          ))}
          <div
            className="grid grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))] gap-2 px-5 py-[14px] text-[13px] sm:px-6"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <div className="text-[#64748B] font-mono-tactical text-[12px]">Price</div>
            <div className="text-center text-[#94A3B8]">Free–$$</div>
            <div className="text-center text-[#94A3B8]">Free</div>
            <div className="text-center text-[#94A3B8]">$8/mo</div>
            <div className="text-center font-semibold text-[#36E7A1]">$0–$9.99/mo</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Cell({ ok }: { ok: boolean }) {
  return (
    <div className="flex items-center justify-center text-lg font-bold" aria-label={ok ? 'Yes' : 'No'}>
      {ok ? <span className="text-[#36E7A1]">✓</span> : <span className="text-[#EF4444]">✗</span>}
    </div>
  );
}

function PricingSection() {
  return (
    <section id="pricing" className="scroll-mt-24 px-6 pb-[100px] lg:px-12">
      <div className="mx-auto max-w-[1100px]">
        <h2 className="text-center text-[52px] text-white" style={{ fontFamily: 'var(--font-display)' }}>
          Start Free. Level Up When You&apos;re Ready.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PricingCard
            name="Free"
            price="$0"
            sub="Forever"
            accent="#94A3B8"
            features={[
              'Portfolio overview (1 league)',
              'Basic sit/start verdicts',
              'Weekly boom/bust signals',
              'Waiver wire targets',
            ]}
            cta={{ label: 'Start Free', variant: 'ghost', href: '/auth/signup' }}
          />
          <PricingCard
            name="Rookie"
            price="$5"
            sub="/ month"
            accent="#22D3EE"
            features={[
              'Everything in Free',
              'All leagues portfolio',
              'Full sit/start reasoning',
              'Trade analyzer (10/week)',
              'Rookie rankings',
            ]}
            cta={{ label: 'Start Rookie', variant: 'cyan', href: '/auth/signup?plan=rookie' }}
          />
          <PricingCard
            name="Veteran"
            price="$10"
            sub="/ month"
            accent="#36E7A1"
            features={[
              'Everything in Rookie',
              'Unlimited trade analyzer',
              'Dynasty scouting engine',
              '3-year window view',
              'Arbitrage alerts',
              'Twitter card generator',
            ]}
            cta={{ label: 'Go Veteran', variant: 'green', href: '/auth/signup?plan=veteran' }}
          />
          <PricingCard
            name="All-Pro Terminal"
            price="$20"
            sub="/ month"
            accent="#A78BFA"
            featured
            features={[
              'Everything in Veteran',
              'Full TFO Factor access',
              'AI Dynasty Coach (unlimited)',
              'Dynasty Wrapped',
              'Behavioral trade engine',
              'Prominent trade engine',
            ]}
            cta={{ label: 'Go All-Pro', variant: 'purple', href: '/auth/signup?plan=allpro' }}
          />
        </div>
        <p className="mt-4 text-center text-[12px] text-[#64748B] font-mono-tactical">Cancel anytime. No contracts.</p>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  sub,
  accent,
  features,
  cta,
  featured,
}: {
  name: string;
  price: string;
  sub: string;
  accent: string;
  features: string[];
  cta: { label: string; href: string; variant: 'ghost' | 'cyan' | 'green' | 'purple' };
  featured?: boolean;
}) {
  const btnStyles: Record<typeof cta.variant, CSSProperties> = {
    ghost: {
      border: '1px solid rgba(255,255,255,0.15)',
      color: '#fff',
      background: 'transparent',
    },
    cyan: {
      background: '#22D3EE',
      color: '#060910',
      fontWeight: 700,
    },
    green: {
      background: '#36E7A1',
      color: '#060910',
      fontWeight: 700,
    },
    purple: {
      background: '#A78BFA',
      color: '#060910',
      fontWeight: 700,
    },
  };

  return (
    <div
      className="glass-panel relative flex h-full flex-col rounded-2xl p-7"
      style={
        featured
          ? { border: '2px solid #A78BFA', borderRadius: '16px' }
          : undefined
      }
    >
      {featured && (
        <div
          className="absolute right-0 top-0 rounded-bl-lg rounded-tr-2xl px-2.5 py-1 text-[10px] font-bold uppercase text-white"
          style={{ background: '#A78BFA' }}
        >
          FEATURED
        </div>
      )}
      <p className="text-[11px] font-bold uppercase tracking-wide text-[#64748B] font-mono-tactical" style={{ color: accent }}>
        {name}
      </p>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
          {price}
        </span>
        <span className="text-sm text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
          {sub}
        </span>
      </div>
      <ul className="mt-6 flex flex-grow flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex gap-2 text-[13px] text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
            <span className="text-[#36E7A1]">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={cta.href}
        className="mt-8 block w-full rounded-lg py-3 text-center text-[13px] transition-opacity hover:opacity-90"
        style={{
          ...btnStyles[cta.variant],
          fontFamily: 'var(--font-body)',
        }}
      >
        {cta.label}
      </Link>
    </div>
  );
}

function StatsBannerSection() {
  return (
    <section
      className="border-y py-[60px]"
      style={{
        background: 'rgba(54,231,161,0.04)',
        borderColor: 'rgba(54,231,161,0.1)',
      }}
    >
      <div className="mx-auto flex max-w-[900px] flex-col items-center justify-center gap-12 px-6 md:flex-row md:gap-20 lg:px-12">
        <div className="text-center md:text-left">
          <div className="text-[64px] leading-none text-[#36E7A1]" style={{ fontFamily: 'var(--font-display)' }}>
            13.4%
          </div>
          <div className="mt-2 text-[13px] font-bold uppercase tracking-[0.1em] text-[#64748B] font-mono-tactical">
            Sit/Start Edge
          </div>
          <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Validated accuracy over ECR (2023 Data).
          </p>
        </div>
        <div className="text-center md:text-left">
          <div className="text-[13px] font-bold text-[#22D3EE] font-mono-tactical">VERIFIED ✓</div>
          <div className="mt-1 text-[48px] leading-none text-[#22D3EE]" style={{ fontFamily: 'var(--font-display)' }}>
            42-18-2 RECORD
          </div>
          <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Performance data pulled directly from active Sleeper leagues.
          </p>
        </div>
        <div className="max-w-[260px] text-center md:text-left">
          <div className="text-[32px]">⚙️</div>
          <div className="mt-2 text-[13px] font-bold uppercase tracking-wide text-[#A78BFA] font-mono-tactical">
            Refinement Feedback Loop
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
            100% transparency. Every miss fuels a model adjustment.
          </p>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer
      id="resources"
      className="scroll-mt-24 border-t border-white/[0.06] px-6 py-12"
      style={{ background: 'rgba(0,0,0,0.3)' }}
    >
      <div className="mx-auto flex max-w-[1200px] flex-col items-center justify-between gap-8 md:flex-row md:items-start">
        <div className="flex flex-col items-center gap-2 md:items-start">
          <img src="/images/logo-full2.png" height={36} alt="Boom or Bust" className="h-9 w-auto object-contain opacity-90" />
          <p className="text-center text-[12px] text-[#64748B] md:text-left" style={{ fontFamily: 'var(--font-body)' }}>
            Dynasty intelligence for serious managers.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-[12px] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
          <Link href="#" className="transition-colors hover:text-[#94A3B8]">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-[#94A3B8]">
            Terms
          </Link>
          <Link href="#contact" className="transition-colors hover:text-[#94A3B8]">
            Contact
          </Link>
        </div>
        <p id="contact" className="text-[12px] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
          © 2025 Boom or Bust. Built for dynasty.
        </p>
      </div>
    </footer>
  );
}
