'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';

export type ContentionStatus = 'CONTENDING' | 'REBUILDING' | 'TRANSITIONING';

export interface LeagueSidebarRow {
  id: string;
  name: string;
  season: string;
  wins: number;
  losses: number;
  contention: ContentionStatus;
}

function deriveContention(wins: number, losses: number): ContentionStatus {
  const games = wins + losses;
  if (games < 1) return 'TRANSITIONING';
  const pct = wins / games;
  if (pct >= 0.55) return 'CONTENDING';
  if (pct <= 0.38) return 'REBUILDING';
  return 'TRANSITIONING';
}

const CONTENTION_STYLES: Record<
  ContentionStatus,
  { bg: string; border: string; text: string }
> = {
  CONTENDING: {
    bg: 'rgba(54,231,161,0.14)',
    border: 'rgba(54,231,161,0.45)',
    text: '#36E7A1',
  },
  REBUILDING: {
    bg: 'rgba(167,139,250,0.12)',
    border: 'rgba(167,139,250,0.42)',
    text: '#A78BFA',
  },
  TRANSITIONING: {
    bg: 'rgba(251,191,36,0.12)',
    border: 'rgba(251,191,36,0.4)',
    text: '#FBBF24',
  },
};

function readRecord(settings: Record<string, unknown> | null | undefined): { wins: number; losses: number } {
  if (!settings || typeof settings !== 'object') return { wins: 0, losses: 0 };
  const w = Number(settings.wins);
  const l = Number(settings.losses);
  return {
    wins: Number.isFinite(w) ? w : 0,
    losses: Number.isFinite(l) ? l : 0,
  };
}

interface LeagueSidebarProps {
  /** Grid / flex placement (e.g. `col-span-12 lg:col-span-2 lg:order-2`). */
  className?: string;
}

export default function LeagueSidebar({ className = '' }: LeagueSidebarProps) {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  const setActiveLeagueId = useDashboardLeagueStore((s) => s.setActiveLeagueId);

  const [rows, setRows] = useState<LeagueSidebarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [{ data: profile }, { data: leagueRows, error: lgErr }] = await Promise.all([
      supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
      supabase.from('leagues').select('id,name,season').eq('user_id', user.id).order('name', { ascending: true }),
    ]);

    if (lgErr) {
      setError(lgErr.message);
      setRows([]);
      setLoading(false);
      return;
    }

    const leagues = leagueRows ?? [];
    const ownerSid = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;
    const leagueIds = leagues.map((l) => l.id);

    const rosterMap = new Map<string, { wins: number; losses: number }>();
    if (ownerSid && leagueIds.length) {
      const { data: rosterRows } = await supabase
        .from('rosters')
        .select('league_id,owner_id,settings')
        .in('league_id', leagueIds);

      for (const r of rosterRows ?? []) {
        if (String(r.owner_id ?? '') !== ownerSid) continue;
        const rec = readRecord(r.settings as Record<string, unknown> | null);
        rosterMap.set(r.league_id, rec);
      }
    }

    const built: LeagueSidebarRow[] = leagues.map((lg) => {
      const rec = rosterMap.get(lg.id) ?? { wins: 0, losses: 0 };
      return {
        id: lg.id,
        name: lg.name ?? 'League',
        season: String(lg.season ?? ''),
        wins: rec.wins,
        losses: rec.losses,
        contention: deriveContention(rec.wins, rec.losses),
      };
    });

    setRows(built);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const activeName = useMemo(() => rows.find((r) => r.id === activeLeagueId)?.name ?? null, [rows, activeLeagueId]);

  const selectLeague = (id: string) => {
    setActiveLeagueId(id);
    setMobileOpen(false);
  };

  const list = (
    <div className="flex flex-col gap-2 p-2 lg:p-0">
      <div className="flex items-center justify-between px-1 lg:px-0">
        <h2 className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 font-mono-tactical">
          Leagues
        </h2>
      </div>
      {loading ? (
        <div className="space-y-2 px-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-white/[0.04] skeleton border border-white/[0.06]" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[10px] text-red-400/90 px-1 font-mono-tactical">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-[10px] text-slate-500 px-1 font-mono-tactical">No leagues synced.</p>
      ) : (
        <ul className="slim-scroll flex max-h-[min(60vh,420px)] flex-col gap-2 overflow-y-auto pr-0.5 lg:max-h-[calc(100vh-8rem)]">
          {rows.map((lg) => {
            const active = activeLeagueId === lg.id;
            const cs = CONTENTION_STYLES[lg.contention];
            return (
              <li key={lg.id}>
                <button
                  type="button"
                  onClick={() => selectLeague(lg.id)}
                  className={clsx(
                    'w-full rounded-xl border text-left transition-all duration-200',
                    'bg-[rgba(8,12,17,0.55)] backdrop-blur-md px-3 py-2.5',
                    active
                      ? 'border-[rgba(34,211,238,0.45)] shadow-[0_0_0_1px_rgba(34,211,238,0.25),0_0_20px_rgba(34,211,238,0.12)]'
                      : 'border-white/[0.08] hover:border-white/[0.14] hover:bg-white/[0.03]',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 truncate text-[12px] font-bold uppercase tracking-tight text-white">
                      {lg.name}
                    </p>
                    {active ? <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#22D3EE]" aria-hidden /> : null}
                  </div>
                  <p className="mt-1 font-mono-tactical text-[11px] tabular-nums text-[#94A3B8]">
                    {lg.wins}-{lg.losses}
                    <span className="text-slate-600"> · </span>
                    <span className="text-[9px] text-slate-600">{lg.season}</span>
                  </p>
                  <span
                    className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono-tactical"
                    style={{
                      background: cs.bg,
                      borderColor: cs.border,
                      color: cs.text,
                    }}
                  >
                    {lg.contention}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {/* Mobile: trigger */}
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-[rgba(6,9,16,0.85)] px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-w-0 flex-1 items-center justify-between rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-left active:scale-[0.99]"
        >
          <span className="truncate text-[11px] font-bold uppercase tracking-wide text-white">
            {activeName ?? 'Select league'}
          </span>
          <PanelRightOpen className="h-4 w-4 shrink-0 text-[#22D3EE]" aria-hidden />
        </button>
      </div>

      {/* Mobile drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-[60] lg:hidden',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={clsx(
            'absolute inset-0 bg-black/60 transition-opacity',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileOpen(false)}
          aria-label="Close overlay"
        />
        <aside
          className={clsx(
            'absolute right-0 top-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-white/[0.1] bg-[#0a0d14] shadow-2xl transition-transform duration-200 ease-out',
            mobileOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Your leagues</span>
            <button
              type="button"
              className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white"
              onClick={() => setMobileOpen(false)}
              aria-label="Close"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
          {list}
        </aside>
      </div>

      {/* Desktop: sticky column */}
      <aside className="hidden lg:flex lg:flex-1 lg:flex-col lg:min-h-0">
        <div
          className={clsx(
            'glass-panel flex flex-col overflow-hidden rounded-xl border border-white/[0.1]',
            'lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)]',
          )}
        >
          {list}
        </div>
      </aside>
    </div>
  );
}
