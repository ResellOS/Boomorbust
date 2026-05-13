'use client';

import type { ReactNode } from 'react';
import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const MUTED = '#64748B';
const GOLD = '#FBBF24';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[24px]';

function SleeperInline() {
  return (
    <span className="inline-flex items-center gap-1.5 text-white">
      <svg width={22} height={22} viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0 opacity-95">
        <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12.5" cy="15" r="1.8" fill="currentColor" />
        <circle cx="19.5" cy="15" r="1.8" fill="currentColor" />
        <path d="M13 19c1 1.2 2.2 1.8 3.5 1.8S19 20.2 20 19" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
        <path d="M16 4v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx="16" cy="3" r="1.2" fill="currentColor" />
      </svg>
      <span className="text-[17px] font-semibold lowercase tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>
        sleeper
      </span>
    </span>
  );
}

function IconTrophy() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8H5a2 2 0 000 4h2M17 8h2a2 2 0 010 4h-2" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" />
    </svg>
  );
}

function IconMedal() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="9" r="5" stroke="currentColor" strokeWidth={1.4} />
      <path d="M8 14l-2 8M16 14l2 8M10 22h4" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTarget() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth={1.4} />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={1.35} />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function BadgePill({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span
      className="inline-flex w-max max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
      style={{
        fontFamily: 'var(--font-body)',
        borderColor: 'rgba(54, 231, 161, 0.55)',
        color: BOOM,
        boxShadow: '0 0 14px rgba(54, 231, 161, 0.2)',
      }}
    >
      <span className="text-[#36E7A1]" style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.45))' }}>
        {icon}
      </span>
      {children}
    </span>
  );
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{
        fontFamily: 'var(--font-body)',
        background: 'linear-gradient(135deg, #7c3aed 0%, #36E7A1 100%)',
        boxShadow: '0 0 16px rgba(124, 58, 237, 0.25), 0 0 12px rgba(54, 231, 161, 0.2)',
      }}
    >
      {initials}
    </div>
  );
}

type Testimonial = {
  initials: string;
  name: string;
  handle: string;
  quote: ReactNode;
  badge: { text: ReactNode; icon: ReactNode };
};

const TESTIMONIALS: Testimonial[] = [
  {
    initials: 'AK',
    name: 'Alex K.',
    handle: '@DynastyGrind',
    quote: (
      <>
        BOOM or BUST has completely changed how I approach my leagues. The trade counter alone has won me{' '}
        <span className="font-mono tabular-nums">3</span> titles.
      </>
    ),
    badge: {
      text: (
        <>
          <span className="font-mono tabular-nums">2023</span> Champion
        </>
      ),
      icon: <IconTrophy />,
    },
  },
  {
    initials: 'MR',
    name: 'Mike R.',
    handle: '@FFdynastyGoat',
    quote: 'The accuracy of the DMS score is insane. I trust it more than anything else out there.',
    badge: { text: 'Multi-League Winner', icon: <IconMedal /> },
  },
  {
    initials: 'BH',
    name: 'Ben H.',
    handle: '@DynastyBen',
    quote: 'Finally, a platform built for dynasty players that actually understands the game.',
    badge: { text: 'Best Ball Champion', icon: <IconMedal /> },
  },
  {
    initials: 'TW',
    name: 'Tyler W.',
    handle: '@DynastyTyler',
    quote: (
      <>
        Best <span className="font-mono tabular-nums">$20</span> I spend every month. The breakout calls are legit — always
        early.
      </>
    ),
    badge: {
      text: (
        <>
          Top <span className="font-mono tabular-nums">1%</span> Finisher
        </>
      ),
      icon: <IconTarget />,
    },
  },
];

export default function LandingTestimonialsSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-10 lg:py-24 xl:py-28" style={{ background: BG }}>
      <div className="mx-auto grid max-w-[1240px] gap-8 sm:gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start lg:gap-12 xl:gap-16">
        <div className="max-w-md">
          <h2
            className="text-[clamp(1.25rem,6vw,2.125rem)] font-bold leading-tight tracking-tight text-white sm:text-[clamp(1.5rem,2.8vw,2.125rem)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Trusted by the Best Dynasty Players
          </h2>

          <div className="mt-8">
            <div className="flex flex-wrap items-end gap-3">
              <span className="text-[clamp(1.85rem,8vw,3rem)] font-bold leading-none text-white font-mono tabular-nums sm:text-[clamp(2.25rem,4vw,3rem)]">
                4.9
              </span>
              <div className="flex flex-col gap-1 pb-0.5">
                <span
                  className="text-[18px] leading-none tracking-tight"
                  style={{ color: GOLD, textShadow: '0 0 12px rgba(251, 191, 36, 0.35)' }}
                >
                  ★★★★★
                </span>
                <span className="text-[12px] font-medium" style={{ fontFamily: 'var(--font-body)', color: MUTED }}>
                  <span className="font-mono tabular-nums">500+</span> reviews
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2 text-[14px]" style={{ fontFamily: 'var(--font-body)', color: MUTED }}>
            <span>on</span>
            <SleeperInline />
          </div>
        </div>

        <div
          ref={ref}
          className={`landing-stagger-fade grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 ${inView ? 'landing-stagger-fade--in' : ''}`}
        >
          {TESTIMONIALS.map((t) => (
            <article key={t.handle} className={`${GLASS} flex h-full min-h-0 flex-col`}>
              <div className="flex gap-3">
                <Avatar initials={t.initials} />
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                    {t.name}
                  </p>
                  <p className="text-[12px] font-medium" style={{ fontFamily: 'var(--font-body)', color: MUTED }}>
                    {t.handle}
                  </p>
                </div>
              </div>
              <p
                className="mt-4 flex-1 text-[13px] leading-relaxed text-white/90"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t.quote}
              </p>
              <div className="mt-5">
                <BadgePill icon={t.badge.icon}>{t.badge.text}</BadgePill>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
