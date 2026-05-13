import type { ReactNode } from 'react';

const BG = '#0a0d14';

const LOGO_HOVER =
  'text-[#64748B] opacity-60 transition-[color,opacity] duration-200 hover:text-white hover:opacity-100';

function SleeperMarkTrusted() {
  return (
    <span className={`inline-flex items-center gap-2 ${LOGO_HOVER}`}>
      <svg width={26} height={26} viewBox="0 0 32 32" fill="none" aria-hidden className="shrink-0">
        <rect x="6" y="8" width="20" height="18" rx="4" stroke="currentColor" strokeWidth={1.5} />
        <circle cx="12.5" cy="15" r="1.8" fill="currentColor" />
        <circle cx="19.5" cy="15" r="1.8" fill="currentColor" />
        <path d="M13 19c1 1.2 2.2 1.8 3.5 1.8S19 20.2 20 19" stroke="currentColor" strokeWidth={1.35} strokeLinecap="round" />
        <path d="M16 4v4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
        <circle cx="16" cy="3" r="1.2" fill="currentColor" />
      </svg>
      <span className="text-[18px] font-semibold lowercase tracking-tight" style={{ fontFamily: 'var(--font-body)' }}>
        sleeper
      </span>
    </span>
  );
}

function FeaturedLogo({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[44px] min-w-[44px] items-center justify-center px-2 py-2 sm:min-h-0 sm:min-w-0 sm:px-0 ${LOGO_HOVER}`}
      aria-label={label}
    >
      {children}
    </a>
  );
}

export default function LandingTrustedByBar() {
  return (
    <div className="border-t border-white/[0.06] py-6 sm:py-8" style={{ background: BG }}>
      <div
        className="mx-auto flex max-w-[1240px] flex-col items-stretch gap-4 px-4 text-center sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-x-6 sm:gap-y-3 sm:px-6 sm:text-left lg:justify-between lg:px-10"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B] sm:text-[12px] sm:tracking-[0.2em]">
          LOVED BY PLAYERS ON
        </span>
        <span className="flex min-h-[44px] items-center justify-center sm:min-h-0 sm:justify-start">
          <SleeperMarkTrusted />
        </span>
        <span className="hidden h-5 w-px shrink-0 bg-white/[0.12] sm:block" aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748B] sm:text-[12px] sm:tracking-[0.2em]">
          AS FEATURED IN
        </span>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start sm:gap-x-6">
        <FeaturedLogo href="https://www.fantasypros.com" label="FantasyPros">
          <span className="text-[13px] font-bold tracking-tight sm:text-[14px]">FantasyPros</span>
        </FeaturedLogo>
        <FeaturedLogo href="https://www.dynastynerds.com" label="Dynasty Nerds">
          <span className="text-[13px] font-bold tracking-tight sm:text-[14px]">Dynasty Nerds</span>
        </FeaturedLogo>
        <FeaturedLogo href="https://www.footballguys.com" label="FootballGuys">
          <span className="text-[13px] font-bold tracking-tight sm:text-[14px]">FootballGuys</span>
        </FeaturedLogo>
        </div>
      </div>
    </div>
  );
}
