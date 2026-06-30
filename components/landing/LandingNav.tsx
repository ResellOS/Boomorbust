'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

const BOOM = '#3ECFAD';

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
    'text-[15px] font-medium text-white/80 transition-colors duration-200 hover:text-white';
  const linkStyle = { fontFamily: 'var(--font-body)' } as const;

  return (
    <header className="sticky top-0 z-[100] h-[72px] lg:h-[120px] bg-[#0a0d14]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="relative z-[110] mx-auto flex h-full w-full max-w-[1400px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/images/logo-full2.png"
            alt="Boom or Bust"
            width={480}
            height={170}
            className="h-[54px] lg:h-[100px] w-auto object-contain"
            priority
          />
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
                    className="flex min-h-[44px] items-center px-4 py-2 text-[14px] text-white/90 transition-colors hover:bg-white/[0.06] hover:text-white"
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
            className="hidden min-h-[44px] items-center rounded-lg border border-white/[0.12] bg-transparent px-4 py-2 text-[15px] font-semibold text-white/90 transition-colors duration-200 hover:border-white/[0.2] hover:bg-white/[0.04] hover:text-white lg:inline-flex"
            style={linkStyle}
          >
            Sign In
          </Link>

          <Link
            href="/signup"
            className="hidden min-h-[44px] items-center justify-center rounded-xl px-5 py-2.5 text-center text-[15px] font-bold text-[#0a0d14] shadow-[0_0_28px_rgba(62,207,173,0.45)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_32px_rgba(62,207,173,0.5)] lg:inline-flex"
            style={{
              fontFamily: 'var(--font-body)',
              background: BOOM,
            }}
          >
            Import FB/Leagues
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
          className={`absolute inset-0 bg-[#0a0d14]/80 backdrop-blur-sm transition-opacity duration-200 ${
            mobileOpen ? 'opacity-100' : 'opacity-0'
          }`}
          tabIndex={mobileOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={closeMobile}
        />
        <div
          className={`absolute right-0 top-[72px] flex h-[calc(100dvh-72px)] w-[min(100%,320px)] flex-col border-l border-white/[0.08] bg-[#0a0d14]/95 backdrop-blur-[24px] transition-transform duration-200 ease-out ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col gap-1 px-4 py-5" style={{ fontFamily: 'var(--font-body)' }}>
            {[...CENTER_LINKS].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex min-h-[44px] items-center rounded-lg px-3 py-3 text-[16px] font-medium text-white hover:bg-white/[0.06]"
                onClick={closeMobile}
              >
                {item.label}
              </Link>
            ))}
            <div className="border-t border-white/[0.06] pt-2">
              <span className="flex min-h-[44px] items-center px-3 py-2 text-[12px] font-semibold uppercase tracking-wider text-white/45">
                Resources
              </span>
              {RESOURCES_ITEMS.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  className="flex min-h-[44px] items-center rounded-lg px-3 py-2.5 text-[15px] text-white/90 hover:bg-white/[0.06]"
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
              className="flex min-h-[44px] items-center justify-center rounded-lg border border-white/[0.12] bg-transparent py-3 text-center text-[16px] font-semibold text-white hover:bg-white/[0.04]"
              onClick={closeMobile}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="flex min-h-[48px] items-center justify-center rounded-xl py-3 text-[16px] font-bold text-[#0a0d14] shadow-[0_0_28px_rgba(62,207,173,0.45)] transition-[filter,box-shadow] duration-200 hover:brightness-110 hover:shadow-[0_0_32px_rgba(62,207,173,0.5)]"
              style={{ background: BOOM, fontFamily: 'var(--font-body)' }}
              onClick={closeMobile}
            >
              Import FB/Leagues
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
