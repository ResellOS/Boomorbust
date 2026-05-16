'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const FEATURES = [
  'Multi-league portfolio view',
  'Performance data & analytics',
  'Trade analyzer with verdicts',
  'Start/sit optimizer',
  'Portfolio exposure tracking',
  'Transparent pricing — $0–$35/mo',
];

export default function LandingComparisonTable() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28" style={{ background: BG }}>
      <div
        ref={ref}
        className={`landing-reveal-up mx-auto grid max-w-[1240px] gap-10 lg:grid-cols-2 lg:items-center lg:gap-14 ${inView ? 'landing-reveal-up--in' : ''}`}
      >
        <div>
          <h2
            className="text-[clamp(1.5rem,6vw,2.5rem)] font-normal leading-[1.08] tracking-[0.02em] text-white"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Most Tools Give Rankings.
            <br />
            We Give Decisions.
          </h2>
          <p className="mt-4 max-w-[480px] text-[15px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            Rankings without context are trivia. Boom or Bust turns your leagues, markets, and matchups into a single actionable portfolio layer.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[24px] sm:p-8">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
            What you get
          </p>
          <ul className="flex flex-col gap-3">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-[14px] text-white/90" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="shrink-0 font-bold" style={{ color: BOOM, filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.45))' }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6 border-t border-white/[0.06] pt-5">
            <p className="font-mono text-[clamp(1.5rem,4vw,2rem)] font-bold tabular-nums" style={{ color: BOOM, textShadow: '0 0 20px rgba(54,231,161,0.3)' }}>
              $0–$35<span className="text-[16px] font-normal text-white/50">/mo</span>
            </p>
            <p className="mt-1 text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              One terminal. Every league.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
