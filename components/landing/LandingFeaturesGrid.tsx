'use client';

import Link from 'next/link';
import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';
const BOOM = '#36E7A1';
const CYAN = '#22D3EE';
const AMBER = '#FBBF24';
const PURPLE = '#A78BFA';

const GLASS =
  'group flex h-full flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 backdrop-blur-[24px] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 sm:p-6';

interface SvgCard {
  title: string;
  desc: string;
  href: string;
  cta: string;
  color: string;
  Icon: (props: { color: string }) => JSX.Element;
}

interface TextCard {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  link: string;
}

const CARDS: (SvgCard | TextCard)[] = [
  {
    title: 'Impact Dashboard',
    desc: 'Empire view across every league — health, exposure, and win probability in one scan.',
    href: '/dashboard/dashboard',
    cta: 'View Dashboard',
    color: BOOM,
    Icon: IconClock,
  },
  {
    title: 'Start/Sit Optimizer',
    desc: 'TFO-weighted decisions with matchup, weather, and injury context baked in.',
    href: '/dashboard/lineup',
    cta: 'View Optimizer',
    color: CYAN,
    Icon: IconGraph,
  },
  {
    title: 'Trade Analyzer',
    desc: 'Plain-English verdicts on value delta, window alignment, and roster fit.',
    href: '/dashboard/trade-hub',
    cta: 'View Trades',
    color: PURPLE,
    Icon: IconSwap,
  },
  {
    title: 'Waiver Wire Targets',
    desc: 'BBSM-ranked adds tuned to your roster holes and league scoring.',
    href: '/dashboard/waiver-wire',
    cta: 'View Waivers',
    color: AMBER,
    Icon: IconBolt,
  },
  {
    title: 'Dynasty Strategy',
    desc: 'Dynasty Coach on demand — contention windows, aging curves, and leverage.',
    href: '/dashboard/coach',
    cta: 'View Coach',
    color: BOOM,
    Icon: IconShield,
  },
  {
    title: 'Rookie Intelligence',
    desc: 'Landing spot, capital, and transition signals for your rookie drafts.',
    href: '/dashboard/rookies',
    cta: 'View Rookies',
    color: CYAN,
    Icon: IconBook,
  },
  {
    icon: '≡', iconColor: '#36E7A1', iconBg: 'rgba(54,231,161,0.12)',
    title: 'Smart Rankings',
    body: 'Expert rankings based on form, matchups, and injury news.',
    link: 'View rankings →',
  },
  {
    icon: '📊', iconColor: '#22D3EE', iconBg: 'rgba(34,211,238,0.12)',
    title: 'Advanced Analytics',
    body: 'Visual trends, player ranges, and matchup heatmaps.',
    link: 'Explore data →',
  },
  {
    icon: '🏥', iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.12)',
    title: 'Injury Tracker',
    body: 'Real-time injury updates that impact your lineup.',
    link: 'Check injuries →',
  },
];

function glow(color: string) {
  return { boxShadow: `0 0 22px ${color}33` };
}

function IconClock({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={1.5} />
      <path d="M12 7v6l4 2" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconGraph({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <path d="M4 19h16M7 15l3-4 3 2 5-6" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 19V5" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
    </svg>
  );
}

function IconSwap({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <path d="M7 16V9m0 0L4 12m3-3l3 3M17 8v7m0 0l3-3m-3 3l-3-3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBolt({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" stroke="currentColor" strokeWidth={1.45} strokeLinejoin="round" />
    </svg>
  );
}

function IconShield({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <path d="M12 3l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconBook({ color }: { color: string }) {
  return (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" aria-hidden style={{ color, ...glow(color) }}>
      <path d="M6 4h5a3 3 0 013 3v13a2 2 0 00-2-2H6V4zM18 4h-5a3 3 0 00-3 3v13a2 2 0 012-2h6V4z" stroke="currentColor" strokeWidth={1.45} strokeLinejoin="round" />
    </svg>
  );
}

export default function LandingFeaturesGrid() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section id="features" className="scroll-mt-24 border-y border-white/[0.06] px-4 py-20 sm:px-6 sm:py-24 lg:px-10 lg:py-28" style={{ background: BG }}>
      <div ref={ref} className="mx-auto max-w-[1240px]">
        <h2
          className="text-center text-[clamp(1.5rem,6vw,2.75rem)] font-normal leading-tight tracking-[0.02em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Everything You Need to Win—In One Place
        </h2>

        <div
          className={`landing-stagger-up mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 ${inView ? 'landing-stagger-up--in' : ''}`}
        >
          {CARDS.map((c) => (
            <article key={c.title} className={GLASS}>
              <div className="mb-4 flex items-start justify-between gap-3">
                {'Icon' in c ? (
                  <c.Icon color={c.color} />
                ) : (
                  <span style={{ fontSize: 22, width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: c.iconBg, color: c.iconColor }}>
                    {c.icon}
                  </span>
                )}
              </div>
              <h3 className="text-[18px] font-semibold tracking-[0.02em] text-white sm:text-[19px]" style={{ fontFamily: 'var(--font-display)' }}>
                {c.title}
              </h3>
              <p className="mt-2 flex-1 text-[14px] leading-relaxed text-[#94A3B8]" style={{ fontFamily: 'var(--font-body)' }}>
                {'desc' in c ? c.desc : c.body}
              </p>
              {'href' in c ? (
                <Link
                  href={c.href}
                  className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#22D3EE] transition-[filter] duration-200 hover:brightness-110"
                  style={{ fontFamily: 'var(--font-body)', textShadow: '0 0 14px rgba(34,211,238,0.25)' }}
                >
                  {c.cta} <span aria-hidden>→</span>
                </Link>
              ) : (
                <span
                  className="mt-5 inline-flex items-center text-[13px] font-semibold"
                  style={{ fontFamily: 'var(--font-body)', color: c.iconColor }}
                >
                  {c.link}
                </span>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
