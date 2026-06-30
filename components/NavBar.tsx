'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Settings,
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Crosshair,
} from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import type { EmpireTickerResult } from '@/lib/dashboard/empireTicker';
import NotificationBell from '@/components/dashboard/NotificationBell';
import { SyncButton } from '@/components/dashboard/SyncButton';

const MAIN_NAV: Array<{ href: string; label: string; mobilePillar?: string }> = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/lineup', label: 'Lineup', mobilePillar: 'START/SIT' },
  { href: '/trade-hub', label: 'Trade', mobilePillar: 'TRADE' },
  { href: '/rookies', label: 'Scout', mobilePillar: 'SCOUT' },
];

const MORE_SECTIONS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: 'TERMINAL',
    links: [
      { href: '/trade-hub', label: 'Trade Hub' },
      { href: '/waiver-wire', label: 'Waiver Wire' },
      { href: '/digest', label: 'Weekly Digest' },
      { href: '/arbitrage', label: 'Arbitrage Board' },
    ],
  },
  {
    title: 'DRAFT & SCOUT',
    links: [
      { href: '/rookies', label: 'Rookie Board' },
      { href: '/scouting', label: 'Scouting Terminal' },
      { href: '/wrapped', label: 'Dynasty Wrapped' },
    ],
  },
  {
    title: 'COACH',
    links: [
      { href: '/coach', label: 'Dynasty Coach' },
      { href: '/settings', label: 'Settings' },
    ],
  },
];

const MOBILE_BOTTOM_HREFS = ['/dashboard', '/lineup', '/trade-hub', '/rookies'] as const;

function TierBadge({ tier }: { tier: 'free' | 'pro' | 'elite' | 'all_pro_terminal' }) {
  const isElite = tier === 'elite' || tier === 'all_pro_terminal';
  const styles =
    isElite
      ? 'bg-[#FBBF24]/12 border-[#FBBF24]/35 text-[#FBBF24]'
      : tier === 'pro'
        ? 'bg-[#22D3EE]/12 border-[#22D3EE]/35 text-[#22D3EE]'
        : 'bg-white/5 border-white/10 text-[var(--text-muted)]';
  const label = isElite ? 'All-Pro ✦' : tier === 'pro' ? 'Pro' : 'Free';
  return (
    <span
      className={clsx(
        'text-[11px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 font-mono',
        styles,
      )}
    >
      {label}
    </span>
  );
}

function isMainNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreRouteActive(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  const inMain = MAIN_NAV.some((m) => isMainNavActive(pathname, m.href));
  return !inMain;
}

function isLinkActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface EmpireTickerProps {
  week: number;
  season: string;
  winning: number;
  total: number;
}

interface NavBarProps {
  email: string;
  username?: string | null;
  tier: 'free' | 'pro' | 'elite' | 'all_pro_terminal';
  /** Live Sleeper week / winning ratio for dashboard home chrome. */
  empireTicker?: EmpireTickerResult | null;
}

const navLinkClass = (active: boolean) =>
  clsx(
    'font-mono text-[12px] uppercase tracking-[0.08em] transition-colors pb-1 border-b-2',
    active
      ? 'text-white border-[#22D3EE]'
      : 'text-[#94A3B8] hover:text-white border-transparent',
  );

const dropdownLinkClass = (active: boolean) =>
  clsx(
    'block py-2 px-3 rounded-lg font-mono text-[12px] uppercase tracking-[0.08em] transition-colors',
    active ? 'text-white bg-white/[0.06]' : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]',
  );

export default function NavBar({ email, username, tier, empireTicker = null }: NavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const moreGroupActive = useMemo(() => isMoreRouteActive(pathname), [pathname]);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) closeMore();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMore();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen, closeMore]);

  useEffect(() => {
    if (open) {
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setOpen(false);
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const display = username?.trim() || email.split('@')[0] || email;
  const initial = display.slice(0, 1).toUpperCase();
  const isDashboardHome = pathname === '/dashboard';

  const tabIcon = (href: string) => {
    if (href === '/dashboard') return LayoutDashboard;
    if (href.includes('lineup')) return BarChart3;
    if (href.includes('trade')) return ArrowLeftRight;
    if (href.includes('rookies')) return Crosshair;
    return LayoutDashboard;
  };

  return (
    <>
      <nav
        className="sticky top-0 z-40 relative border-b px-3 sm:px-5 py-3"
        style={{
          background: 'rgba(6,9,16,0.92)',
          borderColor: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div className="max-w-[1600px] mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          {/* Left: menu + logo + desktop nav */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 justify-start">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
              aria-label={open ? 'Close menu' : 'Open menu'}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link
              href="/dashboard"
              className="flex items-center shrink-0 overflow-visible min-w-[140px] min-h-[44px]"
              aria-label="Boom or Bust"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-full2.png"
                height={44}
                width={140}
                alt="Boom or Bust"
                className="h-11 w-auto object-contain shrink-0"
                style={{ height: 44, width: 'auto', minWidth: 140, objectFit: 'contain' }}
              />
            </Link>

            <div className="hidden lg:flex items-center gap-5 xl:gap-6 flex-wrap">
              {MAIN_NAV.map((item) => {
                const active = isMainNavActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className={navLinkClass(active)}>
                    {item.label}
                  </Link>
                );
              })}
              <div ref={moreRef} className="relative flex items-center">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className={clsx(navLinkClass(moreGroupActive || moreOpen), 'cursor-pointer bg-transparent')}
                  aria-expanded={moreOpen}
                  aria-haspopup="menu"
                >
                  More ▾
                </button>
                {moreOpen && (
                  <div
                    role="menu"
                    className="glass-panel absolute left-0 top-full mt-2 py-3 px-2 min-w-[260px] z-[60] rounded-xl"
                    style={{
                      border: '1px solid rgba(255,255,255,0.08)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                    }}
                  >
                    {MORE_SECTIONS.map((section) => (
                      <div key={section.title} className="mb-3 last:mb-0">
                        <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                          — {section.title} —
                        </p>
                        <div className="flex flex-col gap-0.5">
                          {section.links.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              role="menuitem"
                              className={dropdownLinkClass(isLinkActive(pathname, l.href))}
                              onClick={() => {
                                setMoreOpen(false);
                              }}
                            >
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Center: empire record ticker */}
          <div className="justify-self-center flex items-center justify-center min-w-0 max-w-[min(100%,200px)] sm:max-w-none px-1">
            {empireTicker && empireTicker.total > 0 ? (
              <div className="rounded-full px-2 py-1 sm:px-3 sm:py-1.5 md:px-3.5 md:py-2 bg-[#36E7A1] font-mono text-[10px] sm:text-[11px] md:text-[12px] font-black uppercase tracking-[0.1em] md:tracking-[0.12em] shrink-0 border border-emerald-400/50 shadow-[0_0_24px_rgba(54,231,161,0.45)] tabular-nums">
                <span className="text-black">{empireTicker.winning}</span>
                <span className="text-black/60"> / </span>
                <span className="text-black">{empireTicker.total}</span>
                <span className="text-black/90 ml-1 sm:ml-1.5 hidden sm:inline">Winning</span>
              </div>
            ) : empireTicker ? (
              <span className="text-[10px] font-mono font-black uppercase tracking-[0.18em] text-slate-500 whitespace-nowrap">
                Wk {empireTicker.week}
              </span>
            ) : null}
          </div>

          {/* Right actions */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
            {isDashboardHome && (
              <Link
                href="/auth/signup"
                className="hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold text-white border border-[#1F2937] transition hover:brightness-110 shrink-0 font-mono uppercase tracking-[0.06em]"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 55%, #22d3ee 100%)',
                  boxShadow: '0 0 20px rgba(34,211,238,0.2)',
                }}
              >
                JOIN WAITLIST
                <span aria-hidden>→</span>
              </Link>
            )}
            <SyncButton />
            <TierBadge tier={tier} />
            <div className="flex shrink-0">
              <NotificationBell />
            </div>
            <Link href="/settings" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[var(--indigo)]/40 to-[var(--cyan)]/20 flex items-center justify-center text-white text-xs sm:text-sm font-bold border border-[#1F2937] font-mono">
                {initial}
              </div>
              <div className="hidden xl:flex items-baseline gap-1 min-w-0 max-w-[220px] text-[11px] font-mono text-slate-500">
                <span className="text-slate-200 font-semibold truncate">{display}</span>
                <span className="shrink-0">signed in</span>
              </div>
            </Link>
            <Link
              href="/settings"
              className="hidden md:flex text-[#64748b] hover:text-white p-1.5 sm:p-2 shrink-0"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="hidden lg:inline text-xs text-[#64748b] hover:text-white border border-[#1F2937] rounded-lg px-2 py-1.5 font-mono uppercase tracking-[0.06em] shrink-0"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full menu */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-[55] bg-black/60 pt-[68px]"
          onClick={() => setOpen(false)}
        >
          <div
            className="slim-scroll absolute top-[68px] left-0 right-0 border-b border-white/[0.08] px-4 py-4 flex flex-col gap-5 max-h-[calc(85vh)] overflow-y-auto font-mono"
            style={{
              background: 'rgba(13,17,23,0.94)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {MAIN_NAV.map((item) => (
              <div key={item.href}>
                {item.mobilePillar ? (
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">{item.mobilePillar}</p>
                ) : null}
                <Link
                  href={item.href}
                  className={clsx(
                    'block text-[12px] uppercase tracking-[0.08em] py-2 border-b-2 transition-colors',
                    isMainNavActive(pathname, item.href)
                      ? 'text-white border-[#22D3EE]'
                      : 'text-[#94A3B8] border-transparent hover:text-white',
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              </div>
            ))}

            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1.5">MORE</p>
              <div
                className="glass-panel rounded-xl p-3 space-y-4"
                style={{
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                }}
              >
                {MORE_SECTIONS.map((section) => (
                  <div key={section.title}>
                    <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2">— {section.title} —</p>
                    <div className="flex flex-col gap-1">
                      {section.links.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={dropdownLinkClass(isLinkActive(pathname, l.href))}
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                void handleSignOut();
              }}
              className="text-left text-[12px] uppercase tracking-[0.08em] text-[#94A3B8] hover:text-white pt-2 border-t border-white/[0.06]"
            >
              Sign out
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar — primary pillars + menu */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t pb-[env(safe-area-inset-bottom)] pt-2 px-1"
        style={{
          background: 'rgba(6,9,16,0.96)',
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {MOBILE_BOTTOM_HREFS.map((href) => {
          const meta = MAIN_NAV.find((m) => m.href === href)!;
          const Icon = tabIcon(href);
          const active = isMainNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              style={{
                color: active ? '#22D3EE' : 'var(--text-muted)',
              }}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-mono uppercase tracking-[0.06em] truncate w-full text-center">
                {meta.label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={clsx(
            'flex flex-col items-center gap-0.5 py-2 px-1 flex-1 transition-colors',
            open ? 'text-[#22D3EE]' : 'text-[#94A3B8] hover:text-white',
          )}
          aria-label={open ? 'Close full menu' : 'Open full menu'}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-mono uppercase tracking-[0.06em]">More</span>
        </button>
      </nav>
    </>
  );
}
