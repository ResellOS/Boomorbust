'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

/* ─── Hooks ─────────────────────────────────────────────────────── */
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

function useCountUp(target: number, duration: number, trigger: boolean) {
  const [count, setCount] = useState(0);
  const raf = useRef<number | null>(null);
  const start = useRef<number | null>(null);

  const tick = useCallback((now: number) => {
    if (start.current === null) start.current = now;
    const elapsed = now - start.current;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setCount(Math.round(eased * target));
    if (progress < 1) raf.current = requestAnimationFrame(tick);
  }, [target, duration]);

  useEffect(() => {
    if (!trigger) return;
    start.current = null;
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [trigger, tick]);

  return count;
}

/* ─── Nav ─────────────────────────────────────────────────────────── */
function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={clsx(
      'fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b border-white/5 transition-all duration-300',
      scrolled ? 'bg-[#0A0A0F]/95 shadow-lg shadow-black/30' : 'bg-[#0A0A0F]/40'
    )}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1 shrink-0">
          <span className="text-white font-black text-lg tracking-tight">Boom</span>
          <span className="text-[#6366F1] font-black text-lg tracking-tight mx-0.5">or</span>
          <span className="text-white font-black text-lg tracking-tight">Bust.</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {[['#features', 'Features'], ['#coach', 'AI Coach'], ['#pricing', 'Pricing']].map(([href, label]) => (
            <a key={href} href={href} className="text-sm text-[#94A3B8] hover:text-white transition">{label}</a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/auth/login" className="text-sm text-[#94A3B8] hover:text-white transition px-4 py-2">
            Sign in
          </Link>
          <Link href="/auth/signup" className="bg-[#6366F1] hover:bg-[#5254cc] text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
            Get started free
          </Link>
        </div>

        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          <span className={clsx('block w-5 h-0.5 bg-white transition-all duration-200', open && 'rotate-45 translate-y-2')} />
          <span className={clsx('block w-5 h-0.5 bg-white transition-all duration-200', open && 'opacity-0')} />
          <span className={clsx('block w-5 h-0.5 bg-white transition-all duration-200', open && '-rotate-45 -translate-y-2')} />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-[#0A0A0F]/98 border-t border-white/5 px-6 py-6 flex flex-col gap-5">
          {[['#features', 'Features'], ['#coach', 'AI Coach'], ['#pricing', 'Pricing']].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="text-[#CBD5E1] text-sm">{label}</a>
          ))}
          <Link href="/auth/login" className="text-[#CBD5E1] text-sm">Sign in</Link>
          <Link href="/auth/signup" className="bg-[#6366F1] text-white text-sm font-semibold px-5 py-3 rounded-lg text-center">
            Get started free
          </Link>
        </div>
      )}
    </header>
  );
}

/* ─── Ticker ──────────────────────────────────────────────────────── */
const TICKER_ITEMS = [
  'Trade Analyzer', 'Injury Alerts', 'Dynasty Coach ✦', 'Handcuff Tracker',
  'Pick Advisor', 'Lineup Optimizer', 'Trade Finder', 'Portfolio View',
  'KTC Values', 'Season Wrapped', 'Win Window', 'Leaguemate Intel',
];

function Ticker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/5 bg-[#0A0A0F] py-3">
      <div className="flex gap-10 whitespace-nowrap" style={{ animation: 'ticker 30s linear infinite' }}>
        {items.map((item, i) => (
          <span key={i} className="text-xs font-semibold uppercase tracking-widest text-[#475569] shrink-0">
            {item} <span className="text-[#6366F1]/40 mx-3">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Features data ────────────────────────────────────────────────── */
const FEATURES = [
  {
    tag: 'Roster Intelligence',
    title: 'Every league. One command center.',
    body: 'Stop tabbing between apps. See all your Sleeper rosters, injury statuses, KTC values, and waiver alerts in a single dashboard built for managers running multiple leagues.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="11" height="11" rx="2" /><rect x="18" y="3" width="11" height="11" rx="2" />
        <rect x="3" y="18" width="11" height="11" rx="2" /><rect x="18" y="18" width="11" height="11" rx="2" />
      </svg>
    ),
  },
  {
    tag: 'Trade Analysis',
    title: 'Know the exact value of every deal.',
    body: 'KTC-powered trade analysis with age curve penalties, positional need scoring, and future value weighting. Stop second-guessing. Know before you send.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 20l-5-5 5-5M24 12l5 5-5 5M19 5l-6 22" />
      </svg>
    ),
  },
  {
    tag: 'Injury Protection',
    title: 'Never get caught without a handcuff.',
    body: 'Real-time injury alerts ranked by severity. Automatic handcuff tracker shows who owns each backup across every league. The waiver wire win is the one you make before anyone else.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 3l2.5 8h8.5l-6.8 5 2.5 8L16 19l-6.7 5 2.5-8L5 11h8.5z" />
      </svg>
    ),
  },
  {
    tag: 'Pick Intelligence',
    title: 'Future picks are currency. Spend them right.',
    body: 'The draft pick advisor maps every traded pick you own across all leagues against current KTC slot values. Know which picks to sell high, hold, or target now.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <circle cx="16" cy="16" r="12" /><path d="M16 9v7l4 4" />
      </svg>
    ),
  },
  {
    tag: 'Lineup Decisions',
    title: 'Start. Sit. Win.',
    body: 'Week-by-week lineup recommendations powered by FantasyPros projections, matchup data, and weather impact scoring. No more gut-call regrets on Sunday.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 8h24M4 16h16M4 24h10" />
      </svg>
    ),
  },
  {
    tag: 'Leaguemate Profiles',
    title: 'Know your opponents better than they know themselves.',
    body: 'Dynasty archetypes, trade tendencies, positional needs, and AI-generated pitch angles for every manager in your league. Walk into every negotiation with the edge.',
    icon: (
      <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="10" r="4" /><circle cx="22" cy="13" r="3" />
        <path d="M4 26c0-4.4 3.6-8 8-8s8 3.6 8 8" /><path d="M22 19c2.2 0 6 1.1 6 4" />
      </svg>
    ),
  },
];

/* ─── Pricing ─────────────────────────────────────────────────────── */
const PLANS = [
  {
    name: 'Pro',
    price: '$9',
    sub: 'per month',
    accent: 'border-[#6366F1]/50',
    badge: 'Most Popular',
    ring: true,
    features: [
      'Everything in Free',
      'Dynasty Coach ✦ (AI advisor)',
      'Trade Finder with AI pitches',
      'Pick Advisor + full analysis',
      'Handcuff tracker',
      'Leaguemate tendency profiles',
      'Weekly email digest',
      'Season Wrapped shareable card',
    ],
    cta: 'Start Pro free',
    href: '/auth/signup',
    ctaStyle: 'bg-[#6366F1] hover:bg-[#5254cc] text-white',
  },
  {
    name: 'Free',
    price: '$0',
    sub: 'forever',
    accent: 'border-white/10',
    badge: null,
    ring: false,
    features: [
      'Up to 5 leagues synced',
      'Multi-league dashboard',
      'Trade analyzer (KTC)',
      'Injury alerts',
      'Rankings & KTC values',
      'Lineup optimizer',
    ],
    cta: 'Get started free',
    href: '/auth/signup',
    ctaStyle: 'border border-white/20 hover:border-white/40 text-white',
  },
];

/* ─── Dynasty Score Count-Up ────────────────────────────────────────── */
function DynastyScoreSection() {
  const [ref, inView] = useInView(0.4);
  const score = useCountUp(84, 1500, inView);

  return (
    <section ref={ref} className="py-24 px-6 bg-[#080D18]">
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#475569] mb-4">Dynasty score</p>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-6">
            One number that tells you<br />
            <span className="text-[#6366F1]">exactly where you stand.</span>
          </h2>
          <p className="text-[#94A3B8] text-lg leading-relaxed mb-6">
            KTC value, age curve, positional depth, and win window — distilled into a single dynasty grade across every league you run.
          </p>
          <ul className="space-y-3">
            {['A (80–100) — contend now', 'B (60–79) — building threat', 'C (40–59) — rebuilding', 'D/F — sell everything'].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-[#CBD5E1]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          <div className="relative w-52 h-52 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-[#6366F1]/10 border-2 border-[#6366F1]/20" />
            <div className="absolute inset-3 rounded-full bg-[#6366F1]/5 border border-[#6366F1]/10" />
            <div className="text-center">
              <span
                className="block font-black leading-none"
                style={{ fontSize: 'clamp(64px, 12vw, 80px)', background: 'linear-gradient(135deg, #6366F1, #22D3EE)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
              >
                {score}
              </span>
              <span className="block text-xs uppercase tracking-widest text-[#475569] mt-1">Dynasty Score</span>
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-3">
              <p className="text-white font-bold text-lg">A</p>
              <p className="text-[#475569] text-xs">Grade</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-3">
              <p className="text-green-400 font-bold text-lg">+12</p>
              <p className="text-[#475569] text-xs">vs last week</p>
            </div>
            <div className="bg-[#0F172A] border border-white/5 rounded-xl px-5 py-3">
              <p className="text-amber-400 font-bold text-lg">#2</p>
              <p className="text-[#475569] text-xs">in league</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white overflow-x-hidden">
      <style>{`
        @keyframes ticker {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes hero-fade-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-stagger {
          opacity: 0;
          animation: hero-fade-up 0.65s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes float-card {
          0%, 100% { transform: translateY(-8px); }
          50%       { transform: translateY(8px);  }
        }
        .animate-float-card { animation: float-card 3s ease-in-out infinite; }

        @keyframes mesh-shift-1 {
          0%, 100% { transform: translate(0%,   0%)   scale(1); }
          33%      { transform: translate(4%,  -6%)   scale(1.06); }
          66%      { transform: translate(-3%,  4%)   scale(0.97); }
        }
        @keyframes mesh-shift-2 {
          0%, 100% { transform: translate(0%,   0%)   scale(1); }
          33%      { transform: translate(-5%,  5%)   scale(1.04); }
          66%      { transform: translate(6%,  -3%)   scale(0.98); }
        }
        .animate-mesh-1 { animation: mesh-shift-1 8s ease-in-out infinite alternate; }
        .animate-mesh-2 { animation: mesh-shift-2 8s ease-in-out infinite alternate-reverse; }

        @keyframes ping-pulse {
          75%, 100% { transform: scale(2.5); opacity: 0; }
        }
        .animate-ping-pulse { animation: ping-pulse 1.4s cubic-bezier(0,0,0.2,1) infinite; }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fade-in 0.4s ease-out both; }
      `}</style>

      <Nav />

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center px-6 overflow-hidden">

        {/* Animated mesh gradient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="animate-mesh-1 absolute top-[-15%] left-[20%] w-[700px] h-[700px] rounded-full bg-[#6366F1]/12 blur-[130px]" />
          <div className="animate-mesh-2 absolute bottom-[-10%] right-[15%] w-[600px] h-[600px] rounded-full bg-[#22D3EE]/8 blur-[120px]" />
        </div>

        {/* Diagonal field lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 48px, rgba(255,255,255,0.025) 48px, rgba(255,255,255,0.025) 49px)' }}
        />

        <div className="relative max-w-4xl mx-auto w-full">
          {/* Badge */}
          <div
            className="hero-stagger inline-flex items-center gap-2.5 bg-[#6366F1]/15 border border-[#6366F1]/25 rounded-full px-4 py-1.5 mb-10"
            style={{ animationDelay: '0ms' }}
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping-pulse absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
            </span>
            <span className="text-[#6366F1] text-xs font-bold tracking-widest uppercase">⚡ Syncing live from Sleeper</span>
          </div>

          {/* Headline line 1 */}
          <h1 className="leading-[0.88] tracking-tight" style={{ fontSize: 'clamp(48px, 8vw, 80px)' }}>
            <span
              className="hero-stagger block font-black italic text-white"
              style={{ animationDelay: '150ms' }}
            >
              Boom or Bust.
            </span>
            <span
              className="hero-stagger block font-black italic"
              style={{
                animationDelay: '300ms',
                background: 'linear-gradient(90deg, #6366F1 0%, #22D3EE 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Know which.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="hero-stagger text-lg sm:text-xl text-[#6B7280] max-w-2xl mx-auto leading-relaxed mt-6 mb-10"
            style={{ animationDelay: '450ms' }}
          >
            The only dynasty tool built for the obsessive Sleeper manager.
            Portfolio intelligence across every league you run.
          </p>

          {/* CTAs */}
          <div
            className="hero-stagger flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ animationDelay: '600ms' }}
          >
            <Link
              href="/auth/signup"
              className="w-full sm:w-auto bg-[#6366F1] hover:bg-[#5254cc] text-white font-black text-lg px-10 py-4 rounded-2xl transition shadow-xl shadow-[#6366F1]/25"
            >
              Get started free →
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto border border-white/15 hover:border-white/35 text-[#CBD5E1] hover:text-white font-semibold text-base px-8 py-4 rounded-2xl transition"
            >
              Sign in
            </Link>
          </div>

          <p className="text-xs text-[#475569] mt-5">No credit card. Syncs with Sleeper in 30 seconds.</p>
        </div>

        {/* Floating stat cards — desktop only */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-4xl hidden lg:grid grid-cols-3 gap-5 px-6">
          {[
            { label: 'Dynasty Score', value: 'A · 84', color: 'text-[#6366F1]', delay: '0s' },
            { label: 'Dynasty Coach', value: 'AI-powered ✦', color: 'text-green-400', delay: '1s' },
            { label: 'Injury Alerts', value: 'Real-time', color: 'text-amber-400', delay: '2s' },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-[#111827]/90 backdrop-blur border border-white/5 rounded-2xl p-4 animate-float-card"
              style={{ animationDelay: s.delay }}
            >
              <p className="text-xs uppercase tracking-widest text-[#475569] mb-1">{s.label}</p>
              <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      <Ticker />

      {/* ── PROBLEM STATEMENT ───────────────────────────────────────── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs uppercase tracking-widest text-[#475569] mb-6">The reality</p>
          <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-6">
            Most dynasty managers are<br />
            <span className="text-[#94A3B8]">running 3+ leagues on gut feeling.</span>
          </h2>
          <p className="text-[#94A3B8] text-lg leading-relaxed">
            No real trade value reference. No injury protection. No AI. Just vibes, group chats, and hoping the injury to your RB1 doesn&apos;t end your season. There&apos;s a better way.
          </p>
        </div>

        <div className="max-w-4xl mx-auto mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { num: '3+', label: 'Leagues the avg serious manager runs', accent: 'text-[#6366F1]' },
            { num: '12+', label: 'Features inside Boom or Bust', accent: 'text-green-400' },
            { num: '0', label: 'Games lost because you weren\'t informed', accent: 'text-amber-400' },
          ].map((s) => (
            <div key={s.label} className="bg-[#111827] border border-white/5 rounded-2xl p-8">
              <p className={`text-6xl font-black mb-3 ${s.accent}`}>{s.num}</p>
              <p className="text-[#94A3B8] text-sm leading-relaxed">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#475569] mb-4">The full arsenal</p>
            <h2 className="text-3xl sm:text-5xl font-black">Everything your front office needs.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group bg-[#111827] hover:bg-[#1E293B] border border-white/5 hover:border-[#6366F1]/30 rounded-2xl p-7 transition-all"
              >
                <div className="text-[#6366F1] mb-5 opacity-80 group-hover:opacity-100 transition">{f.icon}</div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#475569] mb-2">{f.tag}</p>
                <h3 className="text-white font-bold text-lg mb-3 leading-snug">{f.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DYNASTY SCORE COUNT-UP ───────────────────────────────────── */}
      <DynastyScoreSection />

      {/* ── DYNASTY COACH HIGHLIGHT ──────────────────────────────────── */}
      <section id="coach" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/25 rounded-full px-4 py-1.5 mb-6">
                <span className="text-[#6366F1] text-xs font-bold tracking-widest uppercase">Pro feature</span>
                <span className="text-[#6366F1]">✦</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black leading-tight mb-6">
                Your personal<br />
                <span className="text-[#6366F1]">AI dynasty analyst.</span>
              </h2>
              <p className="text-[#94A3B8] text-lg leading-relaxed mb-8">
                Dynasty Coach knows your actual rosters — every player, every league, every positional gap. Ask anything. Get advice built around your specific situation, not generic takes.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  'Grounded in your real roster data',
                  'Knows your positional strengths and gaps',
                  'Opinionated, direct, dynasty-fluent',
                  'Available whenever you need a second opinion',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-[#CBD5E1]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/auth/signup" className="inline-block bg-[#6366F1] hover:bg-[#5254cc] text-white font-bold px-6 py-3 rounded-xl transition">
                Unlock Dynasty Coach →
              </Link>
            </div>

            {/* Chat mockup */}
            <div className="bg-[#0F172A] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <div className="w-7 h-7 rounded-lg bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center">
                  <span className="text-[#6366F1] text-xs">✦</span>
                </div>
                <span className="text-white text-sm font-semibold">Dynasty Coach</span>
                <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  Online
                </span>
              </div>
              {[
                { role: 'user', text: 'Should I trade Jaylen Waddle for a 2025 first?' },
                { role: 'coach', text: 'In your 12-team PPR league, Waddle is your WR2 behind Stefon Diggs. Your WR depth is thin — only 3 viable starters. Trading him for a late first creates a gap you can\'t cover this year. Hold unless you\'re getting a top-5 pick.' },
                { role: 'user', text: 'What if I add Gibbs from waivers first?' },
                { role: 'coach', text: 'Gibbs changes the calculus. If you can land him, your backfield goes from a liability to a strength. Then Waddle becomes moveable — you\'d be selling from a position of depth.' },
              ].map((msg, i) => (
                <div key={i} className={clsx('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'coach' && (
                    <div className="w-6 h-6 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[#6366F1] text-[10px]">✦</span>
                    </div>
                  )}
                  <div className={clsx(
                    'max-w-[85%] text-xs leading-relaxed rounded-xl px-3 py-2.5',
                    msg.role === 'user'
                      ? 'bg-[#6366F1] text-white rounded-tr-sm'
                      : 'bg-[#1E293B] text-[#CBD5E1] border border-white/5 rounded-tl-sm'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-[#080D18]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs uppercase tracking-widest text-[#475569] mb-4">Setup in 60 seconds</p>
          <h2 className="text-3xl sm:text-5xl font-black mb-16">From signup to intel, instantly.</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Connect Sleeper', body: 'Enter your Sleeper username. Your leagues, rosters, and transactions sync automatically.' },
              { step: '02', title: 'See your full portfolio', body: 'Every roster, every player, every value — organized across all your leagues in one view.' },
              { step: '03', title: 'Make better decisions', body: 'Trade alerts, injury notifications, AI coaching. You\'ll never make an uninformed move again.' },
            ].map((s) => (
              <div key={s.step} className="text-left">
                <p className="text-5xl font-black text-[#1E293B] mb-4">{s.step}</p>
                <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-[#94A3B8] text-sm leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-[#475569] mb-4">Pricing</p>
            <h2 className="text-3xl sm:text-5xl font-black">Simple. No tricks.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={clsx('relative bg-[#0F172A] border rounded-2xl p-8 flex flex-col', plan.accent)}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6366F1] text-white text-xs font-bold px-4 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}
                <div className="mb-6">
                  <p className="text-xs font-bold uppercase tracking-widest text-[#475569] mb-2">{plan.name}</p>
                  <div className="flex items-end gap-1.5">
                    <span className="text-4xl font-black text-white">{plan.price}</span>
                    <span className="text-[#475569] text-sm mb-1">/ {plan.sub}</span>
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#CBD5E1]">
                      <span className="text-[#6366F1] mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={clsx('text-center font-bold py-3 rounded-xl transition text-sm', plan.ctaStyle)}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────── */}
      <section className="relative py-32 px-6 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#6366F1]/8 blur-[100px]" />
        </div>
        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black leading-tight mb-6">
            Stop managing.<br />
            <span className="text-[#6366F1]">Start dominating.</span>
          </h2>
          <p className="text-[#94A3B8] text-lg mb-10 max-w-xl mx-auto">
            Every week you wait is a week your competition has the edge. Run your dynasty like a front office.
          </p>
          <Link
            href="/auth/signup"
            className="inline-block w-full sm:w-auto bg-[#6366F1] hover:bg-[#5254cc] text-white font-black text-lg px-10 py-5 rounded-2xl transition shadow-2xl shadow-[#6366F1]/30"
          >
            Build your front office free →
          </Link>
          <p className="text-xs text-[#475569] mt-5">Free forever. Pro unlocks AI. No credit card required.</p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="text-white font-black text-sm">Boom</span>
            <span className="text-[#6366F1] font-black text-sm mx-0.5">or</span>
            <span className="text-white font-black text-sm">Bust.</span>
          </div>
          <p className="text-xs text-[#475569]">Manage your dynasty like a front office.</p>
          <div className="flex items-center gap-6">
            <Link href="/auth/login" className="text-xs text-[#475569] hover:text-white transition">Sign in</Link>
            <Link href="/auth/signup" className="text-xs text-[#475569] hover:text-white transition">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
