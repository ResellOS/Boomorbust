'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, HelpCircle } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Trade Hub', href: '/trade' },
  { label: 'Player Hub', href: '/players' },
  { label: 'Start / Sit', href: '/startsit' },
  { label: 'League Detail', href: null, active: true },
  { label: 'Draft Room', href: '/dashboard/rookies' },
  { label: 'More ▾', href: '/settings' },
];

export default function LeagueDetailTopBar() {
  const pathname = usePathname() ?? '';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-5">
      <div className="flex items-center">
        <div className="mr-7">
          <Image
            src="/logo.png"
            alt="Boom or Bust"
            width={140}
            height={36}
            unoptimized
            className="h-9 w-auto object-contain"
            style={{
              mixBlendMode: 'screen',
              filter: 'brightness(1.2) saturate(1.3) contrast(1.1)',
            }}
          />
        </div>
        <nav className="flex h-14 items-stretch">
          {NAV.map((item) => {
            const active =
              item.active ||
              (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
            const className = `flex items-center whitespace-nowrap border-b-2 px-3.5 text-xs ${
              active
                ? 'border-boom text-boom'
                : 'border-transparent text-muted hover:text-text'
            }`;
            if (!item.href) {
              return (
                <span key={item.label} className={className}>
                  {item.label}
                </span>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={`${className} no-underline`}>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface2 text-muted"
          aria-label="Notifications"
        >
          <Bell className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface2 text-muted"
          aria-label="Help"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
        <div className="flex h-[30px] cursor-pointer items-center gap-1.5 rounded-[5px] border border-border bg-surface2 px-2.5 text-[12px] text-text">
          <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-boom text-[9px] font-bold text-bg">
            D
          </div>
          @DynastyChampion ▾
        </div>
      </div>
    </header>
  );
}
