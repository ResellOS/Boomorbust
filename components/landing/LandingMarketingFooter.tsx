import Image from 'next/image';
import Link from 'next/link';
import { TWITTER_PROFILE_HREF } from '@/lib/twitter-public';

const BG = '#0a0d14';

const PRODUCT = [
  { label: 'Features', href: '/#features' },
  { label: 'Pricing', href: '/#pricing' },
] as const;

const COMPANY = [
  { label: 'About', href: '/resources' },
  { label: 'Careers', href: 'mailto:hello@boomorbust.app?subject=Careers' },
] as const;

const RESOURCES = [
  { label: 'Blog', href: TWITTER_PROFILE_HREF },
  { label: 'Docs', href: '/resources#documentation' },
  { label: 'BOB Record', href: '/performance' },
] as const;

const LEGAL = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
] as const;

export default function LandingMarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] px-4 pb-10 pt-20 sm:px-6 sm:pb-12 sm:pt-24 lg:px-10" style={{ background: BG }}>
      <div className="mx-auto max-w-[1240px]">
        <div className="flex flex-col gap-10 lg:flex-row lg:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center shrink-0">
              <Image
                src="/images/logo-full2.png"
                alt="Boom or Bust"
                width={180}
                height={48}
                className="h-10 w-auto object-contain"
                priority
              />
            </Link>
            <p className="mt-3 text-[14px] leading-relaxed text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Your fantasy edge, every single week.
            </p>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-8 sm:grid-cols-4 lg:max-w-[640px]">
            <FooterCol title="Product" links={PRODUCT} />
            <FooterCol title="Company" links={COMPANY} />
            <FooterCol title="Resources" links={RESOURCES} />
            <FooterCol title="Legal" links={LEGAL} />
          </div>

          <div className="flex flex-col items-start gap-3 lg:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
              Connect
            </p>
            <div className="flex items-center gap-5">
              <a href="https://twitter.com/boomorbustapp" style={{ fontSize: 18, color: 'rgba(255,255,255,0.4)' }} className="hover:text-white transition-colors">𝕏</a>
              <a href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} className="hover:text-white transition-colors">Discord</a>
              <a href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }} className="hover:text-white transition-colors">YouTube</a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/[0.06] pt-6 text-center text-[12px] text-[#475569] sm:text-left" style={{ fontFamily: 'var(--font-body)' }}>
          © {new Date().getFullYear()} Boom or Bust. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#64748B]" style={{ fontFamily: 'var(--font-body)' }}>
        {title}
      </p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            {l.href.startsWith('http') ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-white/75 transition-colors hover:text-white"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-[13px] text-white/75 transition-colors hover:text-white" style={{ fontFamily: 'var(--font-body)' }}>
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
