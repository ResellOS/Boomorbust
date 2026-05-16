'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';

function SleeperWordmark() {
  return (
    <div className="flex items-center justify-center gap-2 text-white">
      <svg width={24} height={24} viewBox="0 0 32 32" fill="none" aria-hidden className="h-6 w-6 shrink-0 sm:h-7 sm:w-7">
        <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12.5" cy="15" r="1.8" fill="currentColor" />
        <circle cx="19.5" cy="15" r="1.8" fill="currentColor" />
        <path d="M13 19c1 1.2 2.2 1.8 3.5 1.8S19 20.2 20 19" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
        <path d="M16 4v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx="16" cy="3" r="1.2" fill="currentColor" />
      </svg>
      <span
        className="text-[18px] font-semibold lowercase tracking-tight text-white sm:text-[22px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        sleeper
      </span>
    </div>
  );
}

const STATS: { value: string; label: string }[] = [
  { value: '84%', label: 'DMS Accuracy' },
  { value: '80%', label: 'Breakout Detection Rate' },
  { value: '42-18-2', label: 'Verified Record' },
  { value: '5.3 Weeks', label: 'Average Market Lead Time' },
];

export default function LandingStatsBar() {
  const [ref, inView] = useInViewOnce<HTMLElement>();

  return (
    <section
      ref={ref}
      className={`landing-reveal-up border-y border-white/[0.06] py-20 sm:py-24 ${inView ? 'landing-reveal-up--in' : ''}`}
      style={{ background: BG }}
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-[1400px] px-3 sm:px-6 lg:px-10">
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-[24px] [-webkit-overflow-scrolling:touch]">
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '16px 24px' }}>
          <div className="flex min-w-[min(100%,720px)] flex-col divide-y divide-white/[0.06] lg:min-w-0 lg:flex-row lg:divide-x lg:divide-y-0">
            <div className="flex shrink-0 flex-col items-center justify-center px-5 py-7 text-center lg:w-[220px] lg:py-8">
              <p className="text-xs text-white/50" style={{ fontFamily: 'var(--font-body)' }}>
                Built for
              </p>
              <div className="mt-3">
                <SleeperWordmark />
              </div>
            </div>
            {STATS.map((col) => (
              <div
                key={col.label}
                className="flex min-w-[140px] flex-1 flex-col items-center justify-center px-4 py-7 text-center sm:min-w-[160px] sm:px-5 sm:py-8"
              >
                <div className="font-['JetBrains_Mono'] text-[#3ECFAD] text-[clamp(1.35rem,6vw,2.35rem)] font-bold leading-none tracking-tight tabular-nums sm:text-[clamp(1.75rem,3.5vw,2.35rem)]">
                  {col.value}
                </div>
                <div className="mt-2 max-w-[220px] text-xs leading-snug text-white/50 sm:mt-3" style={{ fontFamily: 'var(--font-body)' }}>
                  {col.label}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
