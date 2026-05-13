import Link from 'next/link';
import { TWITTER_PROFILE_HREF } from '@/lib/twitter-public';

const BG = '#0a0d14';
const MUTED = '#64748B';
const BOOM = '#36E7A1';
const BUST = '#7c3aed';

function BobFooterMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 44" width={36} height={40} aria-hidden>
      <defs>
        <clipPath id="footerBobL">
          <rect x="0" y="0" width="20" height="44" />
        </clipPath>
        <clipPath id="footerBobR">
          <rect x="20" y="0" width="20" height="44" />
        </clipPath>
      </defs>
      <text
        x="2"
        y="34"
        fontSize="34"
        fontWeight={700}
        fontFamily="var(--font-display), Bebas Neue, sans-serif"
        fill={BOOM}
        clipPath="url(#footerBobL)"
      >
        B
      </text>
      <text
        x="2"
        y="34"
        fontSize="34"
        fontWeight={700}
        fontFamily="var(--font-display), Bebas Neue, sans-serif"
        fill={BUST}
        clipPath="url(#footerBobR)"
      >
        B
      </text>
      <path
        fill="#f8fafc"
        d="M20.5 13.5l-3 5.5h2.3l-1.1 6.5 5-7h-2l1.4-4.5z"
        style={{ filter: 'drop-shadow(0 0 5px rgba(54,231,161,0.45))' }}
      />
    </svg>
  );
}

const FOOTER_COLS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: 'Product',
    links: [
      { label: 'Dashboard', href: '/dashboard' },
      { label: 'Trade Hub', href: '/dashboard/trade' },
      { label: 'Lineup Optimizer', href: '/dashboard/lineup' },
      { label: 'Scouting Terminal', href: '/dashboard/scouting' },
      { label: 'Waiver Wire', href: '/dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/#features' },
      { label: 'Blog', href: '/#features' },
      { label: 'Careers', href: '/#features' },
      { label: 'Press', href: '/#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/resources#documentation' },
      { label: 'API', href: '/resources' },
      { label: 'Community', href: '/resources' },
      { label: 'Status', href: '/resources' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
];

function IconX() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 4l16 16M20 4L4 20" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg width={22} height={18} viewBox="0 0 71 55" fill="currentColor" aria-hidden>
      <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.440769 45.4204 0.525289L42.4034 6.30193C36.8854 5.16731 31.2702 5.16731 25.7522 6.30193L22.7352 0.525289C22.6886 0.443589 22.5963 0.40133 22.5039 0.41542C17.4301 1.2916 12.5774 2.8214 8.05219 4.8978C8.00189 4.92351 7.9625 4.96515 7.94186 5.01565L0.193176 21.8447C0.170422 21.8964 0.178082 21.9557 0.214332 21.9999C3.31901 26.0513 6.87431 29.6705 10.7518 32.8269C10.7725 32.8448 10.7996 32.8515 10.8268 32.8472L17.0724 31.8549C17.5864 31.7724 18.137 31.8479 18.6039 32.0704C19.8419 32.6509 21.1481 33.1125 22.4982 33.4466C22.5891 33.4698 22.6835 33.4316 22.7334 33.3515L25.5471 28.9099C30.4556 30.1996 35.5444 30.1996 40.4529 28.9099L43.2666 33.3515C43.3165 33.4316 43.4109 33.4698 43.5018 33.4466C44.8519 33.1125 46.1581 32.6509 47.3961 32.0704C47.863 31.8479 48.4136 31.7724 48.9276 31.8549L55.1732 32.8472C55.2004 32.8515 55.2275 32.8448 55.2482 32.8269C59.1257 29.6705 62.681 26.0513 65.7857 21.9999C65.8219 21.9557 65.8296 21.8964 65.8068 21.8447L58.0581 5.01565C58.0375 4.96515 57.9981 4.92351 57.9478 4.8978ZM23.7255 22.2565C21.5055 22.2565 19.6643 20.3009 19.6643 17.9018C19.6643 15.5027 21.4717 13.5471 23.7255 13.5471C25.9793 13.5471 27.7867 15.5027 27.7867 17.9018C27.7867 20.3009 25.9355 22.2565 23.7255 22.2565ZM47.3178 22.2565C45.0978 22.2565 43.2566 20.3009 43.2566 17.9018C43.2566 15.5027 45.064 13.5471 47.3178 13.5471C49.5716 13.5471 51.379 15.5027 51.379 17.9018C51.379 20.3009 49.5278 22.2565 47.3178 22.2565Z" />
    </svg>
  );
}

export default function LandingMarketingFooter() {
  return (
    <footer
      id="resources"
      className="scroll-mt-24 border-t border-white/[0.06] px-5 pb-10 pt-12 sm:px-6 lg:px-10"
      style={{ background: BG, fontFamily: 'var(--font-body)' }}
    >
      <div className="mx-auto max-w-[1240px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,220px)_repeat(4,minmax(0,1fr))] lg:gap-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BobFooterMark />
              <span
                className="inline-flex items-baseline gap-1 text-[18px] tracking-[0.04em]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                <span className="text-[#36E7A1]">BOOM</span>
                <span className="text-white">OR BUST</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed" style={{ color: MUTED }}>
              The Bloomberg Terminal for dynasty football
            </p>
          </div>

          {FOOTER_COLS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#64748B]">{col.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="flex min-h-[44px] items-center text-[14px] text-[#94a3b8] transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 text-[12px] text-[#64748B] sm:flex-row">
          <p>© 2026 Boom or Bust. All rights reserved.</p>
          <div className="flex items-center gap-2 sm:gap-5">
            <a
              href={TWITTER_PROFILE_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#64748B] transition-colors duration-200 hover:text-[#36E7A1] hover:drop-shadow-[0_0_10px_rgba(54,231,161,0.55)]"
              aria-label="X (Twitter)"
            >
              <IconX />
            </a>
            <a
              href="https://discord.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-[#64748B] transition-colors duration-200 hover:text-[#36E7A1] hover:drop-shadow-[0_0_10px_rgba(54,231,161,0.55)]"
              aria-label="Discord"
            >
              <IconDiscord />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
