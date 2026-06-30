'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, Settings, User, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import NotificationBell from '@/components/dashboard/NotificationBell';
import { SyncButton } from '@/components/dashboard/SyncButton';
import { useUserTierStore } from '@/store/userTierStore';
import type { SubscriptionTier } from '@/lib/access/gates';

const NAV_BG = '#0a0d14';
const BOOM = '#36E7A1';
const CYAN = '#22D3EE';
const INACTIVE = '#94a3b8';

function resolveTierBadge(tier: SubscriptionTier | null): { text: string; color: string } | null {
  if (!tier || tier === 'free') return null;
  if (tier === 'all_pro_terminal') return { text: 'All-Pro Terminal', color: '#A78BFA' };
  if (tier === 'elite') return { text: 'Veteran', color: CYAN };
  if (tier === 'pro') return { text: 'Rookie', color: CYAN };
  return null;
}

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard', exact: true },
  { label: 'Trade Hub', href: '/trade', exact: false },
  { label: 'Players', href: '/players', exact: false },
  { label: 'Start/Sit', href: '/dashboard/lineup', exact: false },
  { label: 'Draft Room', href: '/draft', exact: false },
  { label: 'Exposure', href: '/exposure', exact: false },
] as const;

function isLinkActive(pathname: string, href: string, exact: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initialsFrom(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? '?').toUpperCase();
}

/** Hex frame + green lightning — BOB mark */
function BobLogoMark() {
  return (
    <svg width={36} height={40} viewBox="0 0 36 40" aria-hidden className="shrink-0">
      <polygon
        points="18,2 33,11 33,29 18,38 3,29 3,11"
        fill="rgba(255,255,255,0.02)"
        stroke={CYAN}
        strokeWidth={1.25}
        strokeLinejoin="round"
      />
      <path
        fill={BOOM}
        d="M19.5 9.5L14 20h4.2l-2.1 10.5L24 17.2h-3.8l2.3-7.7z"
        style={{ filter: 'drop-shadow(0 0 6px rgba(54,231,161,0.75))' }}
      />
    </svg>
  );
}

function DesktopNavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="relative inline-flex h-full items-center whitespace-nowrap px-2.5 xl:px-3"
      style={{
        fontFamily: 'var(--font-body), Inter, sans-serif',
        fontSize: 14,
        fontWeight: 500,
        color: active ? '#ffffff' : INACTIVE,
        textDecoration: 'none',
        transition: 'color 150ms ease',
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.color = '#ffffff';
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLAnchorElement).style.color = INACTIVE;
      }}
    >
      {label}
      {active ? (
        <span
          aria-hidden
          className="absolute bottom-0 left-2 right-2 rounded-[1px]"
          style={{ height: 2, background: BOOM, boxShadow: '0 0 10px rgba(54,231,161,0.45)' }}
        />
      ) : null}
    </Link>
  );
}

interface EmpirePayload {
  score: number;
  grade: string;
  percentile: string;
  sparklineData: number[];
}

function NavEmpireWidget() {
  const [data, setData] = useState<EmpirePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch('/api/empire/score', { credentials: 'include' });
        if (!res.ok) throw new Error('bad');
        const j = (await res.json()) as EmpirePayload;
        if (!c) setData(j);
      } catch {
        if (!c) {
          setData({
            score: 82.5,
            grade: 'Elite',
            percentile: 'Top 8%',
            sparklineData: [62, 65, 68, 72, 76, 79, 82.5],
          });
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const pts = useMemo(() => {
    const arr = data?.sparklineData?.length ? data.sparklineData : [62, 65, 68, 72, 76, 79, 82.5];
    const max = Math.max(...arr);
    const min = Math.min(...arr);
    return arr
      .map((v, i, a) => {
        const x = (i / Math.max(1, a.length - 1)) * 52;
        const y = 20 - ((v - min) / Math.max(0.001, max - min)) * 16;
        return `${x},${y}`;
      })
      .join(' ');
  }, [data?.sparklineData]);

  if (loading) {
    return (
      <div
        className="hidden sm:flex h-10 min-w-[140px] animate-pulse rounded-lg border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]"
        aria-hidden
      />
    );
  }

  if (!data) return null;

  return (
    <div
      className="hidden sm:flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 backdrop-blur-[24px] shrink-0"
      style={{ boxShadow: '0 0 18px rgba(54,231,161,0.12)' }}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className="text-[11px] uppercase tracking-widest leading-none text-[#64748B]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          DYNASTY POWER RATING
        </span>
        <span
          className="text-[24px] font-bold leading-none tabular-nums text-[#36E7A1]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          {data.score.toFixed(1)}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex items-center rounded-full border border-emerald-500/35 bg-emerald-950/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-400"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {data.grade}
          </span>
          <span className="text-[12px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {data.percentile}
          </span>
        </div>
      </div>
      <svg width={52} height={22} viewBox="0 0 52 22" className="shrink-0" aria-hidden>
        <polyline points={pts} fill="none" stroke={BOOM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

function UserAccountMenu({
  displayName,
  initials,
  onSignOut,
  tierBadge,
}: {
  displayName: string;
  initials: string;
  onSignOut: () => void;
  tierBadge: { text: string; color: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-white/[0.04] transition-colors min-h-[44px]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 border border-[#A78BFA]/40"
          style={{
            background: 'linear-gradient(135deg, #7c3aed 0%, #A78BFA 55%, #4f46e5 100%)',
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            boxShadow: '0 0 14px rgba(167,139,250,0.35)',
          }}
        >
          {initials}
        </div>
        <div className="hidden md:flex flex-col items-start min-w-0 max-w-[120px]">
          <span
            className="truncate text-[14px] font-medium text-white leading-tight"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {displayName}
          </span>
          {tierBadge ? (
            <span
              className="truncate text-[11px] font-semibold leading-tight"
              style={{
                fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
                color: tierBadge.color,
              }}
            >
              {tierBadge.text}
            </span>
          ) : null}
        </div>
        <ChevronDown
          size={14}
          className={`hidden md:block shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          style={{ color: INACTIVE }}
        />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1.5 w-56 rounded-xl border border-white/[0.08] bg-[#0a0d14]/95 py-1.5 z-[70] backdrop-blur-[24px]"
          style={{ boxShadow: '0 0 28px rgba(34,211,238,0.12)' }}
        >
          <div className="px-3 py-2 border-b border-white/[0.06] mb-1">
            <p
              className="text-[11px] uppercase tracking-widest text-[#64748B]"
              style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
            >
              Signed in
            </p>
            <p className="text-sm font-semibold text-white mt-0.5 truncate">{displayName}</p>
          </div>

          <Link
            href="/settings"
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/[0.04] transition-colors"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            <User size={14} className="shrink-0" />
            Profile
          </Link>

          <Link
            href="/settings"
            role="menuitem"
            onClick={close}
            className="flex items-center gap-2.5 px-3 py-2 text-sm text-[#94a3b8] hover:text-white hover:bg-white/[0.04] transition-colors"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            <Settings size={14} className="shrink-0" />
            Settings
          </Link>

          <div className="my-1 border-t border-white/[0.06]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onSignOut();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[#94a3b8] hover:text-red-400 hover:bg-white/[0.04] transition-colors text-left"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            <LogOut size={14} className="shrink-0" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MobileDrawer({
  open,
  onClose,
  pathname,
  displayName,
  initials,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  displayName: string;
  initials: string;
  onSignOut: () => void;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div
        aria-hidden
        className="lg:hidden fixed inset-0 z-[55] bg-black/50 transition-opacity duration-200"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="lg:hidden fixed top-0 right-0 bottom-0 z-[60] flex w-[min(100%,320px)] flex-col border-l border-white/[0.08] transition-transform duration-300 ease-out"
        style={{
          background: NAV_BG,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
        }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#A78BFA]/40 text-xs font-bold text-white"
              style={{
                background: 'linear-gradient(135deg, #7c3aed 0%, #A78BFA 55%, #4f46e5 100%)',
                fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
              }}
            >
              {initials}
            </div>
            <span className="truncate text-sm font-medium text-white">{displayName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/[0.05] hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile primary">
          {NAV_LINKS.map((link) => {
            const active = isLinkActive(pathname, link.href, link.exact);
            return (
              <Link
                key={`${link.label}-${link.href}`}
                href={link.href}
                onClick={onClose}
                className="mb-0.5 flex items-center rounded-lg px-3 py-3 text-[15px] font-medium transition-colors"
                style={{
                  fontFamily: 'var(--font-body), Inter, sans-serif',
                  color: active ? '#ffffff' : INACTIVE,
                  background: active ? 'rgba(54,231,161,0.08)' : 'transparent',
                  borderLeft: active ? `2px solid ${BOOM}` : '2px solid transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 space-y-1 border-t border-white/[0.06] px-3 py-4">
          <Link
            href="/settings"
            onClick={onClose}
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[#94a3b8] hover:bg-white/[0.04] hover:text-white"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            <Settings size={15} />
            Settings
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-[#94a3b8] hover:bg-white/[0.04] hover:text-red-400"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}

export interface TopNavProps {
  email: string;
  username?: string | null;
}

export default function TopNav({ email, username }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tier, fetchTier } = useUserTierStore();
  const tierBadge = resolveTierBadge(tier);

  useEffect(() => {
    void fetchTier();
  }, [fetchTier]);

  const displayName = username?.trim() || email.split('@')[0] || 'Manager';
  const initials = initialsFrom(displayName);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [drawerOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  return (
    <>
      <header
        className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-white/[0.06]"
        style={{ background: NAV_BG }}
      >
        <div className="mx-auto flex h-full max-w-[1800px] min-w-0 items-center gap-2 px-3 md:gap-3 md:px-5">
          <Link
            href="/dashboard"
            className="flex min-h-[44px] shrink-0 items-center gap-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#36E7A1]"
            aria-label="Boom or Bust home"
          >
            <BobLogoMark />
            <span
              className="hidden text-white tracking-[0.06em] sm:block"
              style={{
                fontFamily: 'var(--font-display), "Bebas Neue", sans-serif',
                fontSize: 20,
                lineHeight: 1,
              }}
            >
              BOOM OR BUST
            </span>
          </Link>

          <nav
            className="mx-auto hidden h-full min-w-0 flex-1 items-center justify-center gap-0 lg:flex"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => (
              <DesktopNavLink
                key={`${link.label}-${link.href}`}
                href={link.href}
                label={link.label}
                active={isLinkActive(pathname, link.href, link.exact)}
              />
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 lg:ml-0">
            <SyncButton />
            <div className="flex items-center [&_button]:h-10 [&_button]:w-10 [&_button]:min-h-[44px] [&_button]:min-w-[44px] [&_svg]:!h-5 [&_svg]:!w-5">
              <NotificationBell />
            </div>
            <NavEmpireWidget />
            <div className="hidden sm:block">
              <UserAccountMenu displayName={displayName} initials={initials} onSignOut={handleSignOut} tierBadge={tierBadge} />
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="flex h-10 w-10 min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-[#94a3b8] hover:bg-white/[0.04] hover:text-white lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={20} strokeWidth={2} />
            </button>
          </div>
        </div>
      </header>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathname={pathname}
        displayName={displayName}
        initials={initials}
        onSignOut={handleSignOut}
      />
    </>
  );
}
