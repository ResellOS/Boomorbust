'use client';

import { useEffect, useRef, useState } from 'react';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { TradeHubStatsPayload } from '@/components/trade-hub/types';
import TradeHubPageHeader from '@/components/trade-hub/TradeHubPageHeader';
import TradeHubStatsBar from '@/components/trade-hub/TradeHubStatsBar';
import TradeTabs from '@/components/trade-hub/TradeTabs';
import { TradeOfferSelectionProvider } from '@/components/trade-hub/TradeOfferSelectionContext';

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
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#0a0d14]">
      <div className="mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-6 sm:py-6">
        <TradeHubPageHeader />

        {error ? (
          <p className="text-sm text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {error}
          </p>
        ) : null}

        <TradeHubStatsBar stats={stats} loading={loading} />

        <TradeOfferSelectionProvider>
          <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Trade Hub tabs">
            <TradeTabs stats={stats} statsLoading={loading} />
          </section>
        </TradeOfferSelectionProvider>
      </div>
    </div>
  );
}
