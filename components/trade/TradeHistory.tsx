'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatTimeAgo } from '@/lib/utils/format';

// Trade History panel — completed league trades from /api/trade-history, with
// league / period / type filters and Load More pagination. Shows an empty state
// when there's no history (league_transactions is engine-populated).

interface Asset {
  id: string;
  name: string;
  position: string | null;
}
interface TradeRow {
  id: string;
  leagueId: string;
  leagueName: string;
  createdAt: string | null;
  status: string | null;
  scoringType: string | null;
  assetsSent: Asset[];
  assetsReceived: Asset[];
}

type Period = 'week' | 'month' | 'season';
type TypeFilter = 'all' | 'mine' | 'league';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'season', label: 'This Season' },
];
const TYPES: { key: TypeFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'mine', label: 'Your Trades' },
  { key: 'league', label: 'League Trades' },
];

const selectCls =
  'rounded-[5px] border border-border bg-surface px-2.5 py-[5px] font-figtree text-[11px] text-text outline-none';

export default function TradeHistory({ leagues }: { leagues: { id: string; name: string }[] }) {
  const [leagueId, setLeagueId] = useState('all');
  const [period, setPeriod] = useState<Period>('season');
  const [type, setType] = useState<TypeFilter>('all');
  const [rows, setRows] = useState<TradeRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          league_id: leagueId,
          period,
          type,
          page: String(nextPage),
          limit: '20',
        });
        const res = await fetch(`/api/trade-history?${params.toString()}`);
        const d = (res.ok ? await res.json() : { trades: [], hasMore: false }) as {
          trades?: TradeRow[];
          hasMore?: boolean;
        };
        setRows((prev) => (replace ? d.trades ?? [] : [...prev, ...(d.trades ?? [])]));
        setHasMore(Boolean(d.hasMore));
      } catch {
        if (replace) setRows([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [leagueId, period, type],
  );

  // Refetch from page 1 whenever a filter changes.
  useEffect(() => {
    setPage(1);
    void load(1, true);
  }, [load]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    void load(next, false);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={leagueId} onChange={(e) => setLeagueId(e.target.value)} className={selectCls}>
          <option value="all">All Leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectCls}>
          {PERIODS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as TypeFilter)} className={selectCls}>
          {TYPES.map((t) => (
            <option key={t.key} value={t.key}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* List / empty / loading */}
      {loading && rows.length === 0 ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-lg bg-[#1e2640]" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-14 text-center">
          <p className="font-figtree text-[15px] font-semibold text-text">No trade history yet.</p>
          <p className="mt-1.5 text-[13px] text-muted">
            Your league trades will appear here after your first sync.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border border-border">
            {rows.map((t) => {
              const sent = t.assetsSent.map((a) => a.name).join(', ') || '—';
              const received = t.assetsReceived.map((a) => a.name).join(', ') || '—';
              return (
                <div
                  key={t.id}
                  className="border-b border-border/60 border-l-2 border-l-boom/40 bg-surface px-3 py-2.5 last:border-b-0"
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate font-figtree text-[13px] text-text">{t.leagueName}</span>
                      {t.status ? (
                        <span className="shrink-0 rounded bg-boom/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase text-boom">
                          {t.status}
                        </span>
                      ) : null}
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{formatTimeAgo(t.createdAt)}</span>
                  </div>
                  <div className="font-figtree text-[12px] leading-snug">
                    <span className="font-mono text-[10px] uppercase text-muted">Gave</span>{' '}
                    <span className="text-text">{sent}</span>
                    <span className="mx-1.5 text-boom">→</span>
                    <span className="font-mono text-[10px] uppercase text-muted">Got</span>{' '}
                    <span className="text-text">{received}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={loading}
              className="mx-auto rounded-lg border border-border px-4 py-2 font-figtree text-[12px] font-bold text-text transition-colors hover:border-boom/40 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load More'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
