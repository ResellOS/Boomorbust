'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const GLASS =
  'flex flex-col items-center rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-6 text-center backdrop-blur-[24px] sm:py-7';

const CARDS = [
  { label: 'Player Usage Trends', color: '#3ECFAD', d: 'M4 18V6M4 18h16M8 14l3-4 3 2 5-6' },
  { label: 'Matchup Analysis', color: '#22D3EE', d: 'M12 3l8 4v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z' },
  { label: 'Market Value Shifts', color: '#FBBF24', d: 'M3 17l6-6 4 4 8-8M14 7h7v7' },
  { label: 'Vegas Impact', color: '#8B5CF6', d: 'M4 20h16M7 20v-8l5-3 5 3v8M12 6V4m0 2l2-2m-2 2L10 4' },
  { label: 'Team & League Settings', color: '#3ECFAD', d: 'M4 6h16M4 12h10M4 18h16' },
] as const;

export default function LandingBuiltOnRealAnalysis() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28" style={{ background: BG }}>
      <div ref={ref} className="mx-auto max-w-[1200px]">
        <h2
          className="text-center text-[clamp(1.5rem,6vw,2.75rem)] font-normal leading-tight tracking-[0.02em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Built on Real Analysis—Not Just Projections
        </h2>
        <p
          className="mx-auto mt-3 max-w-[560px] text-center text-[15px] text-[#64748B] sm:text-[16px]"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Every signal is grounded in usage, markets, health, and your league rules — not a single model output in a vacuum.
        </p>

        <div
          className={`landing-stagger-up mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {CARDS.map((c) => (
            <div key={c.label} className={GLASS}>
              <svg
                width={32}
                height={32}
                viewBox="0 0 24 24"
                fill="none"
                className="mb-4"
                aria-hidden
                style={{ color: c.color, filter: `drop-shadow(0 0 10px ${c.color}66)` }}
              >
                <path d={c.d} stroke="currentColor" strokeWidth={1.45} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-[14px] font-semibold leading-snug text-white sm:text-[15px]" style={{ fontFamily: 'var(--font-body)' }}>
                {c.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
