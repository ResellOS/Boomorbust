'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LANDING } from './constants';

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Orphan Challenge', href: '#orphan' },
  { label: 'Track Record', href: '/performance' },
] as const;

const RESOURCES = [
  { label: 'Documentation', href: '/resources#documentation' },
  { label: 'Dynasty glossary', href: '/resources#glossary' },
  { label: 'Changelog', href: '/resources#changelog' },
];

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!resRef.current?.contains(e.target as Node)) setResourcesOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-[100] transition-colors duration-300"
      style={{
        background: scrolled ? LANDING.bg : 'transparent',
        borderBottom: scrolled ? `1px solid ${LANDING.border}` : '1px solid transparent',
      }}
    >
      <div className="mx-auto flex h-[64px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <div style={{ mixBlendMode: 'screen' }}>
            <Image
              src="/logo.png"
              alt="Boom or Bust"
              width={160}
              height={48}
              priority
              unoptimized
              className="h-[36px] w-auto sm:h-[42px]"
              style={{ mixBlendMode: 'screen', filter: 'brightness(1.2) saturate(1.2)' }}
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="font-figtree text-[13px] text-[#e8ecf4]/75 transition hover:text-[#e8ecf4]"
            >
              {l.label}
            </Link>
          ))}
          <div className="relative" ref={resRef}>
            <button
              type="button"
              className="flex items-center gap-1 font-figtree text-[13px] text-[#e8ecf4]/75 hover:text-[#e8ecf4]"
              onClick={() => setResourcesOpen((v) => !v)}
            >
              Resources ▾
            </button>
            {resourcesOpen && (
              <div
                className="absolute left-0 top-full mt-2 min-w-[180px] rounded-md border py-1"
                style={{ background: LANDING.surface, borderColor: LANDING.border }}
              >
                {RESOURCES.map((r) => (
                  <Link
                    key={r.href}
                    href={r.href}
                    className="block px-4 py-2 font-figtree text-[12px] text-[#e8ecf4]/80 hover:bg-white/5 hover:text-[#e8ecf4]"
                    onClick={() => setResourcesOpen(false)}
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/auth/login"
            className="rounded-md border px-4 py-2 font-figtree text-[13px] text-[#e8ecf4]/90 transition hover:border-[#36E7A1]/40"
            style={{ borderColor: LANDING.border }}
          >
            Log In
          </Link>
          <Link
            href="/onboarding"
            className="rounded-md px-4 py-2 font-figtree text-[13px] text-[#0a0d14] transition hover:brightness-110"
            style={{ background: LANDING.boom }}
          >
            Import My Leagues
          </Link>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-md border lg:hidden"
          style={{ borderColor: LANDING.border }}
          aria-label="Menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span className="text-[#e8ecf4]">{mobileOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t lg:hidden" style={{ borderColor: LANDING.border, background: LANDING.bg }}>
          <div className="flex flex-col gap-1 px-4 py-4">
            {[...NAV_LINKS, ...RESOURCES.map((r) => ({ label: r.label, href: r.href }))].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="py-2.5 font-figtree text-[14px] text-[#e8ecf4]/85"
                onClick={closeMobile}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/auth/login" className="mt-2 py-2.5 font-figtree text-[14px] text-[#e8ecf4]" onClick={closeMobile}>
              Log In
            </Link>
            <Link
              href="/onboarding"
              className="mt-1 rounded-md py-3 text-center font-figtree text-[14px] text-[#0a0d14]"
              style={{ background: LANDING.boom }}
              onClick={closeMobile}
            >
              Import My Leagues
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
