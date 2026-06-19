'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  ArrowLeftRight,
  Users,
  Play,
  MoreHorizontal,
  ClipboardList,
  ShieldAlert,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';

const PRIMARY_TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { href: '/trade', label: 'Trade', icon: ArrowLeftRight },
  { href: '/players', label: 'Players', icon: Users },
  { href: '/startsit', label: 'Start/Sit', icon: Play },
] as const;

const MORE_LINKS = [
  { href: '/draft', label: 'Draft Room', icon: ClipboardList },
  { href: '/exposure', label: 'Exposure', icon: ShieldAlert },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMoreActive(pathname: string): boolean {
  return MORE_LINKS.some((l) => isActive(pathname, l.href));
}

export default function MobileTabBar() {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSheetOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }, [router]);

  return (
    <>
      {sheetOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="md:hidden fixed inset-0 z-[60] bg-black/55"
          onClick={() => setSheetOpen(false)}
        />
      ) : null}

      <div
        className={clsx(
          'md:hidden fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border-t border-white/10 transition-transform duration-300 ease-out',
          sheetOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none',
        )}
        style={{
          background: 'rgba(10,13,20,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">More</span>
          <button
            type="button"
            onClick={() => setSheetOpen(false)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-3">
          {MORE_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setSheetOpen(false)}
              className={clsx(
                'flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-figtree text-[14px] transition-colors',
                isActive(pathname, href)
                  ? 'bg-boom/10 text-boom'
                  : 'text-text hover:bg-white/[0.04]',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 font-figtree text-[14px] text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" strokeWidth={2} />
            Log Out
          </button>
        </nav>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch justify-around border-t border-white/[0.08] px-1 pt-1"
        style={{
          background: 'rgba(6,9,16,0.96)',
          backdropFilter: 'blur(16px)',
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
        aria-label="Primary navigation"
      >
        {PRIMARY_TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1"
              style={{ color: active ? '#36E7A1' : '#64748b' }}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
              <span className="w-full truncate text-center font-mono text-[9px] uppercase tracking-[0.04em]">
                {label}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSheetOpen((v) => !v)}
          className={clsx(
            'flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors',
            sheetOpen || isMoreActive(pathname) ? 'text-[#36E7A1]' : 'text-[#64748b]',
          )}
          aria-label={sheetOpen ? 'Close more menu' : 'Open more menu'}
          aria-expanded={sheetOpen}
        >
          <MoreHorizontal className="h-5 w-5 shrink-0" strokeWidth={sheetOpen || isMoreActive(pathname) ? 2.5 : 2} />
          <span className="font-mono text-[9px] uppercase tracking-[0.04em]">More</span>
        </button>
      </nav>
    </>
  );
}
