'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  Bell,
  Settings,
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Sparkles,
  Crosshair,
  Briefcase,
} from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import type { EmpireTickerResult } from '@/lib/dashboard/empireTicker';

export const NAV_LINKS: Array<{ href: string; label: string; badge?: string }> = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/trade', label: 'Trade' },
  { href: '/dashboard/lineup', label: 'Lineup' },
  { href: '/dashboard/optimizer', label: 'Optimizer', badge: 'NEW' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/picks', label: 'Picks' },
  { href: '/dashboard/portfolio', label: 'Portfolio' },
  { href: '/dashboard/trade/finder', label: 'Finder' },
  { href: '/dashboard/managers', label: 'Managers' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/handcuffs', label: 'Handcuffs' },
  { href: '/dashboard/rookies', label: 'Rookies', badge: 'NEW' },
  { href: '/dashboard/scouting', label: 'Scouting' },
  { href: '/dashboard/coach', label: 'Coach', badge: '✦' },
  { href: '/dashboard/wrapped', label: 'Wrapped' },
  { href: '/dashboard/mission-control', label: 'Mission Control' },
];

const MOBILE_TABS = [
  NAV_LINKS[0]!,
  NAV_LINKS[6]!,
  NAV_LINKS[12]!,
  NAV_LINKS[1]!,
] as const;

function TierBadge({ tier }: { tier: 'free' | 'pro' | 'elite' }) {
  const styles =
    tier === 'elite'
      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
      : tier === 'pro'
        ? 'bg-[var(--indigo)]/25 border-[var(--indigo)]/50 text-[var(--indigo-light)]'
        : 'bg-white/5 border-white/10 text-[var(--text-muted)]';
  const label = tier === 'elite' ? 'Elite ✦' : tier === 'pro' ? 'Pro' : 'Free';
  return (
    <span className={clsx('text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0', styles)}>
      {label}
    </span>
  );
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
  tier: 'free' | 'pro' | 'elite';
  /** Live Sleeper week / winning ratio for dashboard home chrome. */
  empireTicker?: EmpireTickerResult | null;
}

export default function NavBar({ email, username, tier, empireTicker = null }: NavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const display = username?.trim() || email.split('@')[0] || email;
  const initial = display.slice(0, 1).toUpperCase();

  const NavLink = ({ href, label, badge }: { href: string; label: string; badge?: string }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={clsx(
          'text-sm font-medium transition-colors flex items-center gap-1',
          active ? 'text-white' : 'text-[var(--text-secondary)] hover:text-white'
        )}
      >
        {label}
        {badge && (
          <span className={clsx('text-[10px] font-bold px-1 py-0.5 rounded', active ? 'text-[var(--indigo-light)]' : 'text-[var(--indigo)]/70')}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const tabIcon = (href: string) => {
    if (href.includes('/portfolio')) return Briefcase;
    if (href.includes('trade')) return ArrowLeftRight;
    if (href.includes('lineup')) return BarChart3;
    if (href.includes('rankings')) return BarChart3;
    if (href.includes('coach')) return Sparkles;
    if (href.includes('scouting')) return Crosshair;
    return LayoutDashboard;
  };

  const isDashboardHome = pathname === '/dashboard';

  return (
    <>
      <nav
        className={`sticky top-0 z-40 border-b px-4 sm:px-6 py-3 relative ${
          isDashboardHome ? 'flex w-full items-center' : 'flex items-center justify-between gap-4'
        }`}
        style={{
          background: isDashboardHome ? 'rgba(6,8,12,0.92)' : 'rgba(8,11,20,0.88)',
          borderColor: isDashboardHome ? 'rgba(255,255,255,0.1)' : 'var(--border)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        {isDashboardHome ? (
          <div className="w-full max-w-[1600px] mx-auto grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1 sm:gap-2 justify-start min-w-0">
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white shrink-0"
                aria-label={open ? 'Close menu' : 'Open menu'}
              >
                {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              {empireTicker && (
                <span className="hidden sm:inline text-[9px] sm:text-[10px] font-mono-tactical font-black uppercase tracking-[0.18em] text-slate-500 truncate">
                  Wk {empireTicker.week}
                </span>
              )}
            </div>

            <Link
              href="/dashboard"
              className="justify-self-center flex items-center justify-center shrink-0 min-w-0"
              aria-label="Boom or Bust Dashboard"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo-full2.png"
                height={28}
                alt="Boom or Bust"
                className="h-7 w-auto max-w-[min(200px,45vw)] object-contain sm:h-8 sm:max-w-[220px]"
                style={{ width: 'auto' }}
              />
            </Link>

            <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
              {empireTicker && empireTicker.total > 0 && (
                <div className="rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#36E7A1] font-mono-tactical text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] sm:tracking-[0.12em] shrink-0 border border-emerald-400/50 shadow-[0_0_24px_rgba(54,231,161,0.45)]">
                  <span className="text-black">{empireTicker.winning}</span>
                  <span className="text-black/60"> / </span>
                  <span className="text-black">{empireTicker.total}</span>
                  <span className="text-black/90 ml-1.5">Winning</span>
                </div>
              )}
              <Link
                href="/onboarding"
                className="hidden sm:inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-white border border-[#1F2937] transition hover:brightness-110 shrink-0"
                style={{
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  background: 'linear-gradient(135deg, #6366f1 0%, #2563eb 55%, #22d3ee 100%)',
                  boxShadow: '0 0 20px rgba(99,102,241,0.25)',
                }}
              >
                Import My Leagues
                <span aria-hidden>→</span>
              </Link>
              <TierBadge tier={tier} />
              <button
                type="button"
                className="relative p-1.5 sm:p-2 rounded-lg hover:bg-white/5 text-[#64748b] hover:text-white hidden sm:flex shrink-0"
                aria-label="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border border-black/70 shadow-[0_0_8px_rgba(239,68,68,0.85)]"
                  aria-hidden
                >
                  1
                </span>
              </button>
              <Link href="/dashboard/settings" className="flex items-center gap-1.5 sm:gap-2 group shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-[var(--indigo)]/40 to-[var(--cyan)]/20 flex items-center justify-center text-white text-xs sm:text-sm font-bold border border-[#1F2937] font-mono-tactical">
                  {initial}
                </div>
                <div className="hidden xl:flex items-baseline gap-1 min-w-0 max-w-[220px] text-[10px] font-mono-tactical text-slate-500">
                  <span className="text-slate-200 font-semibold truncate">{display}</span>
                  <span className="shrink-0">signed in</span>
                </div>
              </Link>
              <Link
                href="/dashboard/settings"
                className="hidden md:flex text-[#64748b] hover:text-white p-1.5 sm:p-2 shrink-0"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden lg:inline text-xs text-[#64748b] hover:text-white border border-[#1F2937] rounded-lg px-2 py-1.5 font-mono-tactical shrink-0"
                style={{ fontFamily: 'var(--font-inter), Inter, sans-serif' }}
              >
                Sign out
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-6 min-w-0">
              <Link href="/dashboard" className="flex items-center shrink-0 min-w-0" aria-label="Boom or Bust">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/logo-full2.png"
                  height={28}
                  alt="Boom or Bust"
                  className="h-7 w-auto max-w-[200px] object-contain sm:max-w-none"
                  style={{ width: 'auto' }}
                />
              </Link>
              <div className="hidden lg:flex items-center gap-4 flex-wrap max-w-[58vw]">
                {NAV_LINKS.slice(0, 8).map((l) => (
                  <NavLink key={l.href} {...l} />
                ))}
                <details className="relative group">
                  <summary className="list-none text-sm cursor-pointer text-[var(--text-secondary)] hover:text-white [&::-webkit-details-marker]:hidden flex items-center gap-1">
                    More ▾
                  </summary>
                  <div className="absolute left-0 top-full mt-2 py-3 px-4 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] shadow-xl grid gap-3 min-w-[200px] z-50">
                    {NAV_LINKS.slice(8).map((l) => (
                      <NavLink key={l.href} {...l} />
                    ))}
                  </div>
                </details>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <TierBadge tier={tier} />
              <button type="button" className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-white hidden sm:flex" aria-label="Notifications">
                <Bell className="w-5 h-5" />
              </button>
              <Link href="/dashboard/settings" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--indigo)]/40 to-[var(--cyan)]/20 flex items-center justify-center text-white text-sm font-bold border border-[var(--border)]">
                  {initial}
                </div>
                <div className="hidden xl:flex flex-col items-start min-w-0 max-w-[160px]">
                  <span className="text-sm font-medium text-white truncate w-full">{display}</span>
                  <span className="text-[11px] text-[var(--text-muted)] truncate w-full">{email}</span>
                </div>
              </Link>
              <Link href="/dashboard/settings" className="hidden md:flex text-[var(--text-muted)] hover:text-white p-2" aria-label="Settings">
                <Settings className="w-5 h-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="hidden lg:inline text-xs text-[var(--text-muted)] hover:text-white border border-[var(--border)] rounded-lg px-3 py-1.5"
              >
                Sign out
              </button>
              <button
                className="lg:hidden text-[var(--text-muted)] hover:text-white p-1.5"
                onClick={() => setOpen(!open)}
                aria-label="Toggle menu"
              >
                {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </>
        )}
      </nav>

      {/* Rest of the file remains exactly as you had it (Mobile menu and Bottom bar) */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60 pt-[72px]" onClick={() => setOpen(false)}>
          <div
            className="absolute top-[72px] left-0 right-0 bg-[var(--bg-card)] border-b border-[var(--border)] px-6 py-4 flex flex-col gap-4 max-h-[calc(85vh)] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((l) => (
              <NavLink key={l.href} {...l} />
            ))}
            <button onClick={handleSignOut} className="text-left text-sm text-[var(--text-secondary)] hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t pb-[env(safe-area-inset-bottom)] pt-2 px-1"
        style={{
          background: 'rgba(8,11,20,0.95)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {MOBILE_TABS.map((t) => {
          const Icon = tabIcon(t.href);
          const active =
            pathname === t.href ||
            (t.href !== '/dashboard' && pathname.startsWith(t.href));
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-col items-center gap-0.5 py-2 px-2 min-w-0 flex-1"
              style={{
                color: active ? 'var(--team-primary, var(--indigo))' : 'var(--text-muted)',
              }}
            >
              <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-medium truncate w-full text-center">{t.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="flex flex-col items-center gap-0.5 py-2 px-2 text-[var(--text-muted)]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[9px]">More</span>
        </button>
      </nav>

      {moreOpen && (
        <div className="lg:hidden fixed inset-0 z-[45] bg-black/70 pb-24 pt-auto flex flex-col justify-end" onClick={() => setMoreOpen(false)}>
          <div
            className="rounded-t-2xl bg-[var(--bg-card)] border border-[var(--border)] p-4 max-h-[60vh] overflow-y-auto mb-14"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[var(--text-muted)] text-xs mb-3 font-semibold uppercase tracking-wide">All tools</p>
            <div className="grid grid-cols-2 gap-2">
              {NAV_LINKS.filter((x) => !MOBILE_TABS.find((m) => m.href === x.href)).map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm py-2 px-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white"
                  onClick={() => setMoreOpen(false)}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}