'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const BOOM = '#3ECFAD';
const MUTED = '#64748B';

const GLASS =
  'flex h-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[24px] sm:p-6';

const CARDS = [
  {
    initials: 'AK',
    name: 'Alex K.',
    handle: '@DynastyGrind',
    quote:
      'BOOM or BUST has completely changed how I approach my leagues. The trade counter alone has won me 3 titles.',
    badge: '2023 Champion',
  },
  {
    initials: 'MR',
    name: 'Mike R.',
    handle: '@FFdynastyGoat',
    quote: 'The accuracy of the DMS score is insane. I trust it more than anything else out there.',
    badge: 'Multi-League Winner',
  },
  {
    initials: 'BH',
    name: 'Ben H.',
    handle: '@DynastyBen',
    quote: 'Finally, a platform built for dynasty players that actually understands the game.',
    badge: 'Best Ball Champion',
  },
  {
    initials: 'TW',
    name: 'Tyler W.',
    handle: '@DynastyTyler',
    quote: 'Best $20 I spend every month. The breakout calls are legit — always early.',
    badge: 'Top 1% Finisher',
  },
] as const;

export default function LandingTestimonialsSection() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 sm:py-24 lg:px-10" style={{ background: BG }}>
      <div ref={ref} className={`landing-reveal-up mx-auto max-w-[1240px] ${inView ? 'landing-reveal-up--in' : ''}`}>
        <h2
          className="text-center text-[clamp(1.35rem,5vw,2rem)] font-normal tracking-[0.03em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Loved by Dynasty Managers
        </h2>
        <p className="mx-auto mt-2 max-w-[560px] text-center text-[14px] text-[#64748B] sm:text-[15px]" style={{ fontFamily: 'var(--font-body)' }}>
          Real managers. Real leagues. Real results.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {CARDS.map((c) => (
            <article key={c.handle} className={GLASS}>
              <div className="flex items-start gap-3">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/[0.1] font-mono text-[14px] font-bold text-white/90"
                  style={{ background: 'rgba(62,207,173,0.12)', boxShadow: '0 0 16px rgba(62,207,173,0.2)' }}
                  aria-hidden
                >
                  {c.initials}
                </div>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold text-white" style={{ fontFamily: 'var(--font-body)' }}>
                    {c.name}
                  </p>
                  <p className="text-[14px]" style={{ fontFamily: 'var(--font-body)', color: MUTED }}>
                    {c.handle}
                  </p>
                </div>
              </div>
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-white/90" style={{ fontFamily: 'var(--font-body)' }}>
                &ldquo;{c.quote}&rdquo;
              </p>
              <span
                className="mt-5 inline-flex self-start rounded-full px-3 py-1.5 text-[12px] font-bold uppercase tracking-wide text-[#0a0d14]"
                style={{
                  fontFamily: 'var(--font-body)',
                  background: BOOM,
                  boxShadow: '0 0 14px rgba(62,207,173,0.35)',
                }}
              >
                {c.badge}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
