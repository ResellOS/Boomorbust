'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FEED_CSS, LANDING, VERDICT_PILL } from './constants';

const HERO_ROWS = [
  { pill: 'BUY', label: 'BUY', player: 'Trey McBride', meta: 'TE · ARI', score: 82, delay: 0 },
  { pill: 'START', label: 'START', player: 'Lamar Jackson', meta: 'QB · BAL', score: 78, delay: 120 },
  { pill: 'SELL', label: 'SELL', player: 'Harold Fannin', meta: 'TE · CLE', score: 65, delay: 240 },
  { pill: 'ADD', label: 'ADD', player: 'Theo Johnson', meta: 'TE · NYG', score: 64, delay: 360 },
  { pill: 'REVIEW', label: 'REVIEW', player: 'Blue League', meta: '3 roster issues —', score: null, delay: 480 },
];

function HeroBriefingCard() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border"
      style={{ background: LANDING.surface, borderColor: LANDING.border }}
    >
      <span className="absolute right-3 top-3 font-mono text-[8px] uppercase tracking-wider text-[#e8ecf4]/20">
        Example
      </span>
      <div className="border-b px-4 py-3" style={{ borderColor: LANDING.border }}>
        <p className="font-figtree text-[13px] text-[#e8ecf4]">Good morning, Champion.</p>
        <p className="font-figtree text-[12px] text-[#e8ecf4]/60">
          Here&apos;s your front office briefing for today.
        </p>
      </div>

      <div className="grid md:grid-cols-[1fr_140px]">
        <div className="border-r p-3" style={{ borderColor: LANDING.border }}>
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-[#e8ecf4]/45">
            Today&apos;s Top Actions
          </div>
          <div className="space-y-1.5">
            {HERO_ROWS.map((row) => {
              const style = VERDICT_PILL[row.pill] ?? VERDICT_PILL.BUY;
              return (
                <div
                  key={row.player}
                  className="hero-row-in flex items-center gap-2 rounded px-1 py-1"
                  style={{
                    animationDelay: visible ? `${row.delay}ms` : '0ms',
                    opacity: visible ? undefined : 0,
                  }}
                >
                  <span
                    className="w-12 shrink-0 rounded px-1 py-0.5 text-center font-mono text-[8px] uppercase"
                    style={{ background: style.bg, color: style.text }}
                  >
                    {row.label}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-figtree text-[12px] text-[#e8ecf4]">
                    {row.player}
                  </span>
                  <span className="hidden shrink-0 font-mono text-[9px] text-[#e8ecf4]/45 sm:inline">
                    {row.meta}
                  </span>
                  {row.score != null && (
                    <span className="font-mono text-[11px] tabular-nums text-[#36E7A1]">{row.score}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 p-3">
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wide text-[#e8ecf4]/45">Portfolio Health</div>
            <div className="mt-1 font-mono text-[22px] tabular-nums text-[#36E7A1]">A-</div>
            <div className="font-mono text-[9px] text-[#36E7A1]">+6.1% vs last week</div>
          </div>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wide text-[#e8ecf4]/45">Biggest Edge</div>
            <div className="mt-1 font-figtree text-[10px] leading-snug text-[#e8ecf4]/75">
              Your WR depth <span className="font-mono text-[#36E7A1]">+18.4%</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wide text-[#EF4444]/80">Risk Alert</div>
            <div className="mt-1 font-figtree text-[10px] leading-snug text-[#EF4444]/90">
              High exposure — Ja&apos;Marr Chase (4 leagues)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingHero() {
  return (
    <section className="relative min-h-screen pt-[64px]">
      <style dangerouslySetInnerHTML={{ __html: FEED_CSS }} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 20% 20%, rgba(54,231,161,0.08), transparent 60%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(167,139,250,0.1), transparent 55%)',
        }}
      />

      <div className="relative mx-auto grid max-w-[1280px] gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12 lg:px-8 lg:py-24">
        <div>
          <h1 className="font-figtree text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.05] tracking-[-0.02em] text-[#e8ecf4]">
            DRAFT THE{' '}
            <span style={{ color: LANDING.boom, textShadow: '0 0 32px rgba(54,231,161,0.45)' }}>BOOM.</span>
            <br />
            DODGE THE{' '}
            <span style={{ color: LANDING.bust, textShadow: '0 0 32px rgba(167,139,250,0.4)' }}>BUST.</span>
          </h1>
          <p className="mt-5 max-w-lg font-figtree text-[15px] leading-relaxed text-[#e8ecf4]/55">
            Data-powered dynasty intelligence that analyzes every roster, trade, lineup, and league in your
            Sleeper portfolio.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/onboarding"
              className="rounded-md px-5 py-3 font-figtree text-[14px] text-[#0a0d14] transition hover:brightness-110"
              style={{ background: LANDING.boom }}
            >
              Import My Leagues →
            </Link>
            <Link
              href="#features"
              className="rounded-md border px-5 py-3 font-figtree text-[14px] text-[#e8ecf4]/85 transition hover:border-[#36E7A1]/35"
              style={{ borderColor: LANDING.border }}
            >
              Watch Demo ▶
            </Link>
          </div>
          <ul className="mt-8 space-y-2">
            {[
              'Connects to Sleeper in under 30 seconds',
              'Every call tracked publicly',
              'Built for serious dynasty managers',
            ].map((t) => (
              <li key={t} className="flex items-center gap-2 font-figtree text-[13px] text-[#e8ecf4]/65">
                <span style={{ color: LANDING.boom }}>✓</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <HeroBriefingCard />
      </div>
    </section>
  );
}
