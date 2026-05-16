'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useInViewOnce } from '@/hooks/useInViewOnce';
import PricingCheckoutButton from '@/components/landing/PricingCheckoutButton';

const BG = '#0a0d14';
const BOOM = '#3ECFAD';
const PURPLE = '#8B5CF6';

const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px] transition-transform duration-200 ease-out hover:scale-[1.01]';

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

function PriceLine({ amount, color, suffix = true }: { amount: string; color?: string; suffix?: boolean }) {
  return (
    <p className="mt-3 leading-none">
      <span
        className="font-mono text-[clamp(1.75rem,2.5vw,2.125rem)] font-bold tabular-nums text-white"
        style={color ? { color, textShadow: `0 0 20px ${color}44` } : { textShadow: '0 0 14px rgba(248,250,252,0.12)' }}
      >
        ${amount}
      </span>
      {suffix ? (
        <span className="ml-1 text-[13px] font-medium text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
          /mo
        </span>
      ) : null}
    </p>
  );
}

const GHOST_CTA =
  'mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-white/[0.22] py-3 text-center text-[13px] font-semibold text-white transition-[filter,border-color,background-color] duration-200 hover:brightness-110 hover:border-white/35 hover:bg-white/[0.04] disabled:opacity-60';

export default function LandingPricingSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section id="pricing" className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28" style={{ background: BG }}>
      <div className="mx-auto max-w-[1240px]">
        <h2
          className="text-center text-[clamp(1.5rem,6vw,2.65rem)] font-normal leading-[1.08] tracking-[0.02em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Start Free, Upgrade When You&apos;re Ready.
        </h2>

        <div
          ref={ref}
          className={`landing-stagger-up mt-12 grid grid-cols-1 items-end gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {/* Free */}
          <div className={`${GLASS} flex min-h-[360px] flex-col p-5 sm:p-6`}>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Free
            </p>
            <PriceLine amount="0" suffix={false} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              Basic features.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>
                <span className="font-mono tabular-nums">3</span> Leagues
              </CheckItem>
              <CheckItem>Player Verdicts</CheckItem>
              <CheckItem>Waiver Radar</CheckItem>
              <CheckItem>Basic Projections</CheckItem>
            </ul>
            <Link href="/signup?plan=free" className={GHOST_CTA} style={{ fontFamily: 'var(--font-body)' }}>
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
              Standard features.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Free features</CheckItem>
              <CheckItem>Trade Analyzer</CheckItem>
              <CheckItem>Dynasty Age Clock</CheckItem>
              <CheckItem>Breakout Detector</CheckItem>
            </ul>
            <PricingCheckoutButton plan="rookie" className={GHOST_CTA} style={{ fontFamily: 'var(--font-body)' }}>
              Start Free Trial
            </PricingCheckoutButton>
          </div>

          {/* Veteran */}
          <div className={`${GLASS} flex min-h-[360px] flex-col p-5 sm:p-6`}>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              Veteran
            </p>
            <PriceLine amount="15" color={BOOM} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              Advanced features + Trade Hub.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Rookie features</CheckItem>
              <CheckItem>Smart Trade Counter</CheckItem>
              <CheckItem>DMS Score</CheckItem>
              <CheckItem>Advanced Analytics</CheckItem>
            </ul>
            <PricingCheckoutButton
              plan="veteran"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg border py-3 text-center text-[13px] font-semibold transition-[filter,box-shadow,background-color] duration-200 hover:brightness-110 hover:bg-[#3ECFAD]/10 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-body)',
                borderColor: 'rgba(62, 207, 173, 0.55)',
                color: BOOM,
                boxShadow: '0 0 18px rgba(62, 207, 173, 0.18)',
              }}
            >
              Start <span className="font-mono tabular-nums">7</span>-Day Trial
            </PricingCheckoutButton>
          </div>

          {/* All-Pro Terminal — featured */}
          <div
            className="relative z-10 flex min-h-[420px] scale-[1.02] flex-col rounded-xl p-5 pt-8 backdrop-blur-[24px] sm:p-6 sm:pt-9"
            style={{ background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.5)', boxShadow: '0 0 80px rgba(124,58,237,0.20)' }}
          >
            <span
              className="absolute"
              style={{
                fontFamily: 'var(--font-body)',
                background: '#7c3aed',
                color: '#fff',
                top: -12,
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '4px 16px',
                borderRadius: '999px',
                fontSize: 11,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              MOST POPULAR
            </span>
            <p className="text-[15px] font-semibold text-white" style={{ fontFamily: 'var(--font-body)' }}>
              All-Pro Terminal
            </p>
            <PriceLine amount="35" color={PURPLE} />
            <p className="mt-2 text-[13px] text-white/55" style={{ fontFamily: 'var(--font-body)' }}>
              The full arsenal. Maximum edge.
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-2.5">
              <CheckItem>All Veteran features</CheckItem>
              <CheckItem>Dynasty Engine</CheckItem>
              <CheckItem>Portfolio Manager</CheckItem>
              <CheckItem>Priority Support</CheckItem>
            </ul>
            <PricingCheckoutButton
              plan="allpro"
              className="mt-8 flex min-h-[44px] w-full items-center justify-center rounded-lg py-3 text-center text-[13px] font-bold text-[#0a0d14] transition-[filter,box-shadow] duration-200 hover:brightness-110 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-body)',
                background: BOOM,
                boxShadow: '0 0 28px rgba(62, 207, 173, 0.45)',
              }}
            >
              Get All-Pro
            </PricingCheckoutButton>
          </div>
        </div>
      </div>
    </section>
  );
}
