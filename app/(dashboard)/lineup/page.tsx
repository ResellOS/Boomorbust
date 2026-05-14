'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { OptimalLineupData, LineupTabId } from '@/components/lineup/types';
import LineupStatsBar      from '@/components/lineup/LineupStatsBar';
import LineupTabNav        from '@/components/lineup/LineupTabNav';
import OptimalLineupTable  from '@/components/lineup/OptimalLineupTable';
import BoomBustBreakdown   from '@/components/lineup/BoomBustBreakdown';
import WeatherAlertsTab    from '@/components/lineup/WeatherAlertsTab';
import StartSitTab         from '@/components/lineup/StartSitTab';
import MatchupMatrixTab    from '@/components/lineup/MatchupMatrixTab';
import StatusBar           from '@/components/dashboard/StatusBar';

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#f87171' }}>
        {message}
      </span>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-lg text-sm font-medium ml-4 transition-opacity hover:opacity-80"
        style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        Retry
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function LineupOptimizerPage() {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);

  const [activeTab, setActiveTab] = useState<LineupTabId>('lineup');
  const [week, setWeek]           = useState<number>(1);
  const [data, setData]           = useState<OptimalLineupData | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (leagueId: string, w: number) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/lineup/optimal?leagueId=${encodeURIComponent(leagueId)}&week=${w}`,
        { signal: ctrl.signal },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json: OptimalLineupData = await res.json();
      setData(json);
      // Sync week from server response in case week was resolved automatically
      if (json.week && json.week !== w) setWeek(json.week);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message ?? 'Failed to load lineup data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeLeagueId) return;
    fetchData(activeLeagueId, week);
  }, [activeLeagueId, week, fetchData]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleWeekChange = (w: number) => {
    setWeek(w);
  };

  const handleRetry = () => {
    if (activeLeagueId) fetchData(activeLeagueId, week);
  };

  return (
    <div className="flex flex-col min-h-dvh pb-14" style={{ background: '#0a0d14', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6 space-y-4">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Lineup Optimizer</h1>
            <p className="text-[13px] text-slate-500 mt-0.5">Start smarter. Win more. Every week.</p>
          </div>
          {!activeLeagueId && (
            <p className="text-[12px] text-amber-400 mt-1 sm:mt-0">Select a league from the sidebar to load your lineup</p>
          )}
        </div>

        {/* Stats Bar */}
        <LineupStatsBar data={data} loading={loading} />

        {/* Error */}
        {error && <ErrorBanner message={error} onRetry={handleRetry} />}

        {/* Tab Nav */}
        <LineupTabNav active={activeTab} onChange={setActiveTab} />

        {/* Tab Content */}
        {activeTab === 'lineup' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_260px] gap-4 items-start">
            {/* Left: main table + bench + start/sit */}
            <div className="space-y-4 min-w-0">
              <OptimalLineupTable
                data={data}
                loading={loading}
                week={week}
                onWeekChange={handleWeekChange}
              />

              {/* Start/Sit inline below bench on the lineup tab */}
              {(data?.borderline?.length ?? 0) > 0 && !loading && (
                <StartSitTab players={data?.borderline ?? []} loading={loading} />
              )}
            </div>

            {/* Right sidebar: Bench breakdown + weather alerts */}
            <div className="space-y-4">
              <BoomBustBreakdown breakdown={data?.breakdown ?? null} loading={loading} />

              {/* Weather alerts compact */}
              {(data?.weatherAlerts?.length ?? 0) > 0 && !loading && (
                <div className="glass-card p-4">
                  <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-3">WEATHER ALERTS</h2>
                  <div className="space-y-3">
                    {(data?.weatherAlerts ?? []).slice(0, 3).map((alert, i) => {
                      const colorMap: Record<string, string> = {
                        RAIN: '#FBBF24', SNOW: '#93c5fd', WIND: '#9ca3af', CLEAR: '#36E7A1', DOME: '#36E7A1',
                      };
                      const color = colorMap[alert.icon] ?? '#36E7A1';
                      return (
                        <div key={i} className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-semibold text-white">{alert.game}</p>
                            <span className="text-[10px] font-bold" style={{ color }}>{alert.icon}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">{alert.stadium}</p>
                          <p className="text-[11px] text-slate-400">{alert.conditions}</p>
                          <p className="text-[10px]" style={{ color }}>Impact: {alert.impact}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'startsit' && (
          <StartSitTab players={data?.borderline ?? []} loading={loading} />
        )}

        {activeTab === 'matrix' && (
          <MatchupMatrixTab
            easiest={data?.matchupMatrix?.easiest ?? []}
            toughest={data?.matchupMatrix?.toughest ?? []}
            loading={loading}
          />
        )}

        {activeTab === 'weather' && (
          <WeatherAlertsTab
            alerts={data?.weatherAlerts ?? []}
            loading={loading}
          />
        )}
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}
