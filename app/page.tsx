'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TWITTER_PROFILE_HREF } from '@/lib/twitter-public';

const BG = '#0a0d14';
const GREEN = '#36E7A1';
const PURPLE = '#A78BFA';
const CYAN = '#22D3EE';
const AMBER = '#FBBF24';
const RED = '#EF4444';

function MiniSparkline({ stroke }: { stroke: string }) {
  return (
    <svg className="mt-2 h-10 w-full" viewBox="0 0 100 40" fill="none" aria-hidden>
      <polyline
        points="0,28 14,22 28,26 42,14 56,18 70,10 84,12 100,4"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

function UpSparkline({ stroke }: { stroke: string }) {
  return (
    <svg className="my-4 h-12 w-full" viewBox="0 0 120 48" fill="none" aria-hidden>
      <polyline
        points="0,40 20,32 40,36 60,20 80,24 100,8 120,12"
        stroke={stroke}
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

type MockPlayer = {
  name: string;
  pos: string;
  team: string;
  score: string;
  role: 'WR' | 'RB' | 'TE';
};

const MOCK_PLAYERS: MockPlayer[] = [
  { name: 'J. JEFFERSON', pos: 'WR', team: 'MIN', score: '92', role: 'WR' },
  { name: 'T. McLAURIN', pos: 'WR', team: 'WAS', score: '88', role: 'WR' },
  { name: 'J. TAYLOR', pos: 'RB', team: 'IND', score: '90', role: 'RB' },
  { name: 'S. LaPORTA', pos: 'TE', team: 'DET', score: '81', role: 'TE' },
];

function playerGradient(role: MockPlayer['role']): { bg: string; border: string; badge: string; badgeBg: string } {
  if (role === 'WR')
    return {
      bg: 'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(34,211,238,0.05))',
      border: 'rgba(34,211,238,0.3)',
      badge: CYAN,
      badgeBg: 'rgba(34,211,238,0.2)',
    };
  if (role === 'RB')
    return {
      bg: 'linear-gradient(135deg, rgba(54,231,161,0.3), rgba(54,231,161,0.05))',
      border: 'rgba(54,231,161,0.3)',
      badge: GREEN,
      badgeBg: 'rgba(54,231,161,0.2)',
    };
  return {
    bg: 'linear-gradient(135deg, rgba(167,139,250,0.3), rgba(167,139,250,0.05))',
    border: 'rgba(167,139,250,0.3)',
    badge: PURPLE,
    badgeBg: 'rgba(167,139,250,0.2)',
  };
}

function PlayerMockCard({ p }: { p: MockPlayer }) {
  const g = playerGradient(p.role);
  const initials = p.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3);

  return (
    <div
      className="relative h-[100px] overflow-hidden rounded-[10px] border"
      style={{ background: g.bg, borderColor: g.border }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center text-[22px] font-bold text-white/10"
        style={{ fontFamily: 'var(--font-mono)' }}
        aria-hidden
      >
        {initials}
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2">
        <div className="min-w-0">
          <span
            className="mb-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase"
            style={{ color: g.badge, background: g.badgeBg }}
          >
            {p.pos}
          </span>
          <p className="truncate text-[11px] font-bold text-white">{p.name}</p>
          <p className="text-[9px] text-white/50">{p.team}</p>
        </div>
        <p className="shrink-0 text-[18px] font-bold" style={{ fontFamily: 'var(--font-mono)', color: GREEN }}>
          {p.score}
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen antialiased" style={{ background: BG, color: '#fff' }}>
      {/* Ambient glows */}
      <div
        className="pointer-events-none fixed left-[-300px] top-[-300px] z-0 h-[700px] w-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(54,231,161,0.05) 0%, transparent 70%)',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed right-[-300px] top-[-300px] z-0 h-[700px] w-[700px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <nav
        ref={navRef}
        className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-white/[0.06] backdrop-blur-xl transition-colors duration-300"
        style={{
          background: scrolled ? 'rgba(10,13,20,0.98)' : 'rgba(10,13,20,0.85)',
        }}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 lg:px-10">
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

          <div className="hidden items-center gap-8 lg:flex">
            <a
              href="#features"
              className="text-[14px] text-white/50 transition-colors hover:text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Features
            </a>
            <a
              href="#how"
              className="text-[14px] text-white/50 transition-colors hover:text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              How it Works
            </a>
            <a
              href="#pricing"
              className="text-[14px] text-white/50 transition-colors hover:text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Pricing
            </a>
            <a
              href="#resources"
              className="text-[14px] text-white/50 transition-colors hover:text-white"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Resources
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg border border-white/15 px-3 py-2 text-[13px] text-white/60 transition hover:border-white/30 hover:text-white sm:px-4 sm:text-[14px]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-xl px-3 py-2 text-[13px] font-bold text-black transition hover:-translate-y-px sm:px-5 sm:py-2.5 sm:text-[14px]"
              style={{
                background: GREEN,
                boxShadow: '0 0 28px rgba(54,231,161,0.35), 0 0 48px rgba(54,231,161,0.2)',
                fontFamily: 'var(--font-body)',
              }}
            >
              Import My Leagues
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* HERO */}
        <section className="relative flex min-h-screen flex-col items-center px-6 pb-20 pt-16 text-center">
          <div className="mx-auto flex max-w-[1100px] flex-col items-center px-0 py-20">
            <div
              className="landing-fade-up landing-fade-delay-0 mb-10 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
              style={{
                background: 'rgba(54,231,161,0.08)',
                borderColor: 'rgba(54,231,161,0.18)',
              }}
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#36E7A1]" />
              <span
                className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#36E7A1]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                ⚡ 17 PROPRIETARY ENGINES · REAL-TIME SLEEPER SYNC
              </span>
            </div>

            <h1
              className="landing-fade-up landing-fade-delay-100 mb-5"
              style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}
            >
              <span
                className="block text-white"
                style={{ fontSize: 'clamp(52px, 9vw, 120px)', lineHeight: 0.88 }}
              >
                YOUR DYNASTY SCOUT.
              </span>
              <span
                className="mt-2 block whitespace-normal text-white lg:whitespace-nowrap"
                style={{ fontSize: 'clamp(36px, 6vw, 80px)', lineHeight: 0.92 }}
              >
                DRAFT THE <span style={{ color: GREEN }}>BOOM</span> DODGE THE{' '}
                <span style={{ color: PURPLE }}>BUST</span>
              </span>
              <span
                className="mt-4 block font-normal text-white/[0.38]"
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 'clamp(13px, 1.4vw, 17px)',
                  letterSpacing: '0.18em',
                }}
              >
                — Find every edge. Fix every weakness. Win every week. —
              </span>
            </h1>

            <p
              className="landing-fade-up landing-fade-delay-200 mx-auto mb-10 mt-4 max-w-[560px] text-[16px] leading-[1.7] text-white/[0.52]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Connect your Sleeper leagues and let 17 proprietary engines analyze every roster gap, trade
              opportunity, waiver target, and matchup advantage — built specifically for your teams.
            </p>

            <div className="landing-fade-up landing-fade-delay-300 mb-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/auth/signup"
                className="rounded-xl px-8 py-4 text-[15px] font-black text-black transition hover:-translate-y-0.5"
                style={{
                  background: GREEN,
                  boxShadow: '0 0 40px rgba(54,231,161,0.35), 0 0 64px rgba(54,231,161,0.22)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                🏈 Import My Leagues
              </Link>
              <a
                href="#mockup"
                className="rounded-xl border border-white/20 bg-transparent px-8 py-4 text-[15px] font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.04]"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span style={{ color: GREEN }}>▶</span> See It In Action
              </a>
            </div>

            <div
              className="landing-fade-up landing-fade-delay-400 mb-16 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] text-white/[0.38]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              <span>
                <span style={{ color: GREEN }}>✓</span> Free to Start
              </span>
              <span className="text-white/[0.15]">·</span>
              <span>No Credit Card</span>
              <span className="hidden text-white/[0.15] sm:inline">·</span>
              <span>
                <span style={{ color: GREEN }}>✓</span> Secure with Sleeper
              </span>
              <span className="text-white/[0.15]">·</span>
              <span>17 Proprietary Engines</span>
            </div>

            {/* Mockup */}
            <div
              id="mockup"
              className="landing-fade-up landing-fade-delay-500 relative mx-auto w-[90%] max-w-[1100px]"
              style={{ perspective: '1200px' }}
            >
              <div className="landing-mockup-float">
                <div
                  className="overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#0f1220]"
                  style={{
                    boxShadow:
                      '0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(54,231,161,0.04), 0 0 80px rgba(54,231,161,0.08)',
                  }}
                >
                  {/* Chrome */}
                  <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#161926] px-4 py-2.5 sm:px-4">
                    <span className="h-3 w-3 shrink-0 rounded-full bg-[#ff5f57]" />
                    <span className="h-3 w-3 shrink-0 rounded-full bg-[#febc2e]" />
                    <span className="h-3 w-3 shrink-0 rounded-full bg-[#28c840]" />
                    <div
                      className="ml-2 min-w-0 flex-1 rounded-md border border-white/[0.06] px-3 py-1 text-left text-[10px] text-white/30 sm:text-[11px]"
                      style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.04)' }}
                    >
                      boomorbust.app/dashboard
                    </div>
                    <span
                      className="hidden shrink-0 text-[10px] text-white/30 sm:inline"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      Last Sync: 2m ago ✓
                    </span>
                  </div>

                  <div className="flex">
                    <aside className="hidden w-[160px] shrink-0 border-r border-white/[0.06] bg-black/30 py-4 lg:block">
                      <div className="px-4 py-3">
                        <span className="text-[12px] font-bold text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                          B/B
                        </span>
                      </div>
                      <nav className="text-[11px]" style={{ fontFamily: 'var(--font-body)' }}>
                        {[
                          ['📊', 'Dashboard', true],
                          ['🏆', 'My Portfolio', false],
                          ['🏈', 'Leagues', false],
                          ['👤', 'Players', false],
                          ['⇄', 'Trade Analyzer', false],
                          ['⚡', 'Waiver Wire', false],
                          ['≡', 'Rankings', false],
                          ['📄', 'Reports', false],
                          ['🔔', 'Alerts', false],
                          ['⚙️', 'Settings', false],
                        ].map(([icon, label, active]) => (
                          <div
                            key={String(label)}
                            className={`flex h-8 cursor-default items-center px-4 ${active ? 'border-l-2 border-[#36E7A1] bg-[rgba(54,231,161,0.1)] text-[#36E7A1]' : 'border-l-2 border-transparent text-white/45 hover:text-white'}`}
                          >
                            <span className="mr-2">{icon}</span>
                            {label}
                          </div>
                        ))}
                      </nav>
                    </aside>

                    <div className="min-w-0 flex-1 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[14px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                            Good Morning, Champ! 🏆
                          </p>
                          <p className="text-[11px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                            Dynasty Power Rating:{' '}
                            <span style={{ fontFamily: 'var(--font-mono)' }}>52.4</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                          <span>All Leagues ▾</span>
                          <span aria-hidden>⟳</span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                          {
                            label: 'START ACCURACY',
                            value: '52.4%',
                            sub: '+8.7% vs last 30 days',
                            color: GREEN,
                          },
                          {
                            label: 'TRADE EDGE',
                            value: '+18.4',
                            sub: 'Value Generated',
                            color: AMBER,
                          },
                          {
                            label: 'WIN PROBABILITY',
                            value: '73%',
                            sub: 'Make Playoffs',
                            color: CYAN,
                          },
                        ].map((c) => (
                          <div
                            key={c.label}
                            className="rounded-xl border border-white/[0.06] p-3"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                          >
                            <p className="text-[9px] uppercase tracking-wide text-white/35">{c.label}</p>
                            <p className="text-[24px] font-bold leading-tight" style={{ fontFamily: 'var(--font-mono)', color: c.color }}>
                              {c.value}
                            </p>
                            <p className="text-[9px] text-white/30">{c.sub}</p>
                            <MiniSparkline stroke={c.color} />
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
                        {MOCK_PLAYERS.map((p) => (
                          <PlayerMockCard key={p.name} p={p} />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0d14] to-transparent"
                aria-hidden
              />
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="border-y border-white/[0.06] bg-white/[0.02] px-4 sm:px-10" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>
          <div
            className="mx-auto my-4 flex max-w-[1400px] flex-wrap items-center justify-between gap-6 rounded-xl border border-white/[0.08] px-4 py-4 sm:px-8"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <div className="flex w-full flex-wrap items-center justify-center gap-x-4 gap-y-6 sm:gap-x-6 lg:flex-nowrap lg:justify-between">
              <div className="flex min-w-[120px] flex-col items-center gap-1">
                <span className="text-[18px] tracking-[2px] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                  sleeper
                </span>
                <span className="text-[9px] uppercase text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                  BUILT FOR SLEEPER
                </span>
              </div>
              <div className="hidden h-9 w-px shrink-0 bg-white/[0.08] lg:block" aria-hidden />

              {[
                ['84%', 'DMS ACCURACY'],
                ['17', 'PROPRIETARY ENGINES'],
                ['42-18-2', 'VERIFIED RECORD'],
                ['5.3 WEEKS', 'MARKET LEAD TIME'],
                ['★★★★★', 'TRUSTED BY DYNASTY MANAGERS'],
              ].map(([val, lab], i) => (
                <React.Fragment key={lab}>
                  <div
                    className={`flex min-w-[100px] flex-col items-center gap-1 ${i === 3 ? 'hidden sm:flex' : ''} ${i === 4 ? 'hidden md:flex' : ''} ${i === 5 ? 'hidden lg:flex' : ''}`}
                  >
                    <span className="text-[20px] font-bold text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                      {val}
                    </span>
                    <span className="mt-1 text-[10px] uppercase tracking-wider text-white/[0.38]" style={{ fontFamily: 'var(--font-body)' }}>
                      {lab}
                    </span>
                  </div>
                  {i < 4 ? <div className="hidden h-9 w-px shrink-0 bg-white/[0.08] lg:block" aria-hidden /> : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ENGINE + HOW */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] gap-8 lg:grid-cols-2">
            <div>
              <h2
                className="mb-2 text-white"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,42px)' }}
              >
                POWERED BY 17 PROPRIETARY DYNASTY ENGINES
              </h2>
              <p className="mb-6 text-[13px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                Every recommendation backed by institutional-grade analytics — not consensus rankings.
              </p>

              <div
                className="overflow-hidden rounded-[14px] border border-[rgba(54,231,161,0.2)]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  boxShadow: '0 0 40px rgba(54,231,161,0.06)',
                }}
              >
                <div className="flex items-center gap-3 border-b border-white/[0.06] bg-[#161926] px-3.5 py-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                  <span className="ml-3 text-[11px] text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                    BOOM OR BUST // ENGINE STATUS
                  </span>
                </div>
                <div className="overflow-x-auto px-4 py-4 text-[11px] leading-[1.8] sm:px-5" style={{ fontFamily: 'var(--font-mono)' }}>
                  <p className="text-white/50">
                    <span className="text-white/20">&gt; </span>INITIALIZING DYNASTY INTELLIGENCE...
                  </p>
                  <p className="h-3" />
                  {[
                    ['████████████', 'TFO', 'VERDICT SCORE', 'ACTIVE', '0-100'],
                    ['████████████', 'BVI', 'EDGE SCORE', 'ACTIVE', '0-10,000'],
                    ['████████████', 'DMS', 'MOMENTUM', '84% ACC', '↑↑'],
                    ['████████████', 'BPS', 'BREAKOUT METER', '80% ACC', '↑'],
                    ['████████████', 'DAC', 'SELL WINDOW', '82% ACC', '↑'],
                    ['████████████', 'MRS', 'INJURY RISK', 'ACTIVE', '0-95%'],
                    ['████████████', 'SSAS', 'MATCHUP GRADE', '78% ACC', '↑'],
                    ['████████████', 'TRE', 'TRADE GRADE', 'ACTIVE', 'WIN/LOSS'],
                    ['████████████', 'DMP', 'DYNASTY PROFILE', 'ACTIVE', '100 LABELS'],
                  ].map(([bar, code, name, status, tail]) => (
                    <p key={code} className="whitespace-nowrap text-white">
                      <span className="text-white/20">&gt; </span>
                      <span className="text-white/40">[</span>
                      <span className="font-bold text-[#36E7A1]">{bar}</span>
                      <span className="text-white/40">]</span>{' '}
                      <span className="inline-block w-10 font-bold text-[#36E7A1]">{code}</span>{' '}
                      <span className="inline-block w-36 text-white">{name}</span>{' '}
                      <span className="text-[#22D3EE]">{status}</span>{' '}
                      <span className="text-white/40">{tail}</span>
                    </p>
                  ))}
                  <p className="h-3" />
                  <p className="text-white/35">
                    <span className="text-white/20">&gt; </span>+ 8 MORE ENGINES LOADED
                  </p>
                  <p className="text-[#36E7A1]">
                    <span className="text-white/20">&gt; </span>ALL SYSTEMS OPERATIONAL ✓{' '}
                    <span className="landing-cursor-blink inline-block h-3 w-2 bg-[#36E7A1] align-middle" />
                  </p>
                </div>
              </div>
            </div>

            <div id="how">
              <h2
                className="mb-6 text-center text-white"
                style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,42px)' }}
              >
                FROM SYNC TO DOMINANCE IN 3<span style={{ color: GREEN }}>0</span> SECONDS
              </h2>
              <div className="flex flex-col gap-4">
                {[
                  {
                    n: '1',
                    icon: '☁',
                    title: 'Import Your Leagues',
                    body: 'Connect your Sleeper username. All leagues, rosters, and trades sync in seconds.',
                  },
                  {
                    n: '2',
                    icon: '🧠',
                    title: '17 Engines Analyze Everything',
                    body: 'Rosters, projections, trade history, age curves, momentum, matchups — processed instantly.',
                  },
                  {
                    n: '3',
                    icon: '🎯',
                    title: 'Get Smarter Every Week',
                    body: 'Sit/start decisions, trade grades, waiver targets, and portfolio alerts — for YOUR teams.',
                  },
                ].map((s) => (
                  <div
                    key={s.n}
                    className="flex items-start gap-4 rounded-[14px] border border-white/[0.08] p-5 sm:p-6"
                    style={{ background: 'rgba(255,255,255,0.03)' }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[15px] font-bold text-[#36E7A1]"
                      style={{
                        background: 'rgba(54,231,161,0.15)',
                        borderColor: 'rgba(54,231,161,0.3)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {s.n}
                    </div>
                    <div>
                      <span className="text-[20px]">{s.icon}</span>
                      <p className="mb-1 text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                        {s.title}
                      </p>
                      <p className="text-[13px] leading-relaxed text-white/[0.48]" style={{ fontFamily: 'var(--font-body)' }}>
                        {s.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES + PORTFOLIO */}
        <section id="features" className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1400px]">
            <h2
              className="mb-8 text-center text-white"
              style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,42px)' }}
            >
              EVERYTHING YOU NEED TO WIN — IN ONE PLACE
            </h2>

            <div className="grid gap-8 lg:grid-cols-[60%_40%]">
              <div
                className="rounded-[18px] border border-white/[0.07] p-6"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { icon: '▦', title: 'Import Dashboard', body: 'All leagues, one view', ac: 'rgba(167,139,250,0.12)', tc: PURPLE },
                    { icon: '◎', title: 'Start/Sit Optimizer', body: 'AI lineup decisions', ac: 'rgba(54,231,161,0.12)', tc: GREEN },
                    { icon: '⇄', title: 'Trade Analyzer', body: 'Know who wins every trade', ac: 'rgba(34,211,238,0.12)', tc: CYAN },
                    { icon: '⚡', title: 'Waiver Wire Targets', body: 'Find value before others', ac: 'rgba(251,191,36,0.12)', tc: AMBER },
                    { icon: '🔭', title: 'Dynasty Strategy Engine', body: 'Contend or rebuild intel', ac: 'rgba(167,139,250,0.12)', tc: PURPLE },
                    { icon: '★', title: 'Rookie Pick Intelligence', body: 'Scout and predict breakouts', ac: 'rgba(251,191,36,0.12)', tc: AMBER },
                    { icon: '≡', title: 'Smart Rankings', body: 'Form + matchup + injury', ac: 'rgba(54,231,161,0.12)', tc: GREEN },
                    { icon: '📊', title: 'Advanced Analytics', body: 'Visual trends + heatmaps', ac: 'rgba(34,211,238,0.12)', tc: CYAN },
                    { icon: '🏥', title: 'Injury Tracker', body: 'Real-time impact alerts', ac: 'rgba(239,68,68,0.12)', tc: RED },
                  ].map((f) => (
                    <div
                      key={f.title}
                      className="rounded-xl border border-white/[0.07] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-white/20"
                      style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                      <div
                        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-[16px]"
                        style={{ background: f.ac, color: f.tc }}
                      >
                        {f.icon}
                      </div>
                      <p className="mb-1 text-[14px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                        {f.title}
                      </p>
                      <p className="mb-2 text-[12px] leading-relaxed text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
                        {f.body}
                      </p>
                      <Link href="/auth/signup" className="cursor-pointer text-[11px] text-[#36E7A1]">
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="rounded-2xl border border-white/[0.08] p-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                    YOUR PORTFOLIO OVERVIEW
                  </p>
                  <p className="text-[36px] font-bold leading-none text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                    42-18-2
                  </p>
                  <p className="mt-1 text-[10px] uppercase text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                    VERIFIED RECORD
                  </p>
                  <div className="my-4 flex h-14 items-end gap-1.5">
                    {[65, 80, 55, 90, 72, 85, 60, 95, 70, 88].map((h, i) => {
                      const colors = [GREEN, AMBER, 'rgba(255,255,255,0.12)'];
                      const c = colors[i % 3];
                      return (
                        <div
                          key={i}
                          className="min-w-0 flex-1 rounded-sm"
                          style={{ height: `${h}%`, background: c }}
                        />
                      );
                    })}
                  </div>
                  {[
                    ['Start/Sit Accuracy', '+18.4'],
                    ['Waiver Wins', '+22.7%'],
                    ['Trade Wins', '+16.1%'],
                    ['Matchup Wins', '+13.8%'],
                  ].map(([a, b], idx) => (
                    <div
                      key={a}
                      className={`flex items-center justify-between py-2 ${idx < 3 ? 'border-b border-white/[0.05]' : ''}`}
                    >
                      <span className="text-[12px] text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
                        {a}
                      </span>
                      <span className="text-[12px] font-bold text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                        {b}
                      </span>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,38px)' }}>
                    YOU DON&apos;T MANAGE ONE TEAM.
                    <br />
                    YOU MANAGE A <span style={{ color: GREEN }}>PORTFOLIO.</span>
                  </h3>
                  <p className="mb-4 mt-3 text-[14px] leading-relaxed text-white/[0.52]" style={{ fontFamily: 'var(--font-body)' }}>
                    See the big picture across all your teams. Make smarter decisions with better context. Find edges
                    others completely miss. Win more — across your entire portfolio.
                  </p>
                  {[
                    'See the big picture across all your leagues',
                    'Make smarter decisions with better context',
                    'Find edges others completely miss',
                    'Win more — across your entire portfolio',
                  ].map((t) => (
                    <div key={t} className="mb-2 flex items-start gap-2">
                      <span className="text-[14px]" style={{ color: GREEN }}>
                        ✓
                      </span>
                      <span className="text-[14px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
                        {t}
                      </span>
                    </div>
                  ))}
                  <Link
                    href="/auth/signup"
                    className="mt-4 inline-block rounded-xl border px-5 py-2.5 text-[14px] font-semibold text-[#36E7A1] transition hover:bg-[rgba(54,231,161,0.08)]"
                    style={{ borderColor: GREEN, fontFamily: 'var(--font-body)' }}
                  >
                    Start 7-Day Free Trial →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMPARISON */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-[1400px] items-start gap-12 lg:grid-cols-[40%_60%]">
            <div>
              <h2 className="text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(26px,4vw,52px)' }}>
                MOST TOOLS GIVE RANKINGS.
                <br />
                <span style={{ color: GREEN }}>WE GIVE DECISIONS.</span>
              </h2>
              <p className="mb-6 max-w-[400px] text-[14px] leading-relaxed text-white/48" style={{ fontFamily: 'var(--font-body)' }}>
                Boom or Bust is the only platform built exclusively for dynasty portfolio managers.
              </p>
              {[
                'Personalized for YOUR teams and leagues',
                'AI-powered trade negotiation',
                'Contention window analysis',
                'Dynasty momentum tracking',
                'Market inefficiency detection',
                'Portfolio exposure analysis',
                'Real-time Sleeper sync',
                '17 proprietary engines',
              ].map((t) => (
                <div key={t} className="mb-3 flex items-start gap-3">
                  <span className="text-[14px]" style={{ color: GREEN }}>
                    ✓
                  </span>
                  <span className="text-[14px] text-white/65" style={{ fontFamily: 'var(--font-body)' }}>
                    {t}
                  </span>
                </div>
              ))}
            </div>

            <div className="min-w-0 overflow-x-auto lg:overflow-visible">
              <div className="min-w-[640px] lg:min-w-0">
                <div
                  className="overflow-hidden rounded-2xl border border-white/[0.08]"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
              <div className="grid grid-cols-4 border-b border-white/[0.08] bg-white/[0.05]">
                <div className="p-3 text-left text-[11px] uppercase text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  FEATURE
                </div>
                <div className="p-3 text-center text-[11px] uppercase text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  KTC
                </div>
                <div className="p-3 text-center text-[11px] uppercase text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  DYNASTY NERDS
                </div>
                <div
                  className="border-l border-[rgba(54,231,161,0.15)] p-3 text-center text-[11px] font-bold uppercase text-[#36E7A1]"
                  style={{ fontFamily: 'var(--font-body)', background: 'rgba(54,231,161,0.08)' }}
                >
                  BOOM OR BUST
                </div>
              </div>
              {[
                'Multi-league portfolio',
                'AI trade negotiation',
                'Contention window',
                'Momentum tracking',
                'Personalized decisions',
                'Rookie pick engine',
                'Real-time sync',
                'Portfolio analytics',
              ].map((row) => (
                <div key={row} className="grid grid-cols-4 border-b border-white/[0.05]">
                  <div className="p-3 text-left text-[13px] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
                    {row}
                  </div>
                  <div className="p-3 text-center text-[13px]" style={{ color: RED }}>
                    ✗
                  </div>
                  <div className="p-3 text-center text-[13px]" style={{ color: RED }}>
                    ✗
                  </div>
                  <div
                    className="border-l border-[rgba(54,231,161,0.08)] p-3 text-center text-[13px] text-[#36E7A1]"
                    style={{ background: 'rgba(54,231,161,0.04)' }}
                  >
                    ✓
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-4 border-t border-white/[0.08] bg-white/[0.02]">
                <div className="p-3 text-[12px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  PRICE
                </div>
                <div className="p-3 text-center text-[12px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Free
                </div>
                <div className="p-3 text-center text-[12px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Free
                </div>
                <div
                  className="border-l border-[rgba(54,231,161,0.1)] p-3 text-center text-[12px] font-bold text-[#36E7A1]"
                  style={{ fontFamily: 'var(--font-mono)', background: 'rgba(54,231,161,0.06)' }}
                >
                  $0–$35/mo
                </div>
              </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REAL ANALYSIS */}
        <section className="border-t border-white/[0.06] px-6 py-16 lg:px-10">
          <div className="mx-auto max-w-[1000px] text-center">
            <h2 className="mb-2 text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,38px)' }}>
              BUILT ON REAL ANALYSIS — NOT JUST PROJECTIONS
            </h2>
            <p className="mb-8 text-[13px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
              Every recommendation is rooted in real data, not guesswork.
            </p>
            <div
              className="flex flex-wrap justify-center gap-3 rounded-[14px] border border-white/[0.08] p-6"
              style={{ background: 'rgba(255,255,255,0.03)' }}
            >
              {[
                ['📈', 'Player Usage Trends'],
                ['🎯', 'Matchup Difficulty'],
                ['💰', 'Market Value Shifts'],
                ['⚡', 'Injury Impact'],
                ['📅', 'Project Schedules'],
                ['⚙️', 'Team & League Settings'],
              ].map(([ic, lab]) => (
                <div
                  key={lab}
                  className="flex items-center gap-2 rounded-full border border-white/[0.08] px-5 py-2.5 text-[13px] text-white/70"
                  style={{ background: 'rgba(255,255,255,0.04)', fontFamily: 'var(--font-body)' }}
                >
                  <span>{ic}</span>
                  {lab}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DYNASTY STATS */}
        <section className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="mb-10 text-center text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,38px)' }}>
              BUILT FOR SERIOUS DYNASTY PLAYERS
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div
                className="rounded-[20px] border p-9"
                style={{
                  background: 'rgba(54,231,161,0.05)',
                  borderColor: 'rgba(54,231,161,0.2)',
                  boxShadow: '0 0 40px rgba(54,231,161,0.08)',
                }}
              >
                <p className="mb-2 text-[11px] uppercase tracking-wider text-[rgba(54,231,161,0.6)]" style={{ fontFamily: 'var(--font-body)' }}>
                  SIT/START EDGE
                </p>
                <p className="text-[56px] font-bold leading-none text-[#36E7A1]" style={{ fontFamily: 'var(--font-mono)' }}>
                  13.4%
                </p>
                <UpSparkline stroke={GREEN} />
                <p className="text-[11px] leading-relaxed text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  Validated accuracy over ECR (2025 Data)
                </p>
              </div>

              <div
                className="rounded-[20px] border p-9"
                style={{
                  background: 'rgba(34,211,238,0.05)',
                  borderColor: 'rgba(34,211,238,0.2)',
                  boxShadow: '0 0 40px rgba(34,211,238,0.08)',
                }}
              >
                <p className="mb-2 text-[11px] text-[rgba(34,211,238,0.6)]" style={{ fontFamily: 'var(--font-body)' }}>
                  Verified ✓
                </p>
                <p className="text-[48px] font-bold leading-none text-[#22D3EE]" style={{ fontFamily: 'var(--font-mono)' }}>
                  42-18-2
                </p>
                <p className="mt-2 text-[13px] font-semibold text-[#22D3EE]" style={{ fontFamily: 'var(--font-body)' }}>
                  VERIFIED RECORD
                </p>
                <p className="mt-3 text-[11px] leading-relaxed text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  Performance data from active Sleeper leagues
                </p>
              </div>

              <div
                className="rounded-[20px] border p-9"
                style={{
                  background: 'rgba(167,139,250,0.05)',
                  borderColor: 'rgba(167,139,250,0.2)',
                  boxShadow: '0 0 40px rgba(167,139,250,0.08)',
                }}
              >
                <p className="mb-4 text-[40px] leading-none hue-rotate-[15deg] saturate-150">⚙️</p>
                <h3
                  className="text-[22px] leading-tight tracking-[2px] text-white"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  REFINEMENT
                  <br />
                  FEEDBACK LOOP
                </h3>
                <p className="mt-3 text-[11px] leading-relaxed text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  100% transparency. Every miss fuels a model adjustment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="mb-2 text-center text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,38px)' }}>
              LOVED BY DYNASTY MANAGERS
            </h2>
            <p className="mb-10 text-center text-[14px] text-white/38" style={{ fontFamily: 'var(--font-body)' }}>
              Real managers. Real results. Real Sleeper leagues.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  name: 'Jake',
                  handle: '@DynastyKing22',
                  initial: 'J',
                  quote:
                    'Boom or Bust changed how I play dynasty. The trade analyzer alone has won me multiple leagues.',
                },
                {
                  name: 'Mike',
                  handle: '@FantasySavage',
                  initial: 'M',
                  quote: 'The accuracy is insane. 13.4% edge on sit/start is real. My teams have never been better.',
                },
                {
                  name: 'Tom',
                  handle: '@FF_Trader',
                  initial: 'T',
                  quote: 'I took the portfolio approach. Finally a tool that shows the big picture, not just one team.',
                },
                {
                  name: 'Brandon',
                  handle: '@DynastyBuilder',
                  initial: 'B',
                  quote: 'The AI trade counters are next level. I always know my leverage on every deal.',
                },
              ].map((t) => (
                <div
                  key={t.handle}
                  className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] p-5"
                  style={{ background: 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full border text-[14px] font-bold text-[#36E7A1]"
                      style={{
                        background: 'rgba(54,231,161,0.15)',
                        borderColor: 'rgba(54,231,161,0.2)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {t.initial}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                        {t.name}
                      </p>
                      <p className="text-[11px] text-white/35" style={{ fontFamily: 'var(--font-mono)' }}>
                        {t.handle}
                      </p>
                    </div>
                  </div>
                  <p className="flex-1 text-[13px] italic leading-[1.6] text-white/60" style={{ fontFamily: 'var(--font-body)' }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <span
                    className="mt-auto self-start rounded-full px-3 py-1 text-[11px] font-semibold text-[#36E7A1]"
                    style={{ background: 'rgba(54,231,161,0.12)', fontFamily: 'var(--font-body)' }}
                  >
                    Verified Sleeper ✓
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1100px]">
            <h2 className="mb-2 text-center text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(22px,3vw,38px)' }}>
              START FREE. UPGRADE WHEN YOU&apos;RE READY.
            </h2>
            <p className="mb-12 text-center text-[14px] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
              No contracts. Cancel anytime.
            </p>

            <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Free */}
              <div
                className="flex flex-col rounded-[20px] border border-white/[0.12] p-6"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Free
                </p>
                <p className="text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                  <span className="text-[40px] font-bold">$0</span>
                </p>
                <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                  Forever
                </p>
                <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {['AI Features', 'Media Features', 'Basic Analytics', '1 League', 'Basic Projections'].map((x) => (
                    <li key={x} className="flex items-start gap-2 text-[13px] text-white/55">
                      <span className="text-[13px] text-[#36E7A1]">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block rounded-xl border border-white/20 py-3 text-center text-[14px] font-bold text-white transition hover:border-white/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Get Started
                </Link>
              </div>

              {/* Rookie */}
              <div
                className="flex flex-col rounded-[20px] border border-white/[0.12] p-6"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Rookie
                </p>
                <p style={{ fontFamily: 'var(--font-mono)' }}>
                  <span className="text-[40px] font-bold text-white">$5</span>
                  <span className="text-[14px] text-white/40">/mo</span>
                </p>
                <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                  Billed monthly
                </p>
                <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {['Basic features', 'Trade Analyzer', 'Start/Sit Optimizer', 'Waiver Tools', 'Dynasty Basics'].map((x) => (
                    <li key={x} className="flex items-start gap-2 text-[13px] text-white/55">
                      <span className="text-[13px] text-[#36E7A1]">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block rounded-xl border border-white/20 py-3 text-center text-[14px] font-bold text-white transition hover:border-white/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Start Free Trial
                </Link>
              </div>

              {/* Veteran */}
              <div
                className="flex flex-col rounded-[20px] border border-white/[0.12] p-6"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  Veteran
                </p>
                <p style={{ fontFamily: 'var(--font-mono)' }}>
                  <span className="text-[40px] font-bold text-white">$15</span>
                  <span className="text-[14px] text-white/40">/mo</span>
                </p>
                <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                  Billed monthly
                </p>
                <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {['All Rookie features', 'Dynasty Engine', 'Advanced Analytics', 'Injury Tracker', 'Full Trost Factor'].map((x) => (
                    <li key={x} className="flex items-start gap-2 text-[13px] text-white/55">
                      <span className="text-[13px] text-[#36E7A1]">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block rounded-xl border border-white/20 py-3 text-center text-[14px] font-bold text-white transition hover:border-white/40"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Start Free Trial
                </Link>
              </div>

              {/* All-Pro */}
              <div
                className="relative flex flex-col rounded-[20px] border p-6 lg:scale-[1.02]"
                style={{
                  background: 'rgba(124,58,237,0.10)',
                  borderColor: 'rgba(124,58,237,0.5)',
                  boxShadow: '0 0 80px rgba(124,58,237,0.20)',
                }}
              >
                <span
                  className="absolute left-1/2 top-[-12px] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[11px] font-bold text-white"
                  style={{ background: '#7c3aed', fontFamily: 'var(--font-body)' }}
                >
                  MOST POPULAR
                </span>
                <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: 'var(--font-body)' }}>
                  All-Pro Terminal
                </p>
                <p style={{ fontFamily: 'var(--font-mono)' }}>
                  <span className="text-[40px] font-bold text-white">$35</span>
                  <span className="text-[14px] text-white/40">/mo</span>
                </p>
                <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: 'var(--font-body)' }}>
                  Billed monthly
                </p>
                <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
                  {[
                    'All Veteran features',
                    'Unlimited leagues',
                    'AI trade negotiation',
                    'Dynasty strategy engine',
                    'Portfolio Manager',
                    'Priority Support',
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2 text-[13px] text-white/55">
                      <span className="text-[13px] text-[#36E7A1]">✓</span>
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block rounded-xl py-3 text-center text-[14px] font-black text-black transition hover:-translate-y-px"
                  style={{
                    background: GREEN,
                    boxShadow: '0 0 32px rgba(54,231,161,0.3), 0 0 48px rgba(54,231,161,0.2)',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  Get All-Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative overflow-hidden border-t border-white/[0.06] px-6 py-28 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(54,231,161,0.06) 0%, transparent 70%)',
            }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-[900px]">
            <h2 className="mb-4 leading-none text-white" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(40px,7vw,96px)' }}>
              STOP GUESSING.
              <br />
              <span style={{ color: GREEN }}>START WINNING.</span>
            </h2>
            <p className="mb-10 text-[16px] text-white/45" style={{ fontFamily: 'var(--font-body)' }}>
              Don&apos;t overthink it. Use the data. Win more.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl px-14 py-5 text-[17px] font-black text-black transition hover:-translate-y-0.5"
              style={{
                background: GREEN,
                boxShadow: '0 0 60px rgba(54,231,161,0.4), 0 0 96px rgba(54,231,161,0.25)',
                fontFamily: 'var(--font-body)',
              }}
            >
              🏈 Import My Leagues
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer id="resources" className="border-t border-white/[0.06] bg-[#0a0d14] px-6 pb-8 pt-12 sm:px-10" style={{ padding: '48px max(24px, env(safe-area-inset-right)) 32px max(24px, env(safe-area-inset-left))' }}>
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-5">
              <div className="col-span-2 lg:col-span-1">
                <Image src="/logo-full2.png" alt="Boom or Bust" width={160} height={44} className="h-9 w-auto object-contain" />
                <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  The smartest scout in your fantasy league.
                </p>
              </div>

              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  Features
                </p>
                <Link href="#features" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Import Dashboard
                </Link>
                <Link href="/auth/signup" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Trade Analyzer
                </Link>
                <Link href="/auth/signup" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Start/Sit
                </Link>
                <Link href="/auth/signup" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Waiver Wire
                </Link>
              </div>

              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  How it Works
                </p>
                <Link href="/auth/signup" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Getting Started
                </Link>
                <Link href="#how" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Sleeper Sync
                </Link>
                <Link href="#how" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Formula Engine
                </Link>
                <Link href="#pricing" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Pricing
                </Link>
              </div>

              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  Resources
                </p>
                <a
                  href={TWITTER_PROFILE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Blog
                </a>
                <a
                  href={TWITTER_PROFILE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Community
                </a>
                <a
                  href="mailto:hello@boomorbust.app?subject=Careers"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  Careers
                </a>
              </div>

              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: 'var(--font-body)' }}>
                  Legal
                </p>
                <Link href="/privacy" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Privacy
                </Link>
                <Link href="/terms" className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                  Terms
                </Link>
              </div>
            </div>

            <div className="flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
              <p className="text-[12px] text-white/25" style={{ fontFamily: 'var(--font-body)' }}>
                © 2025 Boom or Bust. All rights reserved.
              </p>
              <div className="flex gap-5 text-[13px] text-white/35">
                <a href="https://twitter.com/boomorbustapp" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                  𝕏
                </a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                  Discord
                </a>
                <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="transition hover:text-white">
                  YouTube
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
