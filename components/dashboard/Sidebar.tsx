'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Users,
  Play,
  ShieldAlert,
  ClipboardList,
  Settings,
  type LucideIcon,
} from 'lucide-react';
import ConfidenceRing from '@/components/startsit/ConfidenceRing';

export interface League {
  id: string;
  name: string;
  league_type?: string | null;
  status?: string | null;
}

export interface RosterSnapshotItem {
  playerId: string;
  name: string;
  position: string;
  team: string;
  tfoScore: number;
}

export interface ExposureOverviewData {
  totalAssets: number;
  avgDynastyRating: number;
  boomRate: number;
}

export interface ExposureHealthData {
  score: number;
  label: 'Low Risk' | 'Moderate Risk' | 'High Risk';
  sub: string;
  pointerPct: number;
}

export interface WeekContextData {
  nflWeek: number;
  windowOpen: boolean;
  lockDeadline: string;
  weatherImpact: string;
}

interface SidebarProps {
  leagues: League[];
  rosterSnapshot?: RosterSnapshotItem[];
  exposureOverview?: ExposureOverviewData;
  exposureHealth?: ExposureHealthData;
  weekContext?: WeekContextData;
  bobConfidence?: number;
}

const NAV_ITEMS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Trade Hub', href: '/trade', icon: ArrowLeftRight },
  { label: 'Player Hub', href: '/players', icon: Users },
  { label: 'Start / Sit', href: '/startsit', icon: Play },
  { label: 'Draft Room', href: '/draft', icon: ClipboardList },
  { label: 'Exposure', href: '/exposure', icon: ShieldAlert },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

const LEAGUE_DOTS = ['#36E7A1', '#A78BFA'] as const;

function cleanLeagueName(name: string): string {
  return name.replace(/\s*(Contender|Rebuild|Redraft)\s*$/i, '').trim();
}

function leagueTag(
  league: League,
  index: number,
): { label: string; variant: 'contender' | 'rebuild' | 'redraft' } {
  const type = (league.league_type ?? '').toLowerCase();
  const status = (league.status ?? '').toLowerCase();
  if (type.includes('redraft') || type.includes('best_ball') || status.includes('redraft')) {
    return { label: 'Redraft', variant: 'redraft' };
  }
  if (status.includes('rebuild') || index % 2 === 1) {
    return { label: 'Rebuild', variant: 'rebuild' };
  }
  return { label: 'Contender', variant: 'contender' };
}

function healthLabelColor(label: ExposureHealthData['label']): string {
  if (label === 'Low Risk') return 'text-boom';
  if (label === 'Moderate Risk') return 'text-hold';
  return 'text-[#ef4444]';
}

export default function Sidebar({
  leagues,
  rosterSnapshot,
  exposureOverview,
  exposureHealth,
  weekContext,
  bobConfidence,
}: SidebarProps) {
  const pathname = usePathname() ?? '';

  return (
    <aside className="row-start-2 flex flex-col overflow-hidden border-r border-border bg-surface">
      <nav className="shrink-0 border-b border-border py-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-[10px] py-[7px] pl-[13px] pr-[15px] no-underline transition-colors ${
                active ? 'text-boom' : 'text-muted hover:text-white'
              }`}
              style={{ borderLeft: `2px solid ${active ? '#36E7A1' : 'transparent'}` }}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              <span className="font-figtree text-[12px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="shrink-0 px-[15px] pb-[3px] pt-[11px] font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
        My Leagues
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leagues.map((league, i) => {
          const tag = leagueTag(league, i);
          const dotColor =
            tag.variant === 'contender'
              ? LEAGUE_DOTS[0]
              : tag.variant === 'rebuild'
                ? LEAGUE_DOTS[1]
                : '#6b7a99';
          const displayName = cleanLeagueName(league.name);
          return (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="grid grid-cols-[7px_1fr_auto] items-center gap-x-[9px] px-[15px] py-[7px] text-inherit no-underline transition-colors hover:bg-white/[0.025]"
            >
              <div
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: dotColor }}
              />
              <span className="min-w-0 truncate font-figtree text-[12.5px] font-medium">
                {displayName}
              </span>
              <span
                aria-label={`${displayName} ${tag.label}`}
                className={`ml-1 shrink-0 whitespace-nowrap rounded-[3px] px-[7px] py-0.5 font-mono text-[8px] font-bold ${
                  tag.variant === 'contender'
                    ? 'bg-boom/10 text-boom'
                    : tag.variant === 'rebuild'
                      ? 'bg-bust/10 text-bust'
                      : 'bg-muted/10 text-muted'
                }`}
              >
                {tag.label}
              </span>
            </Link>
          );
        })}
      </div>
      {weekContext && (
        <>
          <div className="shrink-0 border-t border-border px-3 pb-1 pt-2.5">
            <div className="mb-1.5 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
              Week {weekContext.nflWeek} Context
            </div>
            <div className="flex items-center justify-between px-3 py-1 text-[10px]">
              <span className="text-muted">NFL Week</span>
              <span className="text-text">{weekContext.nflWeek}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1 text-[10px]">
              <span className="text-muted">Start/Sit Window</span>
              <span className={weekContext.windowOpen ? 'text-boom' : 'text-hold'}>
                {weekContext.windowOpen ? 'Open' : 'Locked'}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-1 text-[10px]">
              <span className="text-muted">Lock Deadline</span>
              <span className="text-hold">{weekContext.lockDeadline}</span>
            </div>
            <div className="flex items-center justify-between px-3 py-1 text-[10px]">
              <span className="text-muted">Weather Impact</span>
              <span className="text-boom">{weekContext.weatherImpact}</span>
            </div>
            <Link
              href="/matchups"
              className="flex items-center gap-1 px-3 py-2 text-[10px] text-boom no-underline hover:underline"
            >
              View Matchup Matrix →
            </Link>
          </div>
          {typeof bobConfidence === 'number' && (
            <div className="shrink-0 border-t border-border px-3 py-2.5">
              <div className="mb-1 text-[8px] font-medium uppercase tracking-[1.5px] text-muted">
                BOB Confidence Score
              </div>
              <ConfidenceRing pct={bobConfidence} />
              <div className="mt-1.5 text-center text-[9px] leading-snug text-muted">
                10,000+ decisions analyzed
                <br />
                Updated every 60 seconds
              </div>
            </div>
          )}
        </>
      )}
      {exposureOverview && (
        <>
          <div className="shrink-0 border-t border-border px-[14px] pb-1 pt-2.5">
            <div className="mb-2 font-figtree text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
              Portfolio Overview
            </div>
            <div className="grid gap-[7px] pb-2.5">
              <div className="rounded-[5px] border border-border bg-[#080d14] px-[11px] py-[9px]">
                <div className="mb-[3px] text-[9px] uppercase tracking-[0.8px] text-muted">
                  Total Assets
                </div>
                <div className="font-mono text-[15px] text-text">
                  {exposureOverview.totalAssets}{' '}
                  <span className="font-figtree text-[10px] text-muted">players</span>
                </div>
              </div>
              <div className="rounded-[5px] border border-border bg-[#080d14] px-[11px] py-[9px]">
                <div className="mb-[3px] text-[9px] uppercase tracking-[0.8px] text-muted">
                  Avg Dynasty Rating
                </div>
                <div className="font-mono text-[15px] text-boom">
                  {exposureOverview.avgDynastyRating.toFixed(1)}
                </div>
              </div>
              <div className="rounded-[5px] border border-border bg-[#080d14] px-[11px] py-[9px]">
                <div className="mb-[3px] text-[9px] uppercase tracking-[0.8px] text-muted">
                  Boom Rate
                </div>
                <div className="font-mono text-[15px] text-boom">
                  {exposureOverview.boomRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
          {exposureHealth && (
            <div className="shrink-0 border-t border-border px-[14px] pb-3.5">
              <div className="mb-2 font-figtree text-[9px] font-medium uppercase tracking-[1.5px] text-muted">
                Exposure Health
              </div>
              <div
                className={`mb-[7px] text-xs font-medium ${healthLabelColor(exposureHealth.label)}`}
              >
                {exposureHealth.label}
              </div>
              <div className="relative mb-1.5 h-1.5 overflow-visible rounded-[3px] bg-border">
                <div
                  className="h-full rounded-[3px]"
                  style={{
                    width: '100%',
                    background:
                      'linear-gradient(90deg, #36E7A1 0%, #FBBF24 55%, #ef4444 100%)',
                  }}
                />
                <div
                  className="absolute top-[-4px] h-3.5 w-0.5 rounded-[1px] bg-text"
                  style={{
                    left: `${exposureHealth.pointerPct}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>
              <div className="text-[10px] text-muted">{exposureHealth.sub}</div>
            </div>
          )}
        </>
      )}
      {rosterSnapshot && rosterSnapshot.length > 0 && (
        <div className="shrink-0 border-t border-border px-[15px] py-2.5">
          <div className="mb-2 font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
            My Roster Snapshot
          </div>
          <div className="flex flex-col gap-1.5">
            {rosterSnapshot.map((p) => (
              <Link
                key={p.playerId}
                href={`/players?player=${p.playerId}`}
                className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-surface2/50 px-2 py-1.5 text-inherit no-underline transition-colors hover:bg-white/[0.03]"
              >
                <div className="min-w-0">
                  <div className="truncate font-figtree text-[11px] text-text">{p.name}</div>
                  <div className="font-mono text-[8px] text-muted">
                    {p.position} · {p.team}
                  </div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-boom">
                  {p.tfoScore.toFixed(1)}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {!exposureOverview && !weekContext && (
      <div className="mx-2.5 mb-[5px] mt-2 shrink-0 rounded-[7px] border border-muted/15 bg-boom/[0.018] p-[9px] text-center">
        <div className="mb-1 font-mono text-[7px] uppercase tracking-[2px] text-muted/40">
          Sponsored
        </div>
        <div className="font-figtree text-lg font-extrabold tracking-wide text-boom/50">
          UNDERDOG
        </div>
        <div className="mt-0.5 font-mono text-[7px] text-muted/40">Best Ball · $100K Prizes</div>
      </div>
      )}
      {!exposureOverview && !weekContext && (
      <div className="mx-2.5 mb-2.5 shrink-0 rounded-lg border border-bust/25 bg-gradient-to-br from-bust/[0.08] to-boom/[0.04] p-3">
        <div className="mb-2 font-figtree text-xs font-extrabold uppercase tracking-wide text-text">
          Unlock Full Power
        </div>
        {[
          'Advanced Trade Finder',
          'Full Player Profiles',
          'Deep Analytics Suite',
          'Priority Support',
          'Unlimited Leagues',
        ].map((feature) => (
          <div
            key={feature}
            className="mb-1 flex items-center gap-2 font-figtree text-[11px] text-muted"
          >
            <div className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-boom/40 bg-boom/15 text-[9px] text-boom">
              ✓
            </div>
            {feature}
          </div>
        ))}
        <Link
          href="/pricing"
          className="mt-[9px] block w-full rounded-md bg-boom py-[9px] text-center font-figtree text-xs font-extrabold uppercase tracking-wide text-bg no-underline"
        >
          Upgrade Now
        </Link>
      </div>
      )}
    </aside>
  );
}
