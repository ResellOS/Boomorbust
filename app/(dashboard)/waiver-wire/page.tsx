'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { WaiverRadarData, WaiverTabId, WaiverPosition, WaiverScoring } from '@/components/waiver/types';

import WaiverStatsBar      from '@/components/waiver/WaiverStatsBar';
import WaiverTabNav        from '@/components/waiver/WaiverTabNav';
import WaiverFilterBar     from '@/components/waiver/WaiverFilterBar';
import RankedPickupsTable  from '@/components/waiver/RankedPickupsTable';
import RosterGapsPanel     from '@/components/waiver/RosterGapsPanel';
import TrendingAddsTab     from '@/components/waiver/TrendingAddsTab';
import PositionalNeedsTab  from '@/components/waiver/PositionalNeedsTab';
import WhyTheseCards       from '@/components/waiver/WhyTheseCards';
import RecentActivityFeed  from '@/components/waiver/RecentActivityFeed';
import WaiverStatusBar     from '@/components/waiver/WaiverStatusBar';
import HandcuffTracker     from '@/components/waiver/HandcuffTracker';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl mb-4"
      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
    >
      <span style={{ fontSize: 13, color: '#f87171' }}>{message}</span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WaiverWirePage() {
  const storeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);

  const [activeTab, setActiveTab]       = useState<WaiverTabId>('wire');
  const [position, setPosition]         = useState<WaiverPosition>('ALL');
  const [scoring, setScoring]           = useState<WaiverScoring>('PPR');
  const [filterLeagueId, setFilterLeague] = useState<string | null>(null);

  const [data, setData]       = useState<WaiverRadarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Derive the active leagueId: filter bar overrides sidebar selection
  const activeLeagueId = filterLeagueId ?? storeLeagueId;

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (lid: string | null, pos: WaiverPosition, sc: WaiverScoring) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ position: pos, scoring: sc });
      if (lid) params.set('leagueId', lid);
      const res = await fetch(`/api/waiver/radar?${params.toString()}`, { signal: ctrl.signal });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message ?? 'Failed to load waiver data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeLeagueId, position, scoring);
  }, [activeLeagueId, position, scoring, fetchData]);

  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  // Build a simple league list for the filter bar from any existing data
  // We use the leagues from the Supabase store if available; fall back to empty
  const leagueList: Array<{ id: string; name: string }> = [];

  return (
    <div className="flex flex-col min-h-dvh pb-16" style={{ background: '#0a0d14', fontFamily: 'var(--font-body), Inter, sans-serif' }}>
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-6 space-y-4">

        {/* Page header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Waiver Wire</h1>
          <p className="text-[14px] text-slate-500 mt-0.5">Find value before your league mates do.</p>
        </div>

        {/* Stats bar */}
        <WaiverStatsBar data={data} loading={loading} />

        {/* Error */}
        {error && <ErrorBanner message={error} onRetry={() => fetchData(activeLeagueId, position, scoring)} />}

        {/* Tab nav */}
        <WaiverTabNav active={activeTab} onChange={setActiveTab} />

        {/* Filter bar — shown on all tabs */}
        <WaiverFilterBar
          leagues={leagueList}
          activeLeagueId={filterLeagueId}
          position={position}
          scoring={scoring}
          onLeagueChange={setFilterLeague}
          onPositionChange={setPosition}
          onScoringChange={setScoring}
        />

        {/* ── WAIVER WIRE tab ─────────────────────────────────────────────────── */}
        {activeTab === 'wire' && (
          <div className="space-y-4">
            {/* Main 2-column layout */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
              {/* Left: ranked targets */}
              <RankedPickupsTable
                players={data?.players ?? []}
                loading={loading}
                total={data?.availableCount ?? 0}
              />

              {/* Right: roster gaps + trending adds */}
              <RosterGapsPanel
                gaps={data?.rosterGaps ?? []}
                trending={data?.trendingAdds ?? []}
                loading={loading}
              />
            </div>

            {/* Why these players */}
            <WhyTheseCards />

            {/* Recent activity */}
            <RecentActivityFeed
              activity={data?.recentActivity ?? []}
              loading={loading}
            />
          </div>
        )}

        {/* ── TRENDING ADDS tab ───────────────────────────────────────────────── */}
        {activeTab === 'trending' && (
          <TrendingAddsTab
            trending={data?.trendingAdds ?? []}
            loading={loading}
          />
        )}

        {/* ── ROSTER GAPS tab ─────────────────────────────────────────────────── */}
        {activeTab === 'gaps' && (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-4 items-start">
            <div className="glass-card overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.08]">
                <h2 className="text-[14px] font-bold text-white tracking-wide">ROSTER GAPS — DETAILED VIEW</h2>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead>
                  <tr className="border-b border-white/[0.08]">
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">POSITION</th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">NEED LEVEL</th>
                    <th className="px-4 py-2 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">AVAILABLE IMPACT</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.rosterGaps ?? []).map((g) => {
                    const color = g.needLevel === 'High' ? '#EF4444' : g.needLevel === 'Medium' ? '#FBBF24' : '#36E7A1';
                    return (
                      <tr key={g.position} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-[15px] font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{g.position}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-semibold" style={{ color }}>{g.needLevel}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-[14px] font-mono font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{g.availableImpact}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </div>
            <RosterGapsPanel
              gaps={data?.rosterGaps ?? []}
              trending={data?.trendingAdds ?? []}
              loading={loading}
            />
          </div>
        )}

        {/* ── POSITIONAL NEEDS tab ────────────────────────────────────────────── */}
        {activeTab === 'needs' && (
          <PositionalNeedsTab
            gaps={data?.rosterGaps ?? []}
            needs={data?.positionalNeeds ?? []}
            loading={loading}
          />
        )}

        {/* ── HANDCUFF TRACKER tab ────────────────────────────────────────────── */}
        {activeTab === 'handcuffs' && (
          <HandcuffTracker leagueId={activeLeagueId} />
        )}
      </div>

      {/* Bottom status bar */}
      <WaiverStatusBar data={data} loading={loading} />
    </div>
  );
}
