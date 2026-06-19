'use client';

import Link from 'next/link';
import { LANDING } from './constants';

const TIERS = [
  {
    name: 'Scout',
    price: 0,
    desc: 'Track one league. Learn the system.',
    features: ['1 league synced', 'Weekly buy/sell verdicts', 'Sit/start recommendations', 'Team health score'],
    cta: 'Get Started',
    href: '/onboarding',
    featured: false,
  },
  {
    name: 'Rookie',
    price: 5,
    desc: 'Stop guessing. Start exploiting market mistakes.',
    features: ['All Scout features', 'Trade Analyzer', 'Dynasty value engine', 'Unlimited trade grading'],
    cta: 'Start Free Trial',
    href: '/pricing',
    featured: false,
  },
  {
    name: 'General Manager',
    price: 15,
    desc: 'See your league the way professionals do.',
    features: ['All Rookie features', 'Trade Finder', 'League Intelligence', 'Smart Counter Engine', 'Exposure Tracker'],
    cta: 'Start Free Trial',
    href: '/pricing',
    featured: true,
  },
  {
    name: 'Dynasty',
    price: 35,
    desc: 'Full terminal access across every league.',
    features: ['All GM features', 'Draft Room', 'BOB Record', 'Priority support', 'No ads'],
    cta: 'Start Free Trial',
    href: '/pricing',
    featured: false,
  },
];

export default function LandingPricing({ foundingSpots }: { foundingSpots: number }) {
  return (
    <section id="pricing" className="scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <div className="mx-auto max-w-[1280px]">
        <h2 className="text-center font-figtree text-[clamp(1.4rem,3vw,1.85rem)] text-[#e8ecf4]">
          Start Free. Upgrade When You&apos;re Ready.
        </h2>
        {foundingSpots > 0 && (
          <p className="mt-3 text-center font-figtree text-[13px] text-[#36E7A1]">
            First 100 signups: 50% off 3 months ·{' '}
            <span className="font-mono tabular-nums">{foundingSpots}</span> founding spots remaining
          </p>
        )}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col rounded-lg border p-5"
              style={{
                background: LANDING.surface,
                borderColor: tier.featured ? 'rgba(54,231,161,0.5)' : LANDING.border,
                boxShadow: tier.featured ? '0 0 32px rgba(54,231,161,0.12)' : undefined,
              }}
            >
              {tier.featured && (
                <span
                  className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-0.5 font-mono text-[8px] uppercase tracking-wide text-[#0a0d14]"
                  style={{ background: LANDING.boom }}
                >
                  Most Popular
                </span>
              )}
              <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]/50">{tier.name}</div>
              <div className="mt-2 font-mono text-[32px] tabular-nums text-[#e8ecf4]">
                ${tier.price}
                <span className="text-[12px] text-[#e8ecf4]/45">/mo</span>
              </div>
              <p className="mt-2 font-figtree text-[12px] leading-snug text-[#e8ecf4]/55">{tier.desc}</p>
              <ul className="mt-4 flex-1 space-y-1.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2 font-figtree text-[11px] text-[#e8ecf4]/75">
                    <span style={{ color: LANDING.boom }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.href}
                className="mt-5 block rounded-md py-2.5 text-center font-figtree text-[13px] transition hover:brightness-110"
                style={
                  tier.featured
                    ? { background: LANDING.boom, color: '#0a0d14' }
                    : { border: `1px solid ${LANDING.border}`, color: '#e8ecf4' }
                }
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
