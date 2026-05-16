'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
// bg:       #0a0d14
// green:    #36E7A1
// purple:   #7c3aed  /  light #A78BFA
// cyan:     #22D3EE
// amber:    #FBBF24
// mono:     JetBrains Mono
// display:  Bebas Neue
// body:     Inter
// glass:    backdrop-blur-[24px] bg-white/[0.03] border border-white/[0.08] rounded-xl

/* ─────────────────────────────────────────────
   ANIMATED COUNTER
───────────────────────────────────────────── */
function useCountUp(target: number, duration = 1400, decimals = 0) {
  const [value, setValue] = useState(0);
  const ref = useRef(false);
  useEffect(() => {
    if (ref.current) return;
    ref.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(parseFloat((ease * target).toFixed(decimals)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, decimals]);
  return value;
}

/* ─────────────────────────────────────────────
   NAV
───────────────────────────────────────────── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(10,13,20,0.98)' : 'rgba(10,13,20,0.80)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        boxShadow: scrolled ? '0 8px 32px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between px-6 lg:px-10">
        {/* LOGO */}
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-full2.png"
            alt="Boom or Bust"
            width={160}
            height={44}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* NAV LINKS */}
        <nav className="hidden lg:flex items-center gap-8">
          {['Features', 'How it Works', 'Pricing', 'Resources'].map((l, i) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/ /g, '-')}`}
              className="text-[14px] text-white/50 hover:text-white transition-colors duration-200"
            >
              {l}{i === 3 ? ' ▾' : ''}
            </a>
          ))}
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex text-[14px] text-white/60 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/25 transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 text-[14px] font-bold text-black px-5 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-px"
            style={{
              background: '#36E7A1',
              boxShadow: '0 0 28px rgba(54,231,161,0.35)',
            }}
          >
            Import FB / Leagues
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD MOCKUP (hero right side)
───────────────────────────────────────────── */
function DashMockup() {
  const score1 = useCountUp(52.4, 1600, 1);
  const score2 = useCountUp(18.4, 1800, 1);
  const score3 = useCountUp(73, 1500, 0);

  const players = [
    { name: 'J. Jefferson', pos: 'WR', team: 'MIN', score: 92, color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' },
    { name: 'T. McLaurin', pos: 'WR', team: 'WAS', score: 88, color: '#22D3EE', bg: 'rgba(34,211,238,0.12)' },
    { name: 'Jonathan Taylor', pos: 'RB', team: 'IND', score: 90, color: '#36E7A1', bg: 'rgba(54,231,161,0.12)' },
    { name: 'S. LaPorta', pos: 'TE', team: 'DET', score: 81, color: '#A78BFA', bg: 'rgba(167,139,250,0.12)' },
  ];

  const stats = [
    { label: 'START % ACCURACY', val: score1, suffix: '', color: '#36E7A1' },
    { label: 'PROJ. POINTS VS ACTUAL', val: score2, prefix: '+', color: '#FBBF24' },
    { label: 'WIN RATE IMPACT', val: score3, suffix: '%', color: '#22D3EE' },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: '#0f1220',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(54,231,161,0.04)',
      }}
    >
      {/* Browser chrome */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ background: '#161926', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex gap-1.5">
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
          ))}
        </div>
        <div
          className="flex-1 ml-2 rounded-md px-3 py-1 text-[11px] text-white/25"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'JetBrains Mono, monospace' }}
        >
          boomorbust.app/dashboard
        </div>
      </div>

      <div className="p-4">
        {/* Greeting */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/40 text-[11px] mb-0.5">Good Morning, League! 🏆</p>
            <p className="text-white/25 text-[10px]">Week 6 Projections Overview</p>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-3"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[9px] text-white/35 mb-1 uppercase tracking-wider">{s.label}</p>
              <p
                className="text-[22px] font-bold leading-none"
                style={{ color: s.color, fontFamily: 'JetBrains Mono, monospace' }}
              >
                {s.prefix}{s.val}{s.suffix}
              </p>
            </div>
          ))}
        </div>

        {/* Player cards */}
        <p className="text-[9px] text-white/30 uppercase tracking-wider mb-2">This Week's Top Starts</p>
        <div className="grid grid-cols-4 gap-2">
          {players.map((p) => (
            <div
              key={p.name}
              className="rounded-xl p-2.5 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span
                className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1.5"
                style={{ background: p.bg, color: p.color }}
              >
                {p.pos}
              </span>
              <p className="text-[9px] text-white/70 font-semibold leading-tight mb-0.5">{p.name}</p>
              <p className="text-[8px] text-white/30 mb-1">{p.team}</p>
              <p className="text-[18px] font-bold" style={{ color: '#36E7A1', fontFamily: 'JetBrains Mono, monospace' }}>
                {p.score}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom stats bar */}
      <div
        className="grid grid-cols-5 divide-x"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', divideColor: 'rgba(255,255,255,0.06)' }}
      >
        {[
          { label: 'TOP SLEEPER', val: 'sleeper', special: true },
          { label: 'START ACCURACY', val: '84%' },
          { label: 'CONSISTENT EDGE', val: '80%' },
          { label: 'RECORD', val: '42-18-2' },
          { label: 'TIME SAVED', val: '5.3 Weeks' },
        ].map((s) => (
          <div key={s.label} className="p-2.5 text-center" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
            {s.special ? (
              <p className="text-white font-bold text-[11px]" style={{ fontFamily: 'Bebas Neue, sans-serif', letterSpacing: '2px' }}>
                sleeper
              </p>
            ) : (
              <p className="text-[13px] font-bold" style={{ color: '#36E7A1', fontFamily: 'JetBrains Mono, monospace' }}>
                {s.val}
              </p>
            )}
            <p className="text-[8px] text-white/30 uppercase tracking-wider mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FEATURES DATA
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: '▦', iconColor: '#A78BFA', iconBg: 'rgba(167,139,250,0.12)',
    title: 'Import Dashboard',
    body: 'Sync your leagues and see everything in one clean dashboard.',
    link: 'See all leagues →',
  },
  {
    icon: '◎', iconColor: '#36E7A1', iconBg: 'rgba(54,231,161,0.12)',
    title: 'Start/Sit Optimiser',
    body: 'AI-powered recommendations based on projections, matchups, and trends.',
    link: 'Optimise lineup →',
  },
  {
    icon: '⇄', iconColor: '#22D3EE', iconBg: 'rgba(34,211,238,0.12)',
    title: 'Trade Analyzer',
    body: 'Know who wins every trade with fair value & context.',
    link: 'Analyse a trade →',
  },
  {
    icon: '⚡', iconColor: '#FBBF24', iconBg: 'rgba(251,191,36,0.12)',
    title: 'Waiver Wire Targets',
    body: 'Find undervalued players before your league mates do.',
    link: 'View targets →',
  },
  {
    icon: '🔭', iconColor: '#A78BFA', iconBg: 'rgba(167,139,250,0.12)',
    title: 'Dynasty Strategy Engine',
    body: 'Tools for contending, rebuilding, and long-term rosters.',
    link: 'Get my strategy →',
  },
  {
    icon: '★', iconColor: '#FBBF24', iconBg: 'rgba(251,191,36,0.12)',
    title: 'Rookie Pick Intelligence',
    body: 'Scout rookies, monitor value, and predict breakouts.',
    link: 'View rookie board →',
  },
  {
    icon: '≡', iconColor: '#36E7A1', iconBg: 'rgba(54,231,161,0.12)',
    title: 'Smart Rankings',
    body: 'Expert rankings based on form, matchups, and injury news.',
    link: 'View rankings →',
  },
  {
    icon: '📊', iconColor: '#22D3EE', iconBg: 'rgba(34,211,238,0.12)',
    title: 'Advanced Analytics',
    body: 'Visual trends, player ranges, and matchup heatmaps.',
    link: 'Explore data →',
  },
  {
    icon: '🏥', iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.12)',
    title: 'Injury Tracker',
    body: 'Real-time injury updates that impact your lineup.',
    link: 'Check injuries →',
  },
];

/* ─────────────────────────────────────────────
   COMPARISON TABLE DATA
───────────────────────────────────────────── */
const COMPARE_ROWS = [
  'Multi-league portfolio',
  'Personalized dashboard',
  'Trade analyzer',
  'Start/sit optimizer',
  'Dynasty tools',
  'Injury tracker',
  'Custom logic',
  'Tool sync',
];

/* ─────────────────────────────────────────────
   TESTIMONIALS
───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    handle: 'Alex K.', sub: '@DynastyGrind',
    text: 'Finally a platform that actually works for serious players. This is a cheat code.',
    badge: 'Verified Sleeper',
  },
  {
    handle: 'Mike L.', sub: '@FFdynastyGoat',
    text: 'The accuracy of the tools is insane. I went from average to top 2.',
    badge: 'Verified Sleeper',
  },
  {
    handle: 'Ben T.', sub: '@DynastyBen',
    text: 'Trade analyzer is a game changer. Saved me from bad deals.',
    badge: 'Verified Sleeper',
  },
  {
    handle: 'Tyler W.', sub: '@DynastyTyler',
    text: 'Best $35 I spend every season. The edge is real.',
    badge: 'Verified Sleeper',
  },
];

/* ─────────────────────────────────────────────
   PRICING
───────────────────────────────────────────── */
const PRICING = [
  {
    name: 'Free', price: '$0', sub: '', featured: false,
    features: ['AI features', 'Media features', 'Coolout features', 'Kaliroad features', 'Coolest accuracy'],
    cta: 'Get Started', href: '/auth/signup',
  },
  {
    name: 'Rookie', price: '$5', sub: '/mo', featured: false,
    features: ['Basic features', 'Trade Analyzer', 'Start/Sit optimizer', 'Waiver tools', 'Dynasty Basics'],
    cta: "Start Free Trial", href: '/auth/signup',
  },
  {
    name: 'Veteran', price: '$10', sub: '/mo', featured: false,
    features: ['All Rookie features', 'Dynasty Engine', 'Advanced Analytics', 'Injury Tracker', 'Full Trost Factor'],
    cta: "Start Free Trial", href: '/auth/signup',
  },
  {
    name: 'All-Pro Terminal', price: '$35', sub: '/mo', featured: true,
    features: ['All Veteran features', 'Dynasty Engine', 'Portfolio Manager', 'Priority Support', 'Prominent Trade engine'],
    cta: 'Get All-Pro', href: '/auth/signup',
  },
];

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ background: '#0a0d14', minHeight: '100vh', color: '#fff', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* Ambient background glows */}
      <div className="fixed pointer-events-none" style={{ top: -300, left: -300, width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(54,231,161,0.05) 0%, transparent 70%)', zIndex: 0 }} />
      <div className="fixed pointer-events-none" style={{ top: -300, right: -300, width: 800, height: 800, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)', zIndex: 0 }} />

      <LandingNav />

      {/* ───── HERO ───── */}
      <section
        className="relative z-10 pt-16 min-h-screen flex items-center"
        style={{ paddingBottom: '0' }}
      >
        <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-10 grid lg:grid-cols-2 gap-12 items-center py-20">

          {/* LEFT */}
          <div>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full"
              style={{ background: 'rgba(54,231,161,0.08)', border: '1px solid rgba(54,231,161,0.18)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#36E7A1] animate-pulse" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#36E7A1]">
                Built for Fantasy Players
              </span>
            </div>

            {/* HEADLINE */}
            <h1 style={{ fontFamily: 'Bebas Neue, sans-serif', lineHeight: 0.88, marginBottom: 20 }}>
              <span
                className="block"
                style={{ fontSize: 'clamp(52px, 8vw, 108px)' }}
              >
                <span style={{ color: '#fff' }}>DRAFT THE </span>
                <span style={{
                  background: 'linear-gradient(90deg, #36E7A1 0%, #7c3aed 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>BOOM</span>
              </span>
              <span
                className="block"
                style={{ fontSize: 'clamp(52px, 8vw, 108px)' }}
              >
                <span style={{ color: '#fff' }}>DODGE THE </span>
                <span style={{
                  background: 'linear-gradient(90deg, #7c3aed 0%, #A78BFA 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>BUST</span>
              </span>
              {/* Tagline */}
              <span
                className="block mt-3"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 400,
                  fontSize: 'clamp(13px, 1.4vw, 17px)',
                  letterSpacing: '0.2em',
                  color: 'rgba(255,255,255,0.38)',
                }}
              >
                — Your fantasy edge, every single week —
              </span>
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.52)', maxWidth: 480, marginBottom: 32, marginTop: 20 }}>
              Sync your fantasy leagues and get personalised sit/start decisions, real-time analytics, and weekly insights — built specifically for your teams.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4 mb-8">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 font-bold text-black px-8 py-4 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: '#36E7A1', fontSize: 15, boxShadow: '0 0 40px rgba(54,231,161,0.35)' }}
              >
                🏈 Import My Leagues
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center gap-2 font-semibold text-white px-8 py-4 rounded-xl transition-all duration-200 hover:border-white/40"
                style={{ fontSize: 15, border: '1px solid rgba(255,255,255,0.18)', background: 'transparent' }}
              >
                <span style={{ color: '#36E7A1' }}>▶</span> See It In Action
              </Link>
            </div>

            {/* Trust */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>
              <span className="flex items-center gap-1.5"><span style={{ color: '#36E7A1' }}>✓</span> iOS &amp; Free to Start</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span>No Credit Card</span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
              <span className="flex items-center gap-1.5"><span style={{ color: '#36E7A1' }}>✓</span> Secure with Sleeper</span>
            </div>
          </div>

          {/* RIGHT — DASHBOARD MOCKUP */}
          <div>
            <DashMockup />
          </div>
        </div>
      </section>

      {/* ───── STATS BAR ───── */}
      <div
        className="relative z-10"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between flex-wrap gap-6">
          {[
            { val: 'sleeper', label: 'TOP SLEEPER', special: true },
            { val: '84%', label: 'DMS Accuracy' },
            { val: '80%', label: 'Breakout Detection Rate' },
            { val: '42-18-2', label: 'Verified Record' },
            { val: '5.3 Weeks', label: 'Avg Market Lead Time' },
            { val: '★★★★★', label: 'Trusted by Dynasty Managers', star: true },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center gap-6">
              <div className="text-center">
                {s.special ? (
                  <div style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 20, letterSpacing: 3, color: '#fff' }}>sleeper</div>
                ) : (
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700, color: s.star ? '#36E7A1' : '#36E7A1' }}>
                    {s.val}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', marginTop: 2 }}>{s.label}</div>
              </div>
              {i < arr.length - 1 && (
                <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.08)' }} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ───── HOW IT WORKS ───── */}
      <section className="relative z-10 py-24 px-6 lg:px-10">
        <div className="max-w-[900px] mx-auto text-center">
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(28px,4vw,48px)', letterSpacing: 3, marginBottom: 48, color: '#fff' }}>
            FROM SYNC TO DOMINANCE IN 3<span style={{ color: '#36E7A1' }}>0</span> SECONDS
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { n: '1', icon: '☁', title: 'Import Your Leagues', body: 'Securely connect your league(s) in seconds.' },
              { n: '2', icon: '🧠', title: 'We Analyse Everything', body: 'Rankings, projections, trends, and matchup edges.' },
              { n: '3', icon: '🎯', title: 'Get Statistically Coached', body: 'Start/sit, trade, and lineup advice — every week.' },
            ].map((s, i) => (
              <div key={s.n} className="relative flex flex-col items-center text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                  style={{ background: 'rgba(54,231,161,0.15)', border: '1px solid rgba(54,231,161,0.3)', fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {s.n}
                </div>
                {i < 2 && (
                  <div
                    className="hidden sm:block absolute top-6 left-[calc(50%+32px)] right-[-calc(50%-32px)]"
                    style={{ height: 1, background: 'rgba(255,255,255,0.1)', width: 'calc(100% - 64px)' }}
                  />
                )}
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FEATURES GRID ───── */}
      <section id="features" className="relative z-10 py-16 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto">
          <h2 className="text-center mb-12" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(24px,3.5vw,42px)', letterSpacing: 3, color: '#fff' }}>
            EVERYTHING YOU NEED TO WIN—IN ONE PLACE
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4"
                  style={{ background: f.iconBg, color: f.iconColor }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 6 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.48)', lineHeight: 1.6, marginBottom: 12 }}>{f.body}</p>
                <span style={{ fontSize: 12, color: '#36E7A1', cursor: 'pointer' }}>{f.link}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── COMPARISON TABLE + DIFFERENTIATORS ───── */}
      <section className="relative z-10 py-20 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-16 items-start">

          {/* LEFT: differentiators */}
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(26px,4vw,52px)', letterSpacing: 2, lineHeight: 0.95, color: '#fff', marginBottom: 20 }}>
              MOST TOOLS GIVE RANKINGS.<br />
              <span style={{ color: '#36E7A1' }}>WE GIVE DECISIONS.</span>
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.48)', lineHeight: 1.65, marginBottom: 24, maxWidth: 420 }}>
              Boom or Bust is the only platform built to help you actually act on your rankings.
            </p>
            {[
              'Personalized tools',
              'Expert-built models',
              'Consistent edge',
              'Built for real fantasy winners',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 mb-3">
                <span style={{ color: '#36E7A1', fontSize: 14 }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{item}</span>
              </div>
            ))}
          </div>

          {/* RIGHT: table */}
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="grid grid-cols-3 text-center" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="p-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">Feature</div>
              <div className="p-3 text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#36E7A1', background: 'rgba(54,231,161,0.06)', borderLeft: '1px solid rgba(54,231,161,0.15)' }}>
                BOOM OR BUST
              </div>
              <div className="p-3 text-[11px] font-semibold uppercase tracking-wider text-white/40 border-l border-white/[0.08]">Others</div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div
                key={row}
                className="grid grid-cols-3 text-center"
                style={{ borderBottom: i < COMPARE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}
              >
                <div className="p-3 text-[13px] text-white/60 text-left pl-4">{row}</div>
                <div className="p-3" style={{ background: 'rgba(54,231,161,0.04)', borderLeft: '1px solid rgba(54,231,161,0.1)' }}>
                  <span style={{ color: '#36E7A1', fontSize: 14 }}>✓</span>
                </div>
                <div className="p-3 border-l border-white/[0.05]">
                  <span style={{ color: '#EF4444', fontSize: 14 }}>✗</span>
                </div>
              </div>
            ))}
            <div className="grid grid-cols-3 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div className="p-3 text-[12px] text-white/40 text-left pl-4">Price</div>
              <div className="p-3 text-[12px] font-bold" style={{ color: '#36E7A1', background: 'rgba(54,231,161,0.06)', borderLeft: '1px solid rgba(54,231,161,0.1)' }}>
                $0–$35/mo
              </div>
              <div className="p-3 text-[12px] text-white/40 border-l border-white/[0.05]">$5–$20/mo</div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── PORTFOLIO SECTION ───── */}
      <section className="relative z-10 py-20 px-6 lg:px-10">
        <div className="max-w-[1400px] mx-auto grid lg:grid-cols-2 gap-12 items-center">

          {/* LEFT: portfolio mockup card */}
          <div
            className="rounded-2xl p-6"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Your Portfolio Overview</p>
              </div>
            </div>
            <div className="mb-4">
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 32, fontWeight: 700, color: '#36E7A1', lineHeight: 1 }}>42-18-2</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>VERIFIED RECORD</p>
            </div>
            {/* Bar chart */}
            <div className="mb-4">
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Last 10 Week Record</p>
              <div className="flex items-end gap-1.5 h-16">
                {[65, 80, 55, 90, 72, 85, 60, 95, 70, 88].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${h}%`,
                      background: i % 3 === 0 ? '#36E7A1' : i % 3 === 1 ? '#FBBF24' : 'rgba(255,255,255,0.15)',
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Top categories */}
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Top Categories vs League Avg</p>
              {[
                { label: 'Start/Sit Accuracy', val: '+18.4', color: '#36E7A1' },
                { label: 'Waiver Wins', val: '+22.7%', color: '#36E7A1' },
                { label: 'Trade Wins', val: '+16.1%', color: '#36E7A1' },
                { label: 'Matchup Wins', val: '+13.8%', color: '#36E7A1' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{r.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: r.color, fontFamily: 'JetBrains Mono, monospace' }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: copy */}
          <div>
            <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(28px,4vw,52px)', letterSpacing: 2, lineHeight: 0.95, color: '#fff', marginBottom: 20 }}>
              YOU DON'T MANAGE<br />ONE TEAM.<br />
              <span style={{ color: '#36E7A1' }}>YOU MANAGE A PORTFOLIO.</span>
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.52)', lineHeight: 1.7, marginBottom: 24 }}>
              See the big picture. Consolidate data, insights, projections, and lineup decisions.
            </p>
            {[
              'Track player performance across leagues',
              'Identify trends and common sleepers',
              'Optimize the time you have (not just one team)',
              'Make better strategic calls for matchups',
            ].map((item) => (
              <div key={item} className="flex items-start gap-3 mb-3">
                <span style={{ color: '#36E7A1', fontSize: 14, marginTop: 2 }}>✓</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{item}</span>
              </div>
            ))}
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 mt-6 font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-px"
              style={{ background: 'transparent', border: '1px solid #36E7A1', color: '#36E7A1', fontSize: 14 }}
            >
              Start 7-Day Free Trial →
            </Link>
          </div>
        </div>
      </section>

      {/* ───── REAL ANALYSIS ───── */}
      <section className="relative z-10 py-20 px-6 lg:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1000px] mx-auto text-center">
          <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(24px,3.5vw,42px)', letterSpacing: 3, color: '#fff', marginBottom: 8 }}>
            BUILT ON REAL ANALYSIS—NOT JUST PROJECTIONS
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginBottom: 40 }}>
            Every recommendation analyzes, adjusting and confidence feedback so you can trust your calls.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: '📈', label: 'Player Usage Trends' },
              { icon: '🎯', label: 'Matchup Difficulty' },
              { icon: '💰', label: 'Market Value Shifts' },
              { icon: '⚡', label: 'Injury Impact' },
              { icon: '🏈', label: 'Project Schedules' },
              { icon: '⚙️', label: 'Team & League Settings' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 px-5 py-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── DYNASTY STATS ───── */}
      <section className="relative z-10 py-20 px-6 lg:px-10">
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-center mb-12" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(24px,3.5vw,42px)', letterSpacing: 3, color: '#fff' }}>
            BUILT FOR SERIOUS DYNASTY PLAYERS
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(54,231,161,0.05)', border: '1px solid rgba(54,231,161,0.2)', boxShadow: '0 0 40px rgba(54,231,161,0.08)' }}
            >
              <p style={{ fontSize: 11, color: 'rgba(54,231,161,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>Sit/Start Edge</p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 52, fontWeight: 700, color: '#36E7A1', lineHeight: 1 }}>13.4%</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 12, lineHeight: 1.5 }}>Validated Accuracy over ECR (2025 Data).</p>
            </div>
            {/* Card 2 */}
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.2)', boxShadow: '0 0 40px rgba(34,211,238,0.08)' }}
            >
              <p style={{ fontSize: 11, color: 'rgba(34,211,238,0.6)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 8 }}>
                Verified <span style={{ color: '#22D3EE' }}>✓</span>
              </p>
              <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 52, fontWeight: 700, color: '#22D3EE', lineHeight: 1 }}>42-18-2</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#22D3EE', marginTop: 4 }}>VERIFIED RECORD</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 8, lineHeight: 1.5 }}>Performance data pulled directly from active sleeper leagues.</p>
            </div>
            {/* Card 3 */}
            <div
              className="rounded-2xl p-8"
              style={{ background: 'rgba(167,139,250,0.05)', border: '1px solid rgba(167,139,250,0.2)', boxShadow: '0 0 40px rgba(167,139,250,0.08)' }}
            >
              <div className="text-4xl mb-4" style={{ color: '#A78BFA' }}>⚙️</div>
              <p style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 22, letterSpacing: 2, color: '#fff', lineHeight: 1.1, marginBottom: 8 }}>
                REFINEMENT<br />FEEDBACK LOOP
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>100% transparency. Every miss fuels a model adjustment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ───── TESTIMONIALS ───── */}
      <section className="relative z-10 py-20 px-6 lg:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-center mb-12" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(22px,3vw,38px)', letterSpacing: 3, color: '#fff' }}>
            LOVED BY DYNASTY MANAGERS
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.handle}
                className="p-5 rounded-xl flex flex-col gap-3"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{ background: 'rgba(54,231,161,0.15)', color: '#36E7A1' }}
                  >
                    {t.handle[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{t.handle}</p>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{t.sub}</p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>&ldquo;{t.text}&rdquo;</p>
                <span
                  className="self-start text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: 'rgba(54,231,161,0.12)', color: '#36E7A1' }}
                >
                  {t.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Loved by players bar */}
          <div className="text-center mb-6">
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 16 }}>Loved by Players</p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              {['sleeper', 'FantasyPros', 'DYNASTY NERDS', 'FOOTBALLGUYS'].map((brand) => (
                <span
                  key={brand}
                  style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}
                >
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── PRICING ───── */}
      <section id="pricing" className="relative z-10 py-20 px-6 lg:px-10" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1100px] mx-auto">
          <h2 className="text-center mb-3" style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(24px,3.5vw,42px)', letterSpacing: 3, color: '#fff' }}>
            START FREE. UPGRADE WHEN YOU'RE READY.
          </h2>
          <p className="text-center mb-12" style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
            No contracts. Cancel anytime.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className="relative rounded-2xl p-6 flex flex-col"
                style={{
                  background: p.featured ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.03)',
                  border: p.featured ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  boxShadow: p.featured ? '0 0 60px rgba(124,58,237,0.15)' : 'none',
                  transform: p.featured ? 'scale(1.02)' : 'none',
                }}
              >
                {p.featured && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-[11px] font-bold px-4 py-1 rounded-full"
                    style={{ background: '#7c3aed', color: '#fff', whiteSpace: 'nowrap' }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)', marginBottom: 12 }}>
                  {p.name}
                </p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 40, fontWeight: 700, color: '#fff' }}>{p.price}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>{p.sub}</span>
                </div>
                <ul className="flex-1 mb-6 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span style={{ color: '#36E7A1', fontSize: 13, marginTop: 1 }}>✓</span>
                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className="text-center font-bold py-3 rounded-xl transition-all duration-200 hover:-translate-y-px"
                  style={{
                    display: 'block',
                    fontSize: 14,
                    background: p.featured ? '#36E7A1' : 'transparent',
                    color: p.featured ? '#000' : '#fff',
                    border: p.featured ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    boxShadow: p.featured ? '0 0 32px rgba(54,231,161,0.3)' : 'none',
                  }}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FINAL CTA ───── */}
      <section className="relative z-10 py-28 px-6 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(54,231,161,0.04) 0%, transparent 70%)' }}
        />
        <h2 style={{ fontFamily: 'Bebas Neue, sans-serif', fontSize: 'clamp(36px,6vw,80px)', letterSpacing: 4, color: '#fff', marginBottom: 12 }}>
          STOP GUESSING. <span style={{ color: '#36E7A1' }}>START WINNING.</span>
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 40 }}>
          Don&apos;t over think. Use data. Win more.
        </p>
        <Link
          href="/auth/signup"
          className="inline-flex items-center gap-2 font-black text-black px-12 py-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
          style={{ background: '#36E7A1', fontSize: 17, boxShadow: '0 0 60px rgba(54,231,161,0.4)' }}
        >
          🏈 Import My Leagues
        </Link>
      </section>

      {/* ───── FOOTER ───── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '40px 40px 32px' }}>
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
            {/* Brand col */}
            <div className="col-span-2 lg:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <Image src="/logo-full2.png" alt="Boom or Bust" width={140} height={38} className="h-9 w-auto object-contain" />
              </Link>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                Your fantasy edge, every single week.
              </p>
            </div>
            {/* Link cols */}
            {[
              { heading: 'Features', links: ['Import Dashboard', 'Trade Analyzer', 'Start/Sit', 'Waiver Wire'] },
              { heading: 'How it Works', links: ['Getting Started', 'Sleeper Sync', 'Formula Engine', 'Pricing'] },
              { heading: 'Resources', links: ['Blog', 'Resp fiends', 'Careers'] },
              { heading: 'Privacy', links: ['Privacy', 'Terms'] },
            ].map((col) => (
              <div key={col.heading}>
                <p style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                  {col.heading}
                </p>
                {col.links.map((l) => (
                  <a key={l} href="#" className="block mb-2.5 hover:text-white transition-colors" style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>© 2025 Boom or Bust. All rights reserved.</p>
            {/* Social icons */}
            <div className="flex items-center gap-5">
              {['𝕏', 'Discord', 'YT'].map((s) => (
                <a key={s} href="#" className="hover:text-white transition-colors" style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
                  {s}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
