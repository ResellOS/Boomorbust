'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { clsx } from 'clsx';
import AppBackground from '@/components/AppBackground';
import HeroMockup from '@/components/landing/HeroMockup';
import PlayerCard from '@/components/PlayerCard';

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 sm:px-6 bg-[#0a0d14]/90 backdrop-blur-xl border-b border-white/[0.06] transition-all duration-300 ${
        scrolled ? 'shadow-[0_8px_32px_rgba(0,0,0,0.35)]' : ''
      }`}
    >
      <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logo-full2.png"
            alt="Boom or Bust"
            width={180}
            height={48}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-8 text-[14px]" style={{ color: 'var(--text-secondary)' }}>
          {[
            ['#features', 'Features'],
            ['#how', 'How it Works'],
            ['#pricing', 'Pricing'],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="hover:text-white transition-colors duration-200"
            >
              {label}
            </a>
          ))}
          <span className="cursor-pointer hover:text-white transition-colors duration-200">Resources ▾</span>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/auth/login"
            className="hidden sm:inline text-sm px-4 py-2 rounded-xl border border-white/15 hover:border-white/30 text-[var(--text-secondary)] hover:text-white transition"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-bold text-[#0a0d14] shadow-[0_0_28px_rgba(54,231,161,0.45)] transition hover:-translate-y-0.5 hover:brightness-110"
            style={{ background: '#36E7A1' }}
          >
            Import FB/Leagues
          </Link>
        </div>
      </div>
    </header>
  );
}

function EdgeTicker() {
  const items = [
    { emoji: '🔴', text: 'Injury Alert: Bijan Robinson — Questionable · 4 leagues affected' },
    { emoji: '🟢', text: 'Trade Signal: 3 managers in Best Ball Homies are weak at RB' },
    { emoji: '🟡', text: 'Value Move: Rashee Rice dropped 420 BBV · Below alert threshold' },
    { emoji: '🟣', text: 'Pick Alert: Your 2026 1st in The Bloodbath now projects Top 4' },
    { emoji: '🔵', text: 'Rival Move: Your rival just added Isaiah Likely off waivers' },
  ];
  const loop = [...items, ...items];
  return (
    <div
      className="w-full overflow-hidden flex items-center h-11 border-y"
      style={{
        background: 'rgba(99,102,241,0.08)',
        borderColor: 'rgba(99,102,241,0.15)',
      }}
    >
      <div className="shrink-0 px-4 h-full flex items-center border-r text-[var(--indigo)] font-bold text-sm" style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
        ⚡ EDGE ALERT
      </div>
      <div className="flex-1 overflow-hidden relative min-w-0">
        <div className="ticker-content flex gap-14 whitespace-nowrap items-center px-6">
          {loop.map((t, i) => (
            <span key={i} className="text-sm text-[var(--text-secondary)] inline-flex gap-2">
              <span>{t.emoji}</span>
              {t.text}
            </span>
          ))}
        </div>
      </div>
      <Link
        href="/auth/signup"
        className="shrink-0 px-4 text-sm font-semibold text-[var(--indigo-light)] hover:text-white whitespace-nowrap"
      >
        View Trade Targets →
      </Link>
    </div>
  );
}

const FEATURES = [
  {
    title: 'All Your Leagues. One Dashboard.',
    body: 'Sync every Sleeper league into a single portfolio view — standings, exposures, grades, alerts.',
    iconBg: 'bg-indigo-500/20 text-indigo-300',
    icon: '▦',
    preview: 'list',
  },
  {
    title: 'Know Who Wins Every Trade.',
    body: 'KTC-powered analysis with age curve, positional need, and future pick weighting — before you hit send.',
    iconBg: 'bg-cyan-500/15 text-cyan-300',
    icon: '⇄',
    preview: 'trade',
  },
  {
    title: 'Start the Right Players. Every Week.',
    body: 'Projections, matchup context, and injury intel — flex decisions with numbers, not vibes.',
    iconBg: 'bg-indigo-500/20 text-indigo-200',
    icon: '◎',
    preview: 'lineup',
  },
  {
    title: 'Smarter Drafts. Stronger Futures.',
    body: 'Pick advisor maps future capital to KTC slot value so you buy low and sell at the top.',
    iconBg: 'bg-amber-500/15 text-amber-300',
    icon: '★',
    preview: 'draft',
  },
] as const;

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    sub: 'forever',
    featured: false,
    features: ['5 leagues · multi-view dashboard', 'Trade analyzer · injury alerts', 'Lineup & rankings basics'],
    cta: 'Import My Leagues',
    href: '/auth/signup',
  },
  {
    name: 'Pro',
    price: '$9',
    sub: '/mo',
    featured: true,
    features: ['Dynasty Analyst ✦', 'Trade Finder + Smart pitches', 'Pick advisor & exposure', 'Handcuffs · digests · Wrapped'],
    cta: 'Start Pro Trial',
    href: '/auth/signup',
  },
  {
    name: 'Dynasty+',
    price: '$29',
    sub: '/mo',
    featured: false,
    features: ['Everything in Pro', 'Priority ingestion & alerts', 'League-room exports', 'Dedicated support lane'],
    cta: 'Talk to Us',
    href: '/auth/signup',
  },
];

export default function LandingPage({ buildSha = 'local' }: { buildSha?: string }) {
  return (
    <AppBackground intensity="full">
      <LandingNav />

      <main className="relative pt-16">
        {/* HERO */}
        <section className="min-h-screen grid lg:grid-cols-[55%_45%] gap-10 lg:gap-16 items-center max-w-[1400px] mx-auto px-4 sm:px-6 py-14 lg:py-10">
          <div>
            <div className="inline-flex items-center gap-2 mb-8 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards', animationDelay: '0ms' }}>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse-dot-custom" />
              <span className="text-green-400 uppercase tracking-[0.2em] text-xs font-semibold">
                Built for Sleeper players
              </span>
            </div>

            <h1 className="text-white mb-2 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards', animationDelay: '100ms' }}>
              <span className="display block">Your Dynasty Edge.</span>
              <span className="display block gradient-text">Every Single Week.</span>
            </h1>

            <p
              className="text-[17px] leading-[1.65] max-w-[480px] mb-8 mt-6 opacity-0 animate-fade-up"
              style={{ color: 'var(--text-secondary)', animationFillMode: 'forwards', animationDelay: '200ms' }}
            >
              Connect your Sleeper leagues and get everything you need to win more trades, start the right players, and dominate
              your dynasty.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards', animationDelay: '300ms' }}>
              <div>
                <Link
                  href="/auth/signup"
                  className="inline-flex items-center justify-center gap-2 bg-[var(--indigo)] text-white font-bold px-8 py-4 rounded-xl text-base shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 transition w-full sm:w-auto"
                >
                  🏈 Import My Leagues
                </Link>
                <p className="text-[12px] text-[var(--text-muted)] mt-2">Takes less than 10 seconds</p>
              </div>
              <Link
                href="#mockup"
                className="inline-flex items-center justify-center border border-white/20 text-[var(--text-primary)] font-semibold px-8 py-4 rounded-xl hover:border-white/40 transition w-full sm:w-auto"
              >
                ▶ See It In Action
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[var(--text-muted)] items-center opacity-0 animate-fade-up" style={{ animationFillMode: 'forwards', animationDelay: '400ms' }}>
              <span>✓ 100% Free to Start</span>
              <span>·</span>
              <span>No Credit Card</span>
              <span>·</span>
              <span>Secure with Sleeper</span>
              <span className="ml-2 text-[11px] uppercase tracking-wider border-l border-[var(--border)] pl-4">
                Works with <span className="text-[var(--text-secondary)]"> Sleeper</span>
              </span>
            </div>
          </div>

          <div id="mockup" className="relative z-10 w-full max-w-xl mx-auto lg:max-w-none lg:mx-0">
            <HeroMockup />
          </div>
        </section>

        <EdgeTicker />

        {/* FEATURES */}
        <section id="features" className="py-24 px-4 sm:px-6 max-w-[1400px] mx-auto">
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 flex flex-col h-full hover:-translate-y-0.5 transition">
                <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4', f.iconBg)}>
                  {f.icon}
                </div>
                <h3 className="text-white mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)] flex-1">{f.body}</p>
                <div className="mt-4 rounded-lg border border-[var(--border)] p-3 bg-[var(--bg-secondary)]/80 text-[11px] text-[var(--text-muted)] min-h-[72px]">
                  {f.preview === 'list' && (
                    <ul className="space-y-1">
                      <li>• North Star · 6-2 · A-</li>
                      <li>• Bloodbath · 4-4 · B+</li>
                    </ul>
                  )}
                  {f.preview === 'trade' && (
                    <div>
                      <p className="text-green-400 font-bold">You win 73%</p>
                      <div className="h-2 rounded-full bg-white/5 mt-2">
                        <div className="h-full w-[73%] rounded-full bg-green-500/70" />
                      </div>
                    </div>
                  )}
                  {f.preview === 'lineup' && (
                    <PlayerCard
                      player_id="9509"
                      player_name="B. Hall"
                      position="RB"
                      team="NYJ"
                      age={23}
                      ppg={14.2}
                      ktc_value={5200}
                      size="sm"
                    />
                  )}
                  {f.preview === 'draft' && <p>1.01 · C. Williams · QB · projected early declare</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-4 text-center">
            <div className="flex -space-x-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-10 h-10 rounded-full border-2 border-[var(--bg-primary)]"
                  style={{ background: `hsl(${220 + i * 18}, 45%, ${35 + i * 5}%)` }}
                />
              ))}
            </div>
            <div>
              <p className="text-[var(--text-secondary)]">
                Join <span className="text-white font-semibold">1,200+</span> dynasty players already gaining an edge.
              </p>
              <p className="text-[var(--gold)] text-lg mt-1">★★★★★</p>
            </div>
          </div>
        </section>

        {/* HOW */}
        <section id="how" className="py-16 px-4 sm:px-6 bg-[var(--bg-secondary)]/40 border-y border-[var(--border)]">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-white mb-8">Setup in sixty seconds.</h2>
            <div className="grid sm:grid-cols-3 gap-8 text-left">
              {[
                { step: '01', t: 'Connect Sleeper', d: 'Link your Sleeper username — leagues, rosters, and trades sync instantly.' },
                { step: '02', t: 'See your portfolio', d: 'Grades, exposure, trade leverage, and injury risk across every league.' },
                { step: '03', t: 'Win the edge', d: 'Alerts, coach, and Finder keep you proactive — not reactive on Sunday.' },
              ].map((s) => (
                <div key={s.step}>
                  <p className="display text-5xl text-[var(--bg-surface)] mb-3">{s.step}</p>
                  <h3 className="text-lg text-white font-semibold mb-2">{s.t}</h3>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-24 px-4 sm:px-6 max-w-[1100px] mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-white">Simple pricing. No tricks.</h2>
            <p className="text-[var(--text-secondary)] mt-3">Upgrade when you’re ready for Empire Insights and advanced edge tools.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map((p) => (
              <div
                key={p.name}
                className={clsx(
                  'card p-8 flex flex-col relative',
                  p.featured && 'border-[var(--indigo)]/50 shadow-[0_0_60px_rgba(99,102,241,0.12)] scale-[1.02]'
                )}
              >
                {p.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--indigo)] text-white text-xs font-bold px-4 py-1 rounded-full">
                    Most popular
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{p.name}</p>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="display text-5xl text-white">{p.price}</span>
                  <span className="text-[var(--text-muted)] text-sm">{p.sub}</span>
                </div>
                <ul className="space-y-3 flex-1 mb-8 text-sm text-[var(--text-secondary)]">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-[var(--indigo)]">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={p.href}
                  className={clsx(
                    'text-center font-bold py-3 rounded-xl transition text-sm',
                    p.featured
                      ? 'bg-[var(--indigo)] text-white hover:bg-[#5254cc]'
                      : 'border border-white/15 text-white hover:border-white/35'
                  )}
                >
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-24 px-4 sm:px-6 text-center border-t border-[var(--border)]">
          <h2 className="text-white display text-5xl max-w-2xl mx-auto">
            Stop guessing. <span className="gradient-text">Start commanding.</span>
          </h2>
          <Link
            href="/auth/signup"
            className="inline-block mt-10 bg-[var(--indigo)] text-white font-black text-lg px-12 py-5 rounded-2xl shadow-[0_0_48px_rgba(99,102,241,0.35)] hover:-translate-y-0.5 transition"
          >
            🏈 Import My Leagues
          </Link>
        </section>

        <footer className="border-t border-[var(--border)] py-10 px-4 sm:px-6">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Image
              src="/logo-full2.png"
              alt="Boom or Bust"
              width={180}
              height={48}
              className="h-10 w-auto object-contain"
            />
            <p>Dynasty command center for obsessive Sleeper managers.</p>
            <div className="flex gap-6">
              <Link href="/auth/login" className="hover:text-white transition">
                Sign in
              </Link>
              <Link href="/auth/signup" className="hover:text-white transition">
                Get started
              </Link>
            </div>
          </div>
          <p className="mt-6 text-center text-[10px] font-mono text-[var(--text-muted)]/80 tracking-wide">
            Deploy {buildSha.length >= 7 ? buildSha.slice(0, 7) : buildSha}
          </p>
        </footer>
      </main>
    </AppBackground>
  );
}
