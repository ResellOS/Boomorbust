'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppTopNav from '@/components/nav/AppTopNav';
import { getWatchlist, removeFromWatchlist, type WatchEntry } from '@/lib/watchlist/store';
import { formatKTC, formatDelta, formatTFO, formatTimeAgo } from '@/lib/utils/format';

interface MarketRow { playerId: string; ktcValue: number | null; verdict: string | null }
type SortKey = 'added' | 'change' | 'tfo';

const VERDICT_COLOR: Record<string, string> = {
  BUY: '#36E7A1', BOOM: '#36E7A1', HOLD: '#FBBF24', SELL: '#A78BFA', BUST: '#EF4444',
};

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchEntry[]>([]);
  const [market, setMarket] = useState<Record<string, MarketRow>>({});
  const [sort, setSort] = useState<SortKey>('added');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = getWatchlist();
    setEntries(list);
    setReady(true);
    if (list.length === 0) return;
    const ids = list.map((e) => e.playerId).join(',');
    fetch(`/api/watchlist?ids=${encodeURIComponent(ids)}`)
      .then((r) => (r.ok ? r.json() : { players: [] }))
      .then((d: { players: MarketRow[] }) => {
        const map: Record<string, MarketRow> = {};
        for (const p of d.players ?? []) map[p.playerId] = p;
        setMarket(map);
      })
      .catch(() => {});
  }, []);

  const remove = (playerId: string) => setEntries(removeFromWatchlist(playerId));

  const rows = useMemo(() => {
    const withMarket = entries.map((e) => {
      const cur = market[e.playerId]?.ktcValue ?? null;
      const change = cur != null && e.ktcAtAdd != null ? cur - e.ktcAtAdd : null;
      return { e, cur, change, verdict: market[e.playerId]?.verdict ?? null };
    });
    withMarket.sort((a, b) => {
      if (sort === 'change') return (b.change ?? -Infinity) - (a.change ?? -Infinity);
      if (sort === 'tfo') return (b.e.tfoAtAdd ?? -Infinity) - (a.e.tfoAtAdd ?? -Infinity);
      return new Date(b.e.addedAt).getTime() - new Date(a.e.addedAt).getTime();
    });
    return withMarket;
  }, [entries, market, sort]);

  return (
    <div className="flex min-h-dvh flex-col bg-[#0a0d14]">
      <AppTopNav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-figtree text-[24px] font-bold text-white">Watchlist</h1>
            <p className="mt-0.5 text-[14px] text-slate-500">Players you&apos;re tracking and how their value has moved.</p>
          </div>
          {entries.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] p-1">
              {(['added', 'change', 'tfo'] as SortKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSort(k)}
                  className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${sort === k ? 'bg-boom/15 text-boom' : 'text-slate-400 hover:text-white'}`}
                >
                  {k === 'added' ? 'Added' : k === 'change' ? 'Change' : 'TFO'}
                </button>
              ))}
            </div>
          )}
        </div>

        {!ready ? null : entries.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
            <p className="font-figtree text-[15px] font-semibold text-white">No players on your watchlist.</p>
            <p className="mt-1.5 text-[13px] text-slate-500">Add players from the Player Hub to track their value over time.</p>
            <Link href="/players" className="mt-4 inline-block rounded-lg px-4 py-2 font-figtree text-[13px] font-bold no-underline" style={{ background: '#36E7A1', color: '#0a0d14' }}>
              Go to Player Hub →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-white/[0.08] text-left font-mono text-[10px] uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-2.5">Player</th>
                  <th className="px-3 py-2.5">Pos</th>
                  <th className="px-3 py-2.5">Team</th>
                  <th className="px-3 py-2.5">Added</th>
                  <th className="px-3 py-2.5 text-right">KTC at Add</th>
                  <th className="px-3 py-2.5 text-right">Current KTC</th>
                  <th className="px-3 py-2.5 text-right">Change</th>
                  <th className="px-3 py-2.5 text-right">TFO</th>
                  <th className="px-3 py-2.5">Verdict</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, cur, change, verdict }) => (
                  <tr key={e.playerId} className="border-b border-white/[0.05] font-figtree text-[13px] text-white last:border-b-0">
                    <td className="px-3 py-2.5 font-semibold">{e.playerName}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{e.position || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{e.team || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{formatTimeAgo(e.addedAt)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-slate-300">{formatKTC(e.ktcAtAdd)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-slate-300">{formatKTC(cur)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px]" style={{ color: change == null ? '#64748B' : change >= 0 ? '#36E7A1' : '#A78BFA' }}>
                      {change == null ? '—' : formatDelta(change)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-boom">{formatTFO(e.tfoAtAdd)}</td>
                    <td className="px-3 py-2.5">
                      {verdict ? (
                        <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase" style={{ color: VERDICT_COLOR[verdict] ?? '#94a3b8', background: `${VERDICT_COLOR[verdict] ?? '#94a3b8'}1a` }}>
                          {verdict}
                        </span>
                      ) : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button type="button" onClick={() => remove(e.playerId)} aria-label={`Remove ${e.playerName}`} className="rounded px-2 py-1 font-mono text-[13px] text-slate-500 hover:text-red-400">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
