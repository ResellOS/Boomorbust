'use client';

import { useInViewOnce } from '@/hooks/useInViewOnce';

const BG = '#0a0d14';

function SleeperGlyph() {
  return (
    <svg width={20} height={20} viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0 text-white/80">
      <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth={1.5} />
      <circle cx="12.5" cy="15" r="1.8" fill="currentColor" />
      <circle cx="19.5" cy="15" r="1.8" fill="currentColor" />
      <path d="M13 19c1 1.2 2.2 1.8 3.5 1.8S19 20.2 20 19" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
      <path d="M16 4v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      <circle cx="16" cy="3" r="1.2" fill="currentColor" />
    </svg>
  );
}

const PARTNERS: { label: string; sub?: string; icon?: 'sleeper' }[] = [
  { label: 'Sleeper', sub: 'sleeper', icon: 'sleeper' },
  { label: 'FantasyPros' },
  { label: 'Dynasty Nerds' },
  { label: 'FootballGuys' },
];

function LogoTile({ label, sub, icon }: { label: string; sub?: string; icon?: 'sleeper' }) {
  return (
    <div
      className="flex min-h-[52px] min-w-[140px] flex-1 items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:min-w-[160px]"
      style={{ boxShadow: '0 0 18px rgba(248,250,252,0.04)' }}
    >
      {icon === 'sleeper' ? <SleeperGlyph /> : null}
      <span
        className="text-center text-[12px] font-semibold uppercase tracking-[0.12em] text-white/55 sm:text-[13px]"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {icon === 'sleeper' ? (
          <span className="lowercase tracking-tight text-white/75">{sub ?? label}</span>
        ) : (
          label
        )}
      </span>
    </div>
  );
}

export default function LandingTrustedByBar() {
  const [ref, inView] = useInViewOnce<HTMLDivElement>();

  return (
    <section className="border-y border-white/[0.06] px-4 py-20 sm:px-6 sm:py-24 lg:px-10" style={{ background: BG }}>
      <div ref={ref} className={`landing-reveal-up mx-auto max-w-[1240px] ${inView ? 'landing-reveal-up--in' : ''}`}>
        <h2
          className="text-center text-[clamp(1.35rem,5vw,2rem)] font-normal tracking-[0.03em] text-white"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Loved by Players
        </h2>
        <p className="mx-auto mt-2 max-w-[520px] text-center text-[13px] text-[#64748B] sm:text-[14px]" style={{ fontFamily: 'var(--font-body)' }}>
          Built for managers who run multiple dynasty leagues on Sleeper and want one command surface.
        </p>

        <div className="mt-10 flex flex-wrap items-stretch justify-center gap-3 sm:gap-4">
          {PARTNERS.map((p) => (
            <LogoTile key={p.label} label={p.label} sub={p.sub} icon={p.icon} />
          ))}
        </div>
      </div>
    </section>
  );
}
