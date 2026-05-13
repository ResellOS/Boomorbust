'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

const NAV_BG = '#0a0d14';
const BOOM = '#36E7A1';
const BUST_PURPLE = '#7c3aed';

const CENTER_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
] as const;

const RESOURCES_ITEMS = [
  { label: 'Documentation', href: '/resources#documentation' },
  { label: 'Dynasty glossary', href: '/resources#glossary' },
  { label: 'Changelog', href: '/resources#changelog' },
] as const;

function BobLogoMark({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, '');
  const clipL = `bobL-${uid}`;
  const clipR = `bobR-${uid}`;
  return (
    <svg className={className} viewBox="0 0 40 44" width={40} height={44} aria-hidden>
      <defs>
        <clipPath id={clipL}>
          <rect x="0" y="0" width="20" height="44" />
        </clipPath>
        <clipPath id={clipR}>
          <rect x="20" y="0" width="20" height="44" />
        </clipPath>
      </defs>
      <text
        x="2"
        y="36"
        fontSize="38"
        fontWeight={700}
        fontFamily="var(--font-display), Bebas Neue, sans-serif"
        fill={BOOM}
        clipPath={`url(#${clipL})`}
      >
        B
      </text>
      <text
        x="2"
        y="36"
        fontSize="38"
        fontWeight={700}
        fontFamily="var(--font-display), Bebas Neue, sans-serif"
        fill={BUST_PURPLE}
        clipPath={`url(#${clipR})`}
      >
        B
      </text>
      <path
        fill="#f8fafc"
        d="M20.5 14.5l-3.2 5.6h2.4l-1.2 6.8 5.2-7.6h-2.1l1.5-4.8z"
        style={{ filter: 'drop-shadow(0 0 5px rgba(54,231,161,0.5))' }}
      />
    </svg>
  );
}

function BobWordmark() {
  return (
    <span
      className="inline-flex items-baseline gap-1 whitespace-nowrap"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      <span className="text-[20px] tracking-[0.04em] sm:text-[26px]" style={{ color: BOOM }}>
        BOOM
      </span>
      <span className="text-[20px] tracking-[0.04em] text-white sm:text-[26px]">OR BUST</span>
    </span>
  );
}

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      width={12}
      height={12}
      className="shrink-0 text-white/80 transition-transform duration-200"
      style={{ transform: open ? 'rotate(180deg)' : undefined }}
      aria-hidden
    >
      <path
        d="M2.5 4.25 L6 7.75 L9.5 4.25"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const resourcesWrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = resourcesWrapRef.current;
      if (!el?.contains(e.target as Node)) setResourcesOpen(false);
    }
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const linkClass =
    'text-[14px] font-medium text-white/80 transition-colors duration-200 hover:text-white';
  const linkStyle = { fontFamily: 'var(--font-body)' } as const;

  return (
    <header
      className="sticky top-0 z-[100] h-14 border-b border-white/[0.06]"
      style={{ background: NAV_BG }}
    >
      <div className="relative z-[110] mx-auto flex h-full w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 sm:gap-3" aria-label="Boom or Bust home">
          <BobLogoMark className="h-8 w-auto sm:h-9" />
          <BobWordmark />
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-9 lg:flex"
          aria-label="Primary"
        >
          {CENTER_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className={`${linkClass} inline-flex min-h-[44px] items-center`} style={linkStyle}>
              {item.label}
            </Link>
          ))}
          <div className="relative" ref={resourcesWrapRef}>
            <button
              type="button"
              className={`${linkClass} inline-flex min-h-[44px] items-center gap-1 rounded-md px-1`}
              style={linkStyle}
              aria-expanded={resourcesOpen}
              aria-haspopup="menu"
              onClick={(e) => {
                e.stopPropagation();
                setResourcesOpen((v) => !v);
              }}
            >
              Resources
              <ChevronDown open={resourcesOpen} />
            </button>
            {resourcesOpen ? (
              <div
                role="menu"
                className="absolute left-1/2 top-[calc(100%+10px)] z-[110] min-w-[200px] -translate-x-1/2 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 backdrop-blur-[24px]"
              >
                {RESOURCES_ITEMS.map((r) => (
                  <Link
                    key={r.label}
                    role="menuitem"
                    href={r.href}
                    className="flex min-h-[44px] items-center px-4 py-2 text-[13px] text-white/90 transition-colors hover:bg-white/[0.06] hover:text-white"
                    style={linkStyle}
                    onClick={() => setResourcesOpen(false)}
                  >
                    {r.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden min-h-[44px] items-center px-3 py-2 text-[14px] font-medium text-white/80 transition-colors duration-200 hover:text-white lg:inline-flex"
            style={linkStyle}
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="hidden min-h-[44px] min-w-[132px] flex-col items-center justify-center rounded-xl px-4 py-1.5 text-center shadow-[0_0_22px_rgba(54,231,161,0.42),0_0_48px_rgba(54,231,161,0.16)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(54,231,161,0.3)] lg:flex"
            style={{
              fontFamily: 'var(--font-body)',
              background: BOOM,
              color: '#ffffff',
            }}
          >
            <span className="text-[14px] font-bold leading-tight text-white">Start Free</span>
            <span className="text-[11px] font-medium leading-tight text-white/85" style={{ fontFamily: 'var(--font-body)' }}>
              <span className="font-mono tabular-nums">$0</span> Forever
            </span>
          </Link>

          <button
            type="button"
            className="inline-flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-lg border border-white/[0.08] text-white lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls={menuId}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width={20} height={14} viewBox="0 0 24 18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M0 1h24M0 9h24M0 17h24" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id={menuId}
        className={`fixed inset-0 z-[90] lg:hidden ${mobileOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={closeMobile}
        />
        <div
          className={`absolute right-0 top-14 flex h-[calc(100dvh-3.5rem)] w-[min(100%,320px)] flex-col border-l border-white/[0.08] bg-[#0a0d14]/95 backdrop-blur-[24px] transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col gap-1 px-4 py-5" style={{ fontFamily: 'var(--font-body)' }}>
            {[...CENTER_LINKS].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[44px] items-center rounded-lg px-3 py-3 text-[15px] font-medium text-white hover:bg-white/[0.06]"
                onClick={closeMobile}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] pt-2">
              <span className="flex min-h-[44px] items-center px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Resources
              </span>
              {RESOURCES_ITEMS.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-[14px] text-white/90 hover:bg-white/[0.06]"
                  onClick={closeMobile}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 border-t border-white/[0.06] p-4">
            <Link
              href="/login"
              className="flex min-h-[44px] items-center justify-center rounded-lg py-3 text-center text-[15px] font-medium text-white hover:bg-white/[0.06]"
              onClick={closeMobile}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex min-h-[48px] flex-col items-center justify-center rounded-xl py-3 shadow-[0_0_22px_rgba(54,231,161,0.38)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(54,231,161,0.3)]"
              style={{ background: BOOM, fontFamily: 'var(--font-body)' }}
              onClick={closeMobile}
            >
              <span className="text-[15px] font-bold text-white">Start Free</span>
              <span className="text-[12px] font-medium text-white/85" style={{ fontFamily: 'var(--font-body)' }}>
                <span className="font-mono tabular-nums">$0</span> Forever
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
