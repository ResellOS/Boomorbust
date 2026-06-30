'use client';

import Link from 'next/link';
import type { LeagueRow } from '@/lib/league/types';
import { leagueBadge } from '@/lib/league/utils';

interface LeagueDetailSidebarProps {
  leagues: LeagueRow[];
  activeLeagueId: string;
}

const QUICK_ACTIONS = [
  { icon: '🔍', label: 'Trade Finder', href: '/trade' },
  { icon: '📋', label: 'Waiver Wire', href: '/dashboard' },
  { icon: '⚖', label: 'Trade Analyzer', href: '/trade' },
  { icon: '▶', label: 'Start / Sit Optimizer', href: '/startsit' },
  { icon: '📝', label: 'Mock Draft', href: '/dashboard/rookies' },
  { icon: '💬', label: 'Dynasty Coach', href: '/dashboard/coach' },
];

export default function LeagueDetailSidebar({
  leagues,
  activeLeagueId,
}: LeagueDetailSidebarProps) {
  return (
    <aside className="flex w-[210px] shrink-0 flex-col overflow-y-auto border-r border-border bg-surface">
      <div className="flex items-center justify-between px-3 pb-1.5 pt-2.5">
        <div className="text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
          My Leagues
        </div>
        <Link href="/settings" className="text-xs text-muted no-underline hover:text-text">
          ⚙
        </Link>
      </div>
      {leagues.map((league) => {
        const badge = leagueBadge(league.status, league.league_type);
        const active = league.id === activeLeagueId;
        const dot = badge === 'Contender' ? '#36E7A1' : '#A78BFA';
        return (
          <Link
            key={league.id}
            href={`/leagues/${league.id}`}
            className={`flex items-center gap-2 px-3 py-1.5 text-inherit no-underline transition-colors ${
              active
                ? 'border-l-2 border-l-boom bg-boom/[0.04]'
                : 'border-l-2 border-l-transparent hover:bg-white/[0.02]'
            }`}
          >
            <div className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: dot }} />
            <span className="flex-1 truncate text-xs text-text">{league.name}</span>
            <span
              className={`rounded-[3px] px-1.5 py-0.5 text-[9px] font-medium ${
                badge === 'Contender' ? 'bg-boom/10 text-boom' : 'bg-bust/10 text-bust'
              }`}
            >
              {badge}
            </span>
          </Link>
        );
      })}
      <Link
        href="/onboarding"
        className="mt-0.5 flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-muted no-underline hover:text-text"
      >
        ＋ Add League
      </Link>
      <div className="mx-3 my-1.5 h-px bg-border" />
      <div className="px-3 py-2.5">
        <div className="mb-2 text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
          Quick Actions
        </div>
        {QUICK_ACTIONS.map((a) => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-2 py-1.5 text-[12px] text-muted no-underline hover:text-text"
          >
            <span className="w-4 text-center text-[14px]">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
      <div className="mx-3 my-1.5 h-px bg-border" />
      <div className="m-3 rounded-md border border-boom/15 bg-gradient-to-br from-boom/[0.06] to-bust/[0.06] p-3">
        <div className="mb-2 text-[12px] font-semibold text-text">Unlock Full Power</div>
        {[
          'Advanced Trade Finder',
          'Full Player Profiles',
          'Deep Analytics Suite',
          'Priority Support',
          'Unlimited Leagues',
        ].map((f) => (
          <div key={f} className="mb-1 flex items-center gap-1.5 text-[11px] text-muted">
            <span className="text-[11px] text-boom">✓</span>
            {f}
          </div>
        ))}
        <Link
          href="/pricing"
          className="mt-2.5 block w-full rounded bg-boom py-2 text-center text-[12px] font-bold text-bg no-underline shadow-[0_0_12px_rgba(54,231,161,0.3)]"
        >
          Upgrade Now
        </Link>
      </div>
    </aside>
  );
}
