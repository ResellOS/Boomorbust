'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  LayoutGrid,
  BarChart3,
  Sparkles,
  Globe,
  MoreHorizontal,
} from 'lucide-react';

const BORDER = '#1F2937';

export const DASHBOARD_RAIL_LINKS: Array<{ href: string; label: string; Icon: typeof LayoutDashboard }> = [
  { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/dashboard/trade', label: 'Trade Lab', Icon: ArrowLeftRight },
  { href: '/dashboard/lineup', label: 'Lineup', Icon: LayoutGrid },
  { href: '/dashboard/rankings', label: 'Rankings', Icon: BarChart3 },
  { href: '/dashboard/coach', label: 'Coach', Icon: Sparkles },
  { href: '/dashboard/mission-control', label: 'Mission Control', Icon: Globe },
  { href: '/dashboard/settings', label: 'More', Icon: MoreHorizontal },
];

export default function DashboardIconRail({ inline = false }: { inline?: boolean }) {
  const pathname = usePathname();

  const links = DASHBOARD_RAIL_LINKS.map(({ href, label, Icon }) => {
    const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
    return (
      <Link
        key={href}
        href={href}
        title={label}
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded border transition-colors',
          active
            ? 'border-[#22d3ee]/50 bg-[#22d3ee]/10 text-white shadow-[0_0_18px_rgba(34,211,238,0.2)]'
            : 'border-transparent text-[#64748b] hover:border-[#1F2937] hover:bg-white/[0.03] hover:text-[#94a3b8]'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 2} />
      </Link>
    );
  });

  if (inline) {
    return (
      <nav
        className="w-14 shrink-0 flex flex-col items-center gap-2 border-r py-4"
        style={{ background: '#06080D', borderColor: BORDER }}
        aria-label="Dashboard sections"
      >
        {links}
      </nav>
    );
  }

  return (
    <aside
      className="fixed bottom-0 left-0 top-[72px] z-[35] hidden w-16 shrink-0 flex-col items-center gap-2 border-r py-4 lg:flex"
      style={{ background: '#080A0F', borderColor: BORDER }}
      aria-label="Dashboard sections"
    >
      {links}
    </aside>
  );
}
