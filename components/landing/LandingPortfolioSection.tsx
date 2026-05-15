'use client';

import Link from 'next/link';
import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const CYAN = '#22D3EE';
const AMBER = '#FBBF24';
const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[24px] sm:p-6';

const BULLETS = [
  'One portfolio view across every Sleeper league you run.',
  'Spot concentration risk before a bad week wipes multiple entries.',
  'Compare trade outcomes and roster construction side-by-side.',
  'Switch league context without losing empire-level signals.',
];

export default function LandingPortfolioSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28" style={{ background: BG }}>
      <div
        ref={ref}
        className={`landing-reveal-up mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-14 ${inView ? 'landing-reveal-up--in' : ''}`}
      >
        <div className={GLASS}>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
                Verified record
              </p>
              <p className="mt-1 font-mono text-[clamp(2rem,8vw,3.25rem)] font-bold tabular-nums leading-none text-[#36E7A1]">
                42-18-2
              </p>
            </div>
            <span
              className="rounded-full border border-emerald-500/30 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-400"
              style={{ fontFamily: 'var(--font-body)', boxShadow: '0 0 14px rgba(54,231,161,0.25)' }}
            >
              Live
            </span>
          </div>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            League distribution
          </p>
          <div className="mt-3 flex h-28 items-end gap-1">
            {[72, 45, 80, 35, 60, 85, 40, 55, 70, 30].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md"
                style={{
                  height: `${h}%`,
                  background: i % 3 === 0 ? '#36E7A1' : i % 3 === 1 ? '#FBBF24' : 'rgba(255,255,255,0.12)',
                }}
              />
            ))}
          </div>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Top opponents faced
          </p>
          <ul className="mt-3 space-y-2">
            {['@NorthStarsFF', '@DynastyDorks', '@WinNowWire'].map((h) => (
              <li
                key={h}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[13px] text-white/90"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.08] font-mono text-[11px] font-bold text-white/80">
                  {h.slice(1, 3).toUpperCase()}
                </span>
                <span className="font-mono text-[12px] text-[#94A3B8]">{h}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2
            className="text-[clamp(1.65rem,6vw,3rem)] font-normal leading-[1.05] tracking-[0.02em] text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            You Don&apos;t Manage One Team.
            <br />
            You Manage A Portfolio.
          </h2>
          <ul className="mt-8 space-y-4">
            {BULLETS.map((b) => (
              <li key={b} className="flex gap-3 text-[15px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="mt-0.5 shrink-0 font-mono text-[#36E7A1]" style={{ filter: 'drop-shadow(0 0 8px rgba(54,231,161,0.45))' }}>
                  ✓
                </span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/signup"
            className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-xl px-8 py-3 text-[15px] font-bold text-[#0a0d14] shadow-[0_0_28px_rgba(54,231,161,0.45)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_32px_rgba(54,231,161,0.5)]"
            style={{ fontFamily: 'var(--font-body)', background: BOOM }}
          >
            Start <span className="font-mono tabular-nums">7</span>-Day Free Trial
          </Link>
        </div>
      </div>
    </section>
  );
}
