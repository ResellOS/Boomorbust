'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/trade', label: 'Trade Hub' },
  { href: '/players', label: 'Players' },
  { href: '/startsit', label: 'Start/Sit' },
  { href: '/draft', label: 'Draft Room' },
  { href: '/exposure', label: 'Exposure' },
  { href: '/performance', label: 'BOB Record' },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface AppTopNavProps {
  username?: string;
  avatarUrl?: string | null;
}

export default function AppTopNav({ username, avatarUrl }: AppTopNavProps) {
  const pathname = usePathname() ?? '';
  const displayName = username?.replace(/^@/, '') || 'Manager';

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-white/10 bg-[#0a0d14]/95 px-4 backdrop-blur-xl md:px-6"
    >
      <Link href="/dashboard" className="flex shrink-0 items-center">
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={120}
          height={34}
          unoptimized
          className="h-8 w-auto object-contain"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.15) saturate(1.2)',
          }}
        />
      </Link>

      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-hide lg:flex">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors',
                active
                  ? 'bg-boom/10 text-boom'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-white',
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <Link
          href="/settings"
          className={clsx(
            'hidden rounded-lg px-3 py-1.5 text-[12px] font-medium sm:inline-flex',
            isActive(pathname, '/settings')
              ? 'bg-boom/10 text-boom'
              : 'text-slate-400 hover:text-white',
          )}
        >
          Settings
        </Link>
        <div className="flex items-center gap-2">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full border border-white/15 object-cover"
            />
          ) : (
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full border border-[#A78BFA]/40 bg-[#A78BFA]/15 text-[11px] font-bold text-[#A78BFA]"
            >
              {displayName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="hidden max-w-[120px] truncate font-mono text-[12px] text-white sm:block">
            @{displayName}
          </span>
        </div>
      </div>
    </header>
  );
}
