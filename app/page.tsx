'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { TWITTER_PROFILE_HREF } from '@/lib/twitter-public';

const BG = '#0a0d14';
const GREEN = '#36E7A1';
const PURPLE = '#A78BFA';
const INDIGO = '#6366F1';
const CYAN = '#22D3EE';
const AMBER = '#FBBF24';
const GOLD = '#FBBF24';

const MONO = 'var(--font-mono), "JetBrains Mono", monospace';
const BODY = 'var(--font-body), Inter, sans-serif';

/** Glass panel helper class string. */
const GLASS = 'border border-white/[0.08] bg-white/[0.03] backdrop-blur';

function Check({ color = GREEN }: { color?: string }) {
  return (
    <span className="shrink-0 text-[13px] leading-none" style={{ color }} aria-hidden>
      ✓
    </span>
  );
}

function Cross() {
  return (
    <span className="text-[14px] leading-none text-red-400" aria-hidden>
      ✗
    </span>
  );
}

// ───────────────────────────────────────────────────────────── Hero mockup ──

function HeroDashboard() {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const pct = 78;
  const offset = circ * (1 - pct / 100);

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl ${GLASS}`} style={{ boxShadow: '0 0 80px rgba(54,231,161,0.07)' }}>
      {/* chrome */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate text-[11px] text-white/40" style={{ fontFamily: BODY }}>
          Good Morning, Kody · Week 4 · 6-13 messages
        </span>
      </div>

      <div className="p-4">
        {/* top stat row */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl p-3 ${GLASS}`}>
            <p className="text-[9px] uppercase tracking-wider text-white/35" style={{ fontFamily: BODY }}>
              Mode is Field Edge
            </p>
            <p className="mt-1 text-[28px] font-bold leading-none" style={{ fontFamily: MONO, color: GREEN }}>
              +18.4
            </p>
            <p className="mt-1 text-[9px] text-white/30" style={{ fontFamily: BODY }}>
              Points in optimal setup
            </p>
            <div className="mt-3 flex h-8 items-end gap-1">
              {[40, 62, 50, 78, 66, 88, 72, 95].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${h}%`, background: i % 2 === 0 ? GREEN : 'rgba(54,231,161,0.35)' }}
                />
              ))}
            </div>
          </div>

          <div className={`flex flex-col items-center justify-center rounded-xl p-3 ${GLASS}`}>
            <p className="self-start text-[9px] uppercase tracking-wider text-white/35" style={{ fontFamily: BODY }}>
              Win Probability
            </p>
            <div className="relative mt-1 flex items-center justify-center">
              <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
                <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                <circle
                  cx="36"
                  cy="36"
                  r={r}
                  fill="none"
                  stroke={GREEN}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  transform="rotate(-90 36 36)"
                />
              </svg>
              <span className="absolute text-[18px] font-bold" style={{ fontFamily: MONO, color: GREEN }}>
                78%
              </span>
            </div>
            <p className="mt-1 text-[9px] text-white/30" style={{ fontFamily: BODY }}>
              Make playoffs
            </p>
          </div>
        </div>

        {/* roster cards */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { n: 'J. Jefferson', t: 'WR · MIN', s: '92', c: CYAN },
            { n: 'J. Taylor', t: 'RB · IND', s: '90', c: GREEN },
            { n: 'S. LaPorta', t: 'TE · DET', s: '81', c: PURPLE },
          ].map((p) => (
            <div key={p.n} className={`rounded-lg p-2.5 ${GLASS}`}>
              <p className="truncate text-[11px] font-semibold text-white" style={{ fontFamily: BODY }}>
                {p.n}
              </p>
              <p className="text-[9px] text-white/40" style={{ fontFamily: BODY }}>
                {p.t}
              </p>
              <p className="mt-1 text-[16px] font-bold leading-none" style={{ fontFamily: MONO, color: p.c }}>
                {p.s}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────── Page ──

export default function Home() {
  const [scrolled, setScrolled] = useState(false);

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
        style={{ background: 'radial-gradient(circle, rgba(54,231,161,0.05) 0%, transparent 70%)' }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed right-[-300px] top-[-200px] z-0 h-[700px] w-[700px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.05) 0%, transparent 70%)' }}
        aria-hidden
      />

      {/* ───────────────────────────────────────────── SECTION 1 — NAV ── */}
      <nav
        className="fixed left-0 right-0 top-0 z-50 h-16 border-b border-white/[0.06] backdrop-blur-xl transition-colors duration-300"
        style={{ background: scrolled ? 'rgba(10,13,20,0.98)' : 'rgba(10,13,20,0.85)' }}
      >
        <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-6 lg:px-10">
          <Link href="/" className="shrink-0">
            <Image
              src="/images/logo-full.png"
              alt="Boom or Bust"
              width={280}
              height={72}
              className="h-11 w-auto object-contain object-left sm:h-12"
              priority
            />
          </Link>

          <div className="hidden items-center gap-8 lg:flex">
            {[
              ['Features', '#features'],
              ['How it Works', '#how'],
              ['Pricing', '#pricing'],
              ['Resources', '#resources'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="text-[14px] text-white/50 transition-colors hover:text-white"
                style={{ fontFamily: BODY }}
              >
                {label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/auth/login"
              className="rounded-lg border border-white/15 px-3 py-2 text-[13px] text-white/60 transition hover:border-white/30 hover:text-white sm:px-4 sm:text-[14px]"
              style={{ fontFamily: BODY }}
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-xl px-3 py-2 text-[13px] font-bold transition hover:-translate-y-px sm:px-5 sm:py-2.5 sm:text-[14px] shadow-[0_0_28px_rgba(54,231,161,0.45)]"
              style={{ background: GREEN, color: BG, fontFamily: BODY }}
            >
              Import My Leagues
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-16">
        {/* ─────────────────────────────────────────── SECTION 2 — HERO ── */}
        <section className="px-6 py-16 lg:px-10 lg:py-24">
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 lg:grid-cols-2">
            {/* LEFT */}
            <div>
              <div className="mb-6 inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-[0.22em]"
                  style={{ color: GREEN, fontFamily: BODY }}
                >
                  Built for Sleeper Players
                </span>
              </div>

              <h1 style={{ fontFamily: BODY, fontWeight: 900, lineHeight: 1.02 }}>
                <span className="block text-white" style={{ fontSize: 'clamp(38px, 5.5vw, 60px)' }}>
                  Manage All Your
                </span>
                <span className="block text-white" style={{ fontSize: 'clamp(38px, 5.5vw, 60px)' }}>
                  Fantasy Leagues
                </span>
                <span
                  className="block italic"
                  style={{ fontSize: 'clamp(38px, 5.5vw, 60px)', color: GREEN }}
                >
                  Like a Portfolio.
                </span>
              </h1>

              <p
                className="mt-6 max-w-[520px] text-[16px] leading-[1.7] text-white/55"
                style={{ fontFamily: BODY }}
              >
                Sync your fantasy leagues and get personalised sit/start decisions, trades, analysis, and a weekly
                edge score — built specifically for your teams.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/auth/signup"
                  className="rounded-xl px-8 py-4 text-[15px] font-black transition hover:-translate-y-0.5 shadow-[0_0_40px_rgba(54,231,161,0.4)]"
                  style={{ background: GREEN, color: BG, fontFamily: BODY }}
                >
                  Import My Leagues
                </Link>
                <a
                  href="#mockup"
                  className="rounded-xl border border-white/20 px-8 py-4 text-[15px] font-semibold text-white transition hover:border-white/40 hover:bg-white/[0.04]"
                  style={{ fontFamily: BODY }}
                >
                  See It In Action
                </a>
              </div>

              <div
                className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-white/40"
                style={{ fontFamily: BODY }}
              >
                <span>
                  <span style={{ color: GREEN }}>✓</span> 100% Free to Start
                </span>
                <span className="text-white/15">·</span>
                <span>No Credit Card</span>
                <span className="text-white/15">·</span>
                <span>Secure with Sleeper</span>
              </div>
            </div>

            {/* RIGHT */}
            <div id="mockup" className="relative">
              <HeroDashboard />
            </div>
          </div>
        </section>

        {/* ───────────────────────────────────── SECTION 3 — STATS BAR ── */}
        <section className="border-y border-white/[0.06] bg-white/[0.03]">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-y-6 px-6 py-5 lg:justify-between lg:px-10">
            {/* Stat 1 */}
            <div className="flex min-w-[150px] flex-col items-center gap-1 px-4 lg:border-r lg:border-white/[0.06]">
              <span className="text-[11px] uppercase tracking-wider text-white/40" style={{ fontFamily: BODY }}>
                Built for
              </span>
              <span className="text-[18px] tracking-[2px] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                sleeper
              </span>
            </div>

            {[
              ['100+', 'Teams Optimized Weekly'],
              ['8,000+', 'Trades Analyzed'],
              ['82.5%', 'Trade Prediction Accuracy'],
            ].map(([val, lab], i) => (
              <div
                key={lab}
                className={`flex min-w-[150px] flex-col items-center gap-1 px-4 ${i < 2 ? 'lg:border-r lg:border-white/[0.06]' : 'lg:border-r lg:border-white/[0.06]'}`}
              >
                <span className="text-[26px] font-black leading-none" style={{ fontFamily: MONO, color: GREEN }}>
                  {val}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-white/40" style={{ fontFamily: BODY }}>
                  {lab}
                </span>
              </div>
            ))}

            {/* Stat 5 — stars */}
            <div className="flex min-w-[150px] flex-col items-center gap-1 px-4">
              <span className="text-[18px] leading-none" style={{ color: GOLD }}>
                ★★★★★
              </span>
              <span className="text-[11px] uppercase tracking-wider text-white/40" style={{ fontFamily: BODY }}>
                Trusted by Dynasty Experts
              </span>
            </div>
          </div>
        </section>

        {/* ──────────────────────────── SECTION 4 — SYNC TO DOMINANCE ── */}
        <section id="how" className="px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="mb-12 text-center text-white"
              style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(26px,3.4vw,40px)' }}
            >
              From Sync to Dominance in 30 Seconds
            </h2>

            <div className="grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
              {[
                {
                  n: '1',
                  icon: '☁',
                  title: 'Import Your Leagues',
                  body: 'Connect your Sleeper username and every league, roster, and trade syncs instantly — no manual entry, ever.',
                },
                {
                  n: '2',
                  icon: '🧠',
                  title: 'We Analyse Everything',
                  body: 'Rosters, projections, player values, trades, schedules, and injuries — all reflected in real time.',
                },
                {
                  n: '3',
                  icon: '🎯',
                  title: 'Get Sharp Analytics',
                  body: 'Sit/start calls, trade grades, waiver intelligence, and matchup edges across every league in one portfolio.',
                },
              ].map((s, idx) => (
                <React.Fragment key={s.n}>
                  <div className={`rounded-xl p-6 ${GLASS}`}>
                    <div
                      className="mb-4 flex h-9 w-9 items-center justify-center rounded-full text-[14px] font-bold"
                      style={{ background: 'rgba(99,102,241,0.18)', border: `1px solid ${INDIGO}`, color: INDIGO, fontFamily: MONO }}
                    >
                      {s.n}
                    </div>
                    <span className="text-[22px]">{s.icon}</span>
                    <h3 className="mb-2 mt-1 text-[16px] font-semibold text-white" style={{ fontFamily: BODY }}>
                      {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed text-white/50" style={{ fontFamily: BODY }}>
                      {s.body}
                    </p>
                  </div>
                  {idx < 2 ? (
                    <div className="hidden items-center justify-center text-[24px] text-white/30 lg:flex" aria-hidden>
                      →
                    </div>
                  ) : null}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────── SECTION 5 — FEATURE GRID ── */}
        <section id="features" className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="mb-12 text-center text-white"
              style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(26px,3.4vw,40px)' }}
            >
              Everything You Need to Win — In One Place
            </h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: '📊',
                  ac: 'rgba(99,102,241,0.15)',
                  tc: INDIGO,
                  title: 'Import Dashboard',
                  body: 'A cross-portfolio overview of all your teams. Track diversification, exposure, and your watchlist in one place.',
                  link: 'See all leagues →',
                },
                {
                  icon: '⚡',
                  ac: 'rgba(54,231,161,0.15)',
                  tc: GREEN,
                  title: 'Start/Sit Optimizer',
                  body: 'Confidence-rated lineup calls with projected points for every starter and bench decision, in context.',
                  link: 'Optimize a lineup →',
                },
                {
                  icon: '⇄',
                  ac: 'rgba(34,211,238,0.15)',
                  tc: CYAN,
                  title: 'Trade Analyzer',
                  body: 'Add players from any league and see who wins the deal — with confidence scores, offers, and counters.',
                  link: 'Analyse a trade →',
                },
                {
                  icon: '🔍',
                  ac: 'rgba(251,191,36,0.15)',
                  tc: AMBER,
                  title: 'Waiver Wire Targets',
                  body: 'Find undervalued players before your league mates do, with curated picks that improve your roster.',
                  link: 'View top targets →',
                },
                {
                  icon: '🎯',
                  ac: 'rgba(167,139,250,0.15)',
                  tc: PURPLE,
                  title: 'Dynasty Strategy Engine',
                  body: 'Long-term planning with contention windows and rebuild paths tailored to each of your teams.',
                  link: 'Get my strategy →',
                },
                {
                  icon: '★',
                  ac: 'rgba(251,191,36,0.15)',
                  tc: GOLD,
                  title: 'Rookie Pick Intelligence',
                  body: 'Evaluate rookie prospects with deep analytics, grades, and future projections before draft day.',
                  link: 'View rookie board →',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className={`rounded-xl p-5 transition hover:-translate-y-0.5 hover:border-white/20 ${GLASS}`}
                >
                  <div
                    className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl text-[16px]"
                    style={{ background: f.ac, color: f.tc }}
                  >
                    {f.icon}
                  </div>
                  <h3 className="mb-1 text-[15px] font-semibold text-white" style={{ fontFamily: BODY }}>
                    {f.title}
                  </h3>
                  <p className="mb-3 text-[12.5px] leading-relaxed text-white/45" style={{ fontFamily: BODY }}>
                    {f.body}
                  </p>
                  <Link href="/auth/signup" className="text-[12px] font-medium" style={{ color: GREEN }}>
                    {f.link}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────── SECTION 6 — COMPARISON TABLE ── */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-[1300px] items-start gap-12 lg:grid-cols-[40%_60%]">
            <div>
              <h2 style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(28px,3.8vw,46px)', lineHeight: 1.05 }}>
                <span className="block text-white">Most Tools Give Rankings.</span>
                <span className="block" style={{ color: GREEN }}>
                  We Give Decisions.
                </span>
              </h2>
              <p className="mb-6 mt-4 max-w-[420px] text-[14px] leading-relaxed text-white/50" style={{ fontFamily: BODY }}>
                Boom or Bust is the only platform built to help dynasty managers run every league like a single
                portfolio.
              </p>
              <div className="space-y-3">
                {[
                  'Personalised review of your teams and leagues',
                  'Explained recommendations and confidence',
                  'Multi-league portfolio overview',
                  'Built for real dynasty managers',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <Check />
                    <span className="text-[14px] text-white/65" style={{ fontFamily: BODY }}>
                      {t}
                    </span>
                  </div>
                ))}
              </div>
              <a
                href="#pricing"
                className="mt-6 inline-block rounded-xl border px-5 py-2.5 text-[14px] font-semibold transition hover:bg-[rgba(54,231,161,0.08)]"
                style={{ borderColor: GREEN, color: GREEN, fontFamily: BODY }}
              >
                Compare for yourself →
              </a>
            </div>

            <div className="min-w-0 overflow-x-auto">
              <div className={`min-w-[560px] overflow-hidden rounded-xl ${GLASS}`} style={{ background: 'rgba(255,255,255,0.02)' }}>
                {/* header */}
                <div className="grid grid-cols-5 border-b border-white/[0.08] bg-white/[0.04] text-center">
                  <div className="p-3 text-left text-[11px] uppercase text-white/40" style={{ fontFamily: BODY }}>
                    Feature
                  </div>
                  {['General', 'KTC', 'Dynasty Nerds'].map((h) => (
                    <div key={h} className="p-3 text-[11px] uppercase text-white/40" style={{ fontFamily: BODY }}>
                      {h}
                    </div>
                  ))}
                  <div
                    className="border-l border-[rgba(54,231,161,0.18)] p-3 text-[11px] font-bold uppercase"
                    style={{ color: GREEN, background: 'rgba(54,231,161,0.08)', fontFamily: BODY }}
                  >
                    Boom or Bust
                  </div>
                </div>

                {[
                  ['Multi-league portfolio', false, false, false],
                  ['Personalized advice', false, false, false],
                  ['Trade acceleration', false, true, false],
                  ['Start/sit optimizer', false, false, false],
                  ['Proactive alerts', false, false, false],
                  ['Rookie pick engine', false, false, false],
                ].map((row) => {
                  const [name, g, k, d] = row as [string, boolean, boolean, boolean];
                  return (
                    <div key={name} className="grid grid-cols-5 border-b border-white/[0.05] text-center">
                      <div className="p-3 text-left text-[13px] text-white/65" style={{ fontFamily: BODY }}>
                        {name}
                      </div>
                      <div className="p-3">{g ? <Check /> : <Cross />}</div>
                      <div className="p-3">{k ? <Check /> : <Cross />}</div>
                      <div className="p-3">{d ? <Check /> : <Cross />}</div>
                      <div className="border-l border-[rgba(54,231,161,0.1)] p-3" style={{ background: 'rgba(54,231,161,0.04)' }}>
                        <Check />
                      </div>
                    </div>
                  );
                })}

                {/* price row */}
                <div className="grid grid-cols-5 text-center">
                  <div className="p-3 text-left text-[12px] uppercase text-white/40" style={{ fontFamily: BODY }}>
                    Price
                  </div>
                  <div className="p-3 text-[12px] text-white/40" style={{ fontFamily: MONO }}>
                    $0/time
                  </div>
                  <div className="p-3 text-[12px] text-white/40" style={{ fontFamily: BODY }}>
                    Free
                  </div>
                  <div className="p-3 text-[12px] text-white/40" style={{ fontFamily: BODY }}>
                    Free
                  </div>
                  <div
                    className="border-l border-[rgba(54,231,161,0.1)] p-3 text-[12px] font-bold"
                    style={{ background: 'rgba(54,231,161,0.10)', color: GREEN, fontFamily: MONO }}
                  >
                    $4.00/mo
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────── SECTION 7 — PORTFOLIO OVERVIEW ── */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto grid max-w-[1300px] items-center gap-12 lg:grid-cols-2">
            {/* LEFT panel */}
            <div className={`rounded-2xl p-6 ${GLASS}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-wider text-white/35" style={{ fontFamily: BODY }}>
                  Your Portfolio Overview
                </p>
                <p className="text-[10px] text-white/35" style={{ fontFamily: BODY }}>
                  6 Leagues
                </p>
              </div>

              <div className="mt-3 flex items-end gap-3">
                <span className="text-[40px] font-black leading-none text-white" style={{ fontFamily: MONO }}>
                  42-18-2
                </span>
                <span className="pb-1 text-[16px] font-bold" style={{ fontFamily: MONO, color: GREEN }}>
                  .604 Win%
                </span>
              </div>
              <p className="mt-1 text-[11px] text-white/35" style={{ fontFamily: BODY }}>
                Top 3 of 12 · 6 weeks remaining
              </p>

              <div className="mt-5 space-y-3">
                {[
                  ['Dynasty Sharks SF', 92, GREEN],
                  ['The War Room', 74, AMBER],
                  ['FF Empire 12', 58, INDIGO],
                ].map(([name, w, c]) => (
                  <div key={String(name)}>
                    <div className="mb-1 flex items-center justify-between text-[11px]" style={{ fontFamily: BODY }}>
                      <span className="text-white/55">{name}</span>
                      <span className="text-white/35" style={{ fontFamily: MONO }}>
                        {String(w)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full" style={{ width: `${w}%`, background: c as string }} />
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-[10px] uppercase tracking-wider text-white/35" style={{ fontFamily: BODY }}>
                Key Exposures
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[
                  ['Captain Olum', '6% of teams'],
                  ['Bionic Hill', '7% of teams'],
                  ['Combat Jack', '4% of teams'],
                ].map(([n, sub]) => (
                  <div key={n} className={`rounded-lg p-2.5 ${GLASS}`}>
                    <div
                      className="mb-1 flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
                      style={{ background: 'rgba(54,231,161,0.15)', color: GREEN, fontFamily: MONO }}
                    >
                      {n[0]}
                    </div>
                    <p className="truncate text-[10px] font-semibold text-white" style={{ fontFamily: BODY }}>
                      {n}
                    </p>
                    <p className="text-[9px] text-white/40" style={{ fontFamily: BODY }}>
                      {sub}
                    </p>
                  </div>
                ))}
              </div>

              <Link href="/auth/signup" className="mt-4 inline-block text-[12px] font-medium" style={{ color: GREEN }}>
                View all exposures →
              </Link>
            </div>

            {/* RIGHT text */}
            <div>
              <h2 style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(26px,3.4vw,42px)', lineHeight: 1.08 }}>
                <span className="block text-white">You Don&apos;t Manage One Team.</span>
                <span className="block" style={{ color: GREEN }}>
                  You Manage A Portfolio.
                </span>
              </h2>
              <p className="mb-6 mt-4 max-w-[500px] text-[14px] leading-relaxed text-white/50" style={{ fontFamily: BODY }}>
                See the big picture across all your teams. Make smarter decisions with better context, and find the
                edges single-team players completely miss.
              </p>
              <div className="space-y-2.5">
                {[
                  'See the big picture across all your leagues',
                  'Make faster decisions with better context',
                  'Track player exposure across leagues',
                  'Spot timing and contention concerns early',
                  'Optimize for now and the long term',
                  'Make smarter moves with the full picture',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: GREEN }} />
                    <span className="text-[14px] text-white/60" style={{ fontFamily: BODY }}>
                      {t}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/auth/signup"
                className="mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-black transition hover:-translate-y-0.5 shadow-[0_0_32px_rgba(54,231,161,0.35)]"
                style={{ background: GREEN, color: BG, fontFamily: BODY }}
              >
                Start 7-Day Free Trial →
              </Link>
            </div>
          </div>
        </section>

        {/* ───────────────────── SECTION 8 — BUILT ON REAL ANALYSIS ── */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1000px] text-center">
            <h2 style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(24px,3vw,38px)' }}>
              <span className="text-white">Built on Real Analysis. </span>
              <span style={{ color: GREEN }}>Not Just Projections</span>
            </h2>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {[
                ['📈', 'Player Usage Trends'],
                ['⚔', 'Matchup Difficulty'],
                ['📊', 'Market Value Stats'],
                ['⚕', 'Injury Impact'],
                ['📅', 'Team & Schedules'],
              ].map(([ic, lab]) => (
                <div
                  key={lab}
                  className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] text-white/70 ${GLASS}`}
                  style={{ fontFamily: BODY }}
                >
                  <span>{ic}</span>
                  {lab}
                </div>
              ))}
            </div>

            <p className="mt-6 text-[13px] text-white/40" style={{ fontFamily: BODY }}>
              Every recommendation comes with analysis and a confidence score, so you can trust your result.
            </p>
          </div>
        </section>

        {/* ──────────────── SECTION 9 — SERIOUS DYNASTY PLAYERS ── */}
        <section className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="mb-12 text-center text-white"
              style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(26px,3.4vw,42px)' }}
            >
              Built for Serious Dynasty Players
            </h2>

            <div className="grid gap-6 sm:grid-cols-3">
              {/* Card 1 */}
              <div
                className="rounded-2xl border p-8"
                style={{ background: 'rgba(54,231,161,0.05)', borderColor: 'rgba(54,231,161,0.25)', boxShadow: '0 0 50px rgba(54,231,161,0.1)' }}
              >
                <p className="text-[52px] font-black leading-none" style={{ fontFamily: MONO, color: GREEN }}>
                  13.4%
                </p>
                <p className="mt-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: GREEN, fontFamily: BODY }}>
                  Sit/Start Edge
                </p>
                <svg className="my-4 h-10 w-full" viewBox="0 0 120 40" fill="none" aria-hidden>
                  <polyline points="0,34 20,28 40,30 60,18 80,22 100,8 120,6" stroke={GREEN} strokeWidth="2" fill="none" />
                </svg>
                <p className="text-[11px] leading-relaxed text-white/40" style={{ fontFamily: BODY }}>
                  Validated accuracy over ECR (2025 Data).
                </p>
              </div>

              {/* Card 2 */}
              <div
                className="rounded-2xl border p-8"
                style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.3)', boxShadow: '0 0 50px rgba(99,102,241,0.1)' }}
              >
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
                  style={{ background: 'rgba(99,102,241,0.18)', color: INDIGO, fontFamily: BODY }}
                >
                  Verified ✓
                </span>
                <p className="mt-3 text-[46px] font-black leading-none text-white" style={{ fontFamily: MONO }}>
                  42-18-2
                </p>
                <p className="mt-2 text-[12px] font-semibold uppercase tracking-wider" style={{ color: INDIGO, fontFamily: BODY }}>
                  Confirmed Record
                </p>
                <p className="mt-4 text-[11px] leading-relaxed text-white/40" style={{ fontFamily: BODY }}>
                  Performance data pulled directly from active Sleeper leagues.
                </p>
              </div>

              {/* Card 3 */}
              <div className={`rounded-2xl p-8 ${GLASS}`}>
                <p className="text-[40px] leading-none">⚙️</p>
                <h3
                  className="mt-3 text-[22px] font-black leading-tight text-white"
                  style={{ fontFamily: BODY }}
                >
                  Refinement
                  <br />
                  Feedback Loop
                </h3>
                <p className="mt-4 text-[11px] leading-relaxed text-white/40" style={{ fontFamily: BODY }}>
                  100% transparency. Every miss fuels a model adjustment.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────── SECTION 10 — SOCIAL PROOF ── */}
        <section id="resources" className="border-t border-white/[0.06] px-6 py-14 lg:px-10">
          <div className="mx-auto max-w-[1000px] text-center">
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/35" style={{ fontFamily: BODY }}>
              Loved by Players
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
              {['sleeper', 'Dynasty Nerds', 'FantasyPros', 'DLF'].map((logo) => (
                <span
                  key={logo}
                  className="text-[18px] tracking-[1px] text-white opacity-40 transition hover:opacity-100"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {logo}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────────────────── SECTION 11 — PRICING ── */}
        <section id="pricing" className="border-t border-white/[0.06] px-6 py-20 lg:px-10">
          <div className="mx-auto max-w-[1200px]">
            <h2
              className="mb-12 text-center text-white"
              style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(26px,3.4vw,42px)' }}
            >
              Start Free. Upgrade When You&apos;re Ready.
            </h2>

            <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Free */}
              <PricingCard
                tier="Free"
                price="$0"
                cadence="forever"
                features={['Basic features', 'Media features', 'Lookout features', 'Watchlist features', 'Single account activity']}
                cta="Free"
              />
              {/* Rookie */}
              <PricingCard
                tier="Rookie"
                price="$5"
                cadence="/mo"
                features={['Up to 7 leagues', 'Verdict scores + grade', 'Trade analyzer + grade', 'Waiver wire grade']}
                cta="Start Free Trial"
              />
              {/* Veteran */}
              <PricingCard
                tier="Veteran"
                price="$10"
                cadence="/mo"
                features={['Up to 15 leagues', 'Dynasty strategy engine', 'Team analysis + export', 'Parallel account activity']}
                cta="Start Free Trial"
              />
              {/* All-Pro Terminal — featured */}
              <div
                className="relative flex flex-col rounded-2xl border p-6"
                style={{ borderColor: 'rgba(167,139,250,0.5)', background: 'rgba(167,139,250,0.06)', boxShadow: '0 0 60px rgba(167,139,250,0.15)' }}
              >
                <span
                  className="absolute left-1/2 top-[-12px] -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-[11px] font-bold text-white"
                  style={{ background: PURPLE, fontFamily: BODY }}
                >
                  FEATURED
                </span>
                <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: BODY }}>
                  All-Pro Terminal
                </p>
                <p style={{ fontFamily: MONO }}>
                  <span className="text-[40px] font-bold text-white">$20</span>
                  <span className="text-[14px] text-white/40">/mo</span>
                </p>
                <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: BODY }}>
                  Billed monthly
                </p>
                <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: BODY }}>
                  {[
                    'Premium features',
                    'Unlimited leagues',
                    'Behavioral trade engine',
                    'Smart trade negotiation',
                    'Dynasty power rating',
                    'Priority support',
                  ].map((x) => (
                    <li key={x} className="flex items-start gap-2 text-[13px] text-white/60">
                      <Check />
                      {x}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth/signup"
                  className="block rounded-xl py-3 text-center text-[14px] font-black text-white transition hover:-translate-y-0.5"
                  style={{ background: PURPLE, fontFamily: BODY, boxShadow: '0 0 32px rgba(167,139,250,0.4)' }}
                >
                  Get All-Pro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────────── SECTION 12 — FINAL CTA ── */}
        <section className="relative overflow-hidden border-t border-white/[0.06] px-6 py-28 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, rgba(54,231,161,0.06) 0%, transparent 70%)' }}
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-[900px]">
            <h2 style={{ fontFamily: BODY, fontWeight: 900, fontSize: 'clamp(40px,7vw,88px)', lineHeight: 0.98 }}>
              <span className="block text-white">STOP GUESSING.</span>
              <span className="block" style={{ color: GREEN }}>
                START WINNING.
              </span>
            </h2>
            <p className="mb-10 mt-4 text-[16px] text-white/45" style={{ fontFamily: BODY }}>
              Stop guessing. Command your leagues. Let the engines do the work.
            </p>
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl px-12 py-5 text-[17px] font-black transition hover:-translate-y-0.5 shadow-[0_0_48px_rgba(54,231,161,0.4)]"
              style={{ background: GREEN, color: BG, fontFamily: BODY }}
            >
              Import My Leagues
            </Link>
          </div>
        </section>

        {/* ───────────────────────────────── SECTION 13 — FOOTER ── */}
        <footer className="border-t border-white/[0.06] px-6 pb-8 pt-14 lg:px-10" style={{ background: BG }}>
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-12 grid grid-cols-2 gap-10 lg:grid-cols-5">
              <div className="col-span-2 lg:col-span-1">
                <Image
                  src="/images/logo-full.png"
                  alt="Boom or Bust"
                  width={280}
                  height={72}
                  className="h-11 w-auto max-w-full object-contain object-left sm:h-12"
                />
                <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-white/35" style={{ fontFamily: BODY }}>
                  The smartest scout in your fantasy league.
                </p>
              </div>

              <FooterCol
                title="Features"
                links={[
                  ['Import Dashboard', '#features'],
                  ['Trade Analyzer', '/auth/signup'],
                  ['Start/Sit', '/auth/signup'],
                  ['Waiver Wire', '/auth/signup'],
                ]}
              />
              <FooterCol
                title="How it Works"
                links={[
                  ['Getting Started', '/auth/signup'],
                  ['Sleeper Sync', '#how'],
                  ['Formula Engine', '#how'],
                  ['Pricing', '#pricing'],
                ]}
              />
              <div>
                <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: BODY }}>
                  Resources
                </p>
                <a
                  href={TWITTER_PROFILE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: BODY }}
                >
                  Blog
                </a>
                <a
                  href={TWITTER_PROFILE_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: BODY }}
                >
                  Community
                </a>
                <a
                  href="mailto:hello@boomorbust.app?subject=Careers"
                  className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
                  style={{ fontFamily: BODY }}
                >
                  Careers
                </a>
              </div>
              <FooterCol
                title="Legal"
                links={[
                  ['Privacy', '/privacy'],
                  ['Terms', '/terms'],
                ]}
              />
            </div>

            <div className="flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
              <p className="text-[12px] text-white/25" style={{ fontFamily: BODY }}>
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

// ───────────────────────────────────────────────────── small components ──

function PricingCard({
  tier,
  price,
  cadence,
  features,
  cta,
}: {
  tier: string;
  price: string;
  cadence: string;
  features: string[];
  cta: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.12] bg-white/[0.03] p-6">
      <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-white/40" style={{ fontFamily: BODY }}>
        {tier}
      </p>
      <p style={{ fontFamily: MONO }}>
        <span className="text-[40px] font-bold text-white">{price}</span>
        <span className="text-[14px] text-white/40">{cadence === 'forever' ? '' : cadence}</span>
      </p>
      <p className="mb-6 text-[11px] text-white/30" style={{ fontFamily: BODY }}>
        {cadence === 'forever' ? 'forever' : 'Billed monthly'}
      </p>
      <ul className="mb-6 flex-1 space-y-2" style={{ fontFamily: BODY }}>
        {features.map((x) => (
          <li key={x} className="flex items-start gap-2 text-[13px] text-white/55">
            <Check />
            {x}
          </li>
        ))}
      </ul>
      <Link
        href="/auth/signup"
        className="block rounded-xl border border-white/20 py-3 text-center text-[14px] font-bold text-white transition hover:border-white/40"
        style={{ fontFamily: BODY }}
      >
        {cta}
      </Link>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.15em] text-white/35" style={{ fontFamily: BODY }}>
        {title}
      </p>
      {links.map(([label, href]) =>
        href.startsWith('#') || href.startsWith('/') ? (
          <Link
            key={label}
            href={href}
            className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
            style={{ fontFamily: BODY }}
          >
            {label}
          </Link>
        ) : (
          <a
            key={label}
            href={href}
            className="mb-2.5 block text-[13px] text-white/45 transition hover:text-white"
            style={{ fontFamily: BODY }}
          >
            {label}
          </a>
        )
      )}
    </div>
  );
}
