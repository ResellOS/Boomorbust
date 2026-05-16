'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { LeagueSummary, LeaguesListResponse } from '@/app/api/leagues/route';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOM = '#36E7A1';
const INACTIVE = '#94A3B8';
const BORDER_COLOR = 'rgba(255,255,255,0.06)';

// ─── League item ─────────────────────────────────────────────────────────────

function LeagueItem({
  id: _id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className="w-full text-left truncate px-3 py-2 rounded-r-lg transition-colors duration-100 leading-tight"
      style={{
        fontFamily: 'var(--font-body), Inter, sans-serif',
        fontSize: 14,
        color: active ? BOOM : INACTIVE,
        background: active ? 'rgba(6,78,59,0.25)' : 'transparent',
        borderLeft: active ? `2px solid ${BOOM}` : '2px solid transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = '#ffffff';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLButtonElement).style.color = INACTIVE;
        }
      }}
    >
      {label}
    </button>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SidebarSkeleton() {
  const rows = [5, 7, 6, 5, 8, 6, 5, 7, 6, 5];
  return (
    <div className="px-3 py-4 flex flex-col gap-1" aria-hidden aria-label="Loading leagues">
      <div className="h-8 w-full rounded animate-pulse bg-white/[0.06]" />
      {rows.map((w, i) => (
        <div
          key={i}
          className="h-8 rounded animate-pulse bg-white/[0.05]"
          style={{ width: `${w * 10}%` }}
        />
      ))}
    </div>
  );
}

// ─── LeagueSidebar ────────────────────────────────────────────────────────────

export interface LeagueSidebarProps {
  className?: string;
}

export default function LeagueSidebar({ className }: LeagueSidebarProps) {
  const activeLeagueId  = useDashboardLeagueStore((s) => s.activeLeagueId);
  const setActiveLeagueId = useDashboardLeagueStore((s) => s.setActiveLeagueId);
  const setLeagues = useDashboardLeagueStore((s) => s.setLeagues);

  const [myLeagues,    setMyLeagues]    = useState<LeagueSummary[]>([]);
  const [otherLeagues, setOtherLeagues] = useState<LeagueSummary[]>([]);
  const [loading,      setLoading]      = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/leagues', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as LeaguesListResponse;
        setMyLeagues(json.myLeagues ?? []);
        setOtherLeagues(json.otherLeagues ?? []);
        setLeagues([...(json.myLeagues ?? []), ...(json.otherLeagues ?? [])]);
      } catch {
        // Silent fail — sidebar shows empty state
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // 'all' (or null) = empire-level / all-leagues context
  const isAllActive = activeLeagueId === 'all' || activeLeagueId === null;

  return (
    /*
     * 200px fixed-width column, full height below 56px nav.
     * Hidden on mobile — leagues accessible via TopNav dropdown on small screens.
     */
    <aside
      className={`hidden lg:flex flex-col w-[200px] shrink-0 sticky top-14 h-[calc(100dvh-3.5rem)] overflow-y-auto ${className ?? ''}`}
      style={{
        borderRight: `1px solid ${BORDER_COLOR}`,
      }}
      aria-label="League selector"
    >
      {loading ? (
        <SidebarSkeleton />
      ) : (
        <div className="px-3 py-4 flex flex-col gap-0.5">

          {/* All Leagues */}
          <LeagueItem
            id="all"
            label="All Leagues"
            active={isAllActive}
            onClick={() => setActiveLeagueId('all')}
          />

          {/* All user leagues — flat list, no section headers */}
          {[...myLeagues, ...otherLeagues].map((lg) => (
            <LeagueItem
              key={lg.id}
              id={lg.id}
              label={lg.name}
              active={activeLeagueId === lg.id}
              onClick={() => setActiveLeagueId(lg.id)}
            />
          ))}

          {/* Empty state */}
          {myLeagues.length === 0 && otherLeagues.length === 0 && (
            <p
              className="px-3 text-[12px] text-slate-600 mt-4"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
            >
              No leagues found.
              <br />
              Sync via Onboarding.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
