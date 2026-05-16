'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-[24px] sm:p-8';

const HEADING_STYLE = {
  fontFamily: 'var(--font-display)',
  fontSize: 'clamp(26px, 7vw, 56px)',
  letterSpacing: '0.03em',
} as const;

function IconCloud({ color }: { color: string }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, filter: `drop-shadow(0 0 10px ${color}55)` }}>
      <path
        d="M7 18a4 4 0 01-0.2-8 3.5 3.5 0 017.8-1.1A4 4 0 0117 18H7z"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <path d="M12 11v3M12 8v1" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function IconAnalyze({ color }: { color: string }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, filter: `drop-shadow(0 0 10px ${color}55)` }}>
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth={1.5} />
      <path d="M16 16l5 5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M8 8l2 2M14 10l-2 2" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function IconTarget({ color }: { color: string }) {
  return (
    <svg width={40} height={40} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, filter: `drop-shadow(0 0 10px ${color}55)` }}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth={1.35} />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

const STEPS = [
  {
    title: 'Import Your Leagues',
    body: 'Connect your Sleeper account in one click — no API keys or spreadsheets.',
    color: '#22D3EE',
    Icon: IconCloud,
  },
  {
    title: 'We Analyze Everything',
    body: 'Rosters, trades, values, injuries, and schedules — normalized across every league you run.',
    color: '#3ECFAD',
    Icon: IconAnalyze,
  },
  {
    title: 'Get Actionable Insights',
    body: 'Sit/start, trades, waivers, and portfolio risk — surfaced as clear decisions, not noise.',
    color: '#8B5CF6',
    Icon: IconTarget,
  },
] as const;

export default function LandingHowItWorksSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section
      id="how-it-works"
      className="scroll-mt-24 px-4 py-20 sm:px-6 sm:py-24 lg:px-12 lg:py-28"
      style={{ background: BG }}
    >
      <div ref={ref} className="mx-auto max-w-[1200px]">
        <h2 className="text-center text-white leading-[1.05]" style={HEADING_STYLE}>
          From Sync to Dominance in <span className="font-mono tabular-nums">30</span> Seconds
        </h2>

        <div
          className={`landing-stagger-up mt-12 hidden items-stretch gap-0 lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {STEPS.map((s, i) => (
            <div key={s.title} className="contents">
              <article className={GLASS}>
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                  <s.Icon color={s.color} />
                </div>
                <h3 className="text-[20px] tracking-[0.03em] text-white sm:text-[22px]" style={{ fontFamily: 'var(--font-display)' }}>
                  {s.title}
                </h3>
                <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
                  {s.body}
                </p>
              </article>
              {i < STEPS.length - 1 ? (
                <div className="flex items-center justify-center px-2 text-2xl text-[#475569]" aria-hidden>
                  →
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className={`landing-stagger-up mt-12 flex flex-col gap-6 lg:hidden ${inView ? 'landing-stagger-up--in' : ''}`}>
          {STEPS.map((s) => (
            <article key={s.title} className={GLASS}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02]">
                <s.Icon color={s.color} />
              </div>
              <h3 className="text-[19px] tracking-[0.03em] text-white" style={{ fontFamily: 'var(--font-display)' }}>
                {s.title}
              </h3>
              <p className="mt-3 text-[14px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
                {s.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
