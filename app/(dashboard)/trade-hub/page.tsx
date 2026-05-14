'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { TradeHubStatsPayload } from '@/components/trade-hub/types';
import TradeHubPageHeader from '@/components/trade-hub/TradeHubPageHeader';
import TradeHubStatsBar from '@/components/trade-hub/TradeHubStatsBar';
import TradeTabs from '@/components/trade-hub/TradeTabs';

export default function TradeHubPage() {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  const [stats, setStats] = useState<TradeHubStatsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    const c = new AbortController();
    abortRef.current = c;
    setLoading(true);
    setError(null);

    const leagueParam =
      activeLeagueId && activeLeagueId !== 'all'
        ? `?league_id=${encodeURIComponent(activeLeagueId)}`
        : '';

    (async () => {
      try {
        const res = await fetch(`/api/trades/stats${leagueParam}`, {
          credentials: 'include',
          signal: c.signal,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as TradeHubStatsPayload;
        if (!c.signal.aborted) setStats(json);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        if (!c.signal.aborted) {
          setError((e as Error).message ?? 'Failed to load stats');
          setStats(null);
        }
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    })();

    return () => c.abort();
  }, [activeLeagueId]);

  return (
    <div className="min-h-[calc(100dvh-3.5rem)]" style={{ background: '#0a0d14' }}>
      <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 md:px-6">
        <TradeHubPageHeader />

        {error ? (
          <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {error}
          </p>
        ) : null}

        <TradeHubStatsBar stats={stats} loading={loading} />

        <TradeTabs />
      </div>
    </div>
  );
}
