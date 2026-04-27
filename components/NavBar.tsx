'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

const NAV_LINKS: Array<{ href: string; label: string; badge?: string }> = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/picks', label: 'Picks' },
  { href: '/dashboard/portfolio', label: 'Portfolio' },
  { href: '/dashboard/lineup', label: 'Lineup' },
  { href: '/dashboard/trade', label: 'Trade' },
  { href: '/dashboard/trade/finder', label: 'Finder' },
  { href: '/dashboard/managers', label: 'Managers' },
  { href: '/dashboard/alerts', label: 'Alerts' },
  { href: '/dashboard/handcuffs', label: 'Handcuffs' },
  { href: '/dashboard/coach', label: 'Coach', badge: '✦' },
  { href: '/dashboard/wrapped', label: 'Wrapped' },
];

interface NavBarProps {
  email: string;
}

export default function NavBar({ email }: NavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const NavLink = ({ href, label, badge }: { href: string; label: string; badge?: string }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={clsx(
          'text-sm font-medium transition-colors flex items-center gap-1',
          active ? 'text-white' : 'text-[#94A3B8] hover:text-white'
        )}
      >
        {label}
        {badge && (
          <span className={clsx(
            'text-[10px] font-bold px-1 py-0.5 rounded',
            active ? 'text-[#6366F1]' : 'text-[#6366F1]/70'
          )}>
            {badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-[#1E293B] border-b border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        {/* Brand */}
        <div className="flex items-center gap-6 min-w-0">
          <Link href="/dashboard" className="flex items-center gap-1 shrink-0">
            <span className="text-white font-bold text-lg">The</span>
            <span className="text-[#6366F1] font-bold text-lg hidden sm:inline">Front Office</span>
          </Link>
          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-5 flex-wrap">
            {NAV_LINKS.map((l) => <NavLink key={l.href} {...l} />)}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[#94A3B8] text-sm hidden xl:block truncate max-w-[200px]">{email}</span>
          <Link
            href="/dashboard/settings"
            className="hidden lg:block text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
          >
            Settings
          </Link>
          <button
            onClick={handleSignOut}
            className="hidden lg:block text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
          >
            Sign out
          </button>
          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-[#94A3B8] hover:text-white p-1.5"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-30 bg-black/60" onClick={() => setOpen(false)}>
          <div
            className="absolute top-[61px] left-0 right-0 bg-[#1E293B] border-b border-white/10 px-6 py-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[#94A3B8] text-xs truncate">{email}</p>
            {NAV_LINKS.map((l) => <NavLink key={l.href} {...l} />)}
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="text-sm text-[#94A3B8] hover:text-white"
            >
              Settings
            </Link>
            <button onClick={handleSignOut} className="text-sm text-left text-[#94A3B8] hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
