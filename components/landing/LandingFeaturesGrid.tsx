'use client';

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const GREEN = '#36E7A1';
const PURPLE = '#A78BFA';
const DESC = '#94A3B8';
const SUB = '#64748B';

const GLASS =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[24px] sm:p-6 transition-[transform,border-color] duration-200 ease-out hover:scale-[1.01] hover:border-white/[0.15]';

type Accent = 'green' | 'purple';

function iconGlow(accent: Accent): CSSProperties {
  return {
    color: accent === 'green' ? GREEN : PURPLE,
    filter:
      accent === 'green'
        ? 'drop-shadow(0 0 10px rgba(54,231,161,0.55)) drop-shadow(0 0 18px rgba(54,231,161,0.22))'
        : 'drop-shadow(0 0 10px rgba(167,139,250,0.55)) drop-shadow(0 0 18px rgba(167,139,250,0.22))',
  };
}

function IconBrain({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <path
        d="M12 5a3 3 0 00-3 3v1M9 18a3 3 0 003 3M15 5a3 3 0 013 3v1M15 18a3 3 0 01-3 3M12 8v8"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <path d="M7 12h10" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M12 3v2M12 19v2" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function IconArrows({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <path d="M5 9h11l-3-3M19 15H8l3 3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 9v4l3 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v2" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function IconDashboard({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <rect x="3" y="4" width="18" height="14" rx="2" stroke="currentColor" strokeWidth={1.5} />
      <path d="M3 10h18M8 4v14" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
      <path d="M6 19h12" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconChartUp({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <path d="M4 18V6M4 18h16" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M7 14l4-4 3 2 5-7" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 5v4h4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTarget({ accent }: { accent: Accent }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={iconGlow(accent)}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth={1.35} />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function Num({ children }: { children: ReactNode }) {
  return <span className="font-mono tabular-nums">{children}</span>;
}

function NumberBadge({ n, accent }: { n: string; accent: Accent }) {
  const bg = accent === 'green' ? GREEN : PURPLE;
  return (
    <span
      className="flex h-7 min-w-[1.75rem] shrink-0 items-center justify-center rounded-full px-1.5 text-[12px] font-bold text-white font-mono"
      style={{ background: bg, boxShadow: `0 0 14px ${accent === 'green' ? 'rgba(54,231,161,0.45)' : 'rgba(167,139,250,0.45)'}` }}
    >
      {n}
    </span>
  );
}

const CARDS: {
  n: string;
  accent: Accent;
  Icon: (p: { accent: Accent }) => ReactElement;
  title: string;
  body: ReactNode;
}[] = [
  {
    n: '1',
    accent: 'purple',
    Icon: IconBrain,
    title: 'The Verdict Engine',
    body: (
      <>
        Every player gets a BOOM or BUST verdict — powered by <Num>43</Num> data points, <Num>7</Num> proprietary formulas,
        and real-time market intelligence. Not a ranking. A decision.
      </>
    ),
  },
  {
    n: '2',
    accent: 'green',
    Icon: IconArrows,
    title: 'Smart Trade Counter',
    body: (
      <>
        Every incoming offer instantly generates <Num>3</Num> AI responses — Counter to Win, Counter to Accept, Accept
        As-Is. Personalized to your opponent&apos;s trading behavior without them knowing.
      </>
    ),
  },
  {
    n: '3',
    accent: 'purple',
    Icon: IconClock,
    title: 'Dynasty Age Clock',
    body: 'Know exactly when to sell every player before their value drops. Position-specific aging curves tell you the optimal sell window weeks before the market figures it out.',
  },
  {
    n: '4',
    accent: 'green',
    Icon: IconDashboard,
    title: 'Multi-League Command Center',
    body: (
      <>
        Manage all <Num>15</Num> leagues from one dashboard. Every signal, verdict, and recommendation filtered to that
        league&apos;s scoring, roster, and context automatically.
      </>
    ),
  },
  {
    n: '5',
    accent: 'green',
    Icon: IconChartUp,
    title: 'Breakout Detector',
    body: (
      <>
        Identifies players <Num>5+</Num> weeks before their KTC value spikes. Our BPS formula catches breakouts like Puka
        Nacua, Malik Nabers, and Trey McBride before the market reacts.
      </>
    ),
  },
  {
    n: '6',
    accent: 'purple',
    Icon: IconTarget,
    title: 'Dynasty Momentum Score',
    body: (
      <>
        One number from <Num>-100</Num> to <Num>+100</Num> tells you exactly what to do with every player on your roster
        right now. The highest confidence signal we have at <Num>84%</Num> accuracy.
      </>
    ),
  },
];

export default function LandingFeaturesGrid() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section id="features" className="scroll-mt-24 px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24" style={{ background: BG }}>
      <div className="mx-auto max-w-[1200px]">
        <h2
          className="text-center text-[clamp(1.65rem,7vw,3.25rem)] font-normal leading-[1.05] tracking-[0.02em] text-white sm:text-[clamp(2rem,4.5vw,3.25rem)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          The Ultimate Edge for Dynasty Players
        </h2>
        <p
          className="mx-auto mt-3 max-w-[520px] text-center text-[14px] leading-relaxed sm:mt-4 sm:text-[15px] md:text-base"
          style={{ fontFamily: 'var(--font-body)', color: SUB }}
        >
          AI-powered tools. Proprietary data. Real results.
        </p>

        <div
          ref={ref}
          className={`landing-stagger-up mt-10 grid grid-cols-1 gap-5 md:mt-14 md:grid-cols-2 md:gap-6 lg:grid-cols-3 lg:gap-8 ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {CARDS.map(({ n, accent, Icon, title, body }) => (
            <article key={n} className={GLASS}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 pt-0.5">
                  <Icon accent={accent} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <NumberBadge n={n} accent={accent} />
                    <h3
                      className="min-w-0 text-[16px] font-bold leading-snug text-white sm:text-[17px]"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {title}
                    </h3>
                  </div>
                  <p
                    className="mt-3 text-[13px] leading-relaxed sm:text-[14px]"
                    style={{ fontFamily: 'var(--font-body)', color: DESC }}
                  >
                    {body}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
