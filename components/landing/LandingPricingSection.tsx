'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useInViewOnce } from '@/hooks/useInViewOnce';
import PricingCheckoutButton from '@/components/landing/PricingCheckoutButton';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const PURPLE_FILL = '#7c3aed';
const PURPLE_TEXT = '#A78BFA';

const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px] transition-transform duration-200 ease-out hover:scale-[1.02]';

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-snug text-white/85" style={{ fontFamily: 'var(--font-body)' }}>
      <span className="shrink-0 font-semibold" style={{ color: BOOM }}>
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function PriceLine({ amount, color }: { amount: string; color?: string }) {
  return (
    <p className="mt-3 leading-none">
      <span
        className="text-[clamp(1.75rem,2.5vw,2.125rem)] font-bold tabular-nums text-white font-mono"
        style={color ? { color } : undefined}
      >
        ${amount}
      </span>
      <span className="ml-1 text-[13px] font-medium text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
        /mo
      </span>
    </p>
  );
}

export default function LandingPricingSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24" style={{ background: BG }}>
      <div className="mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-[minmax(0,260px)_1fr] lg:items-start lg:gap-12 xl:gap-16">
        <div className="max-w-sm lg:pt-2">
          <h2
            className="text-[clamp(1.5rem,6vw,2.65rem)] font-normal leading-[1.08] tracking-[0.02em] text-white sm:text-[clamp(1.85rem,3.2vw,2.65rem)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Simple. Transparent. All the Edge.
          </h2>
        </div>

        <div
          ref={ref}
          className={`landing-stagger-up grid grid-cols-1 items-end gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {/* Free */}
          <div className={`${GLASS} flex min-h-[360px] flex-col p-5 sm:p-6`}>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Free
            </p>
            <PriceLine amount="0" />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              Get started with core tools.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>
                <span className="font-mono tabular-nums">3</span> Leagues
              </CheckItem>
              <CheckItem>Player Verdicts</CheckItem>
              <CheckItem>Waiver Radar</CheckItem>
              <CheckItem>Basic Projections</CheckItem>
            </ul>
            <Link
              href="/signup?plan=free"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/[0.22] py-3 text-center text-[13px] font-semibold text-white transition-[filter,border-color,background-color] duration-200 hover:brightness-110 hover:border-white/35 hover:bg-white/[0.04]"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              Get Started
            </Link>
          </div>

          {/* Rookie */}
          <div className={`${GLASS} flex min-h-[360px] flex-col p-5 sm:p-6`}>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Rookie
            </p>
            <PriceLine amount="5" color={BOOM} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              Perfect for new dynasty players.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Free features</CheckItem>
              <CheckItem>Trade Analyzer</CheckItem>
              <CheckItem>Dynasty Age Clock</CheckItem>
              <CheckItem>Breakout Detector</CheckItem>
            </ul>
            <PricingCheckoutButton
              plan="rookie"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg border py-3 text-center text-[13px] font-semibold transition-[filter,box-shadow,background-color] duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(54,231,161,0.3)] hover:bg-[#36E7A1]/10 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: 'rgba(54, 231, 161, 0.55)',
                color: BOOM,
                boxShadow: '0 0 18px rgba(54, 231, 161, 0.12)',
              }}
            >
              Start <span className="font-mono tabular-nums">7</span>-Day Trial
            </PricingCheckoutButton>
          </div>

          {/* Veteran */}
          <div className={`${GLASS} flex min-h-[360px] flex-col p-5 sm:p-6`}>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Veteran
            </p>
            <PriceLine amount="10" color={BOOM} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              For serious dynasty competitors.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Rookie features</CheckItem>
              <CheckItem>Smart Trade Counter</CheckItem>
              <CheckItem>DMS Score</CheckItem>
              <CheckItem>Advanced Analytics</CheckItem>
            </ul>
            <PricingCheckoutButton
              plan="veteran"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg border py-3 text-center text-[13px] font-semibold transition-[filter,box-shadow,background-color] duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(54,231,161,0.3)] hover:bg-[#36E7A1]/10 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: 'rgba(54, 231, 161, 0.55)',
                color: BOOM,
                boxShadow: '0 0 18px rgba(54, 231, 161, 0.12)',
              }}
            >
              Start <span className="font-mono tabular-nums">7</span>-Day Trial
            </PricingCheckoutButton>
          </div>

          {/* All-Pro featured */}
          <div
            className="relative z-10 flex min-h-[400px] flex-col rounded-xl border border-purple-500/50 bg-white/[0.03] p-5 pt-7 backdrop-blur-[24px] transition-transform duration-200 ease-out hover:scale-[1.02] sm:p-6 sm:pt-8 xl:-translate-y-2 xl:scale-[1.03] xl:hover:scale-[1.05]"
            style={{
              boxShadow: '0 0 40px rgba(124, 58, 237, 0.25), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            <span
              className="absolute right-4 top-4 rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white"
              style={{
                fontFamily: 'var(--font-body)',
                background: PURPLE_FILL,
                boxShadow: '0 0 16px rgba(124, 58, 237, 0.55)',
              }}
            >
              MOST POPULAR
            </span>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              All-Pro
            </p>
            <PriceLine amount="20" color={PURPLE_TEXT} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              The full arsenal. Maximum edge.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Veteran features</CheckItem>
              <CheckItem>
                <span className="font-mono tabular-nums">15</span> Leagues
              </CheckItem>
              <CheckItem>Premium Projections</CheckItem>
              <CheckItem>Priority Support</CheckItem>
            </ul>
            <PricingCheckoutButton
              plan="allpro"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg py-3 text-center text-[13px] font-semibold text-white transition-[filter,opacity] duration-200 hover:brightness-110 hover:opacity-95 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-body)',
                background: PURPLE_FILL,
                boxShadow: '0 0 22px rgba(124, 58, 237, 0.45)',
              }}
            >
              Start <span className="font-mono tabular-nums">7</span>-Day Trial
            </PricingCheckoutButton>
          </div>
        </div>
      </div>
    </section>
  );
}
