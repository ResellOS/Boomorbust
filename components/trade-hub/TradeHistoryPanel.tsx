'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { TradeHistoryApiResponse, TradeHistoryRowDto, TradeHistoryVerdict } from './types';
import { photoUrl } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function HistoryAvatar({ playerId, name }: { playerId: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!playerId || err) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold text-white">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
      <Image
        src={photoUrl(playerId)}
        alt=""
        width={28}
        height={28}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => setErr(true)}
      />
    </div>
  );
}

function verdictBadgeClass(verdict: TradeHistoryVerdict): string {
  switch (verdict) {
    case 'SMASH':
      return 'border border-emerald-500/30 bg-emerald-950 text-emerald-400';
    case 'FAIR':
      return 'border border-amber-500/30 bg-amber-950 text-amber-400';
    case 'MISS':
      return 'border border-red-500/30 bg-red-950 text-red-400';
  }
}

function scoreColorClass(verdict: TradeHistoryVerdict, scoreDisplay: string): string {
  if (verdict === 'MISS' || scoreDisplay.trim().startsWith('-')) return 'text-red-400';
  if (verdict === 'FAIR') return 'text-amber-400';
  return 'text-emerald-400';
}

export interface TradeHistoryPanelProps {
  /** Rows to request from `/api/trades/history` (default 5). */
  limit?: number;
  className?: string;
}

export default function TradeHistoryPanel({ limit = 5, className }: TradeHistoryPanelProps) {
  const [data, setData] = useState<TradeHistoryApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trades/history?limit=${encodeURIComponent(String(limit))}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as TradeHistoryApiResponse);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load history');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const rootClass = className ?? 'w-full';

  return (
    <div className={`${GLASS} ${rootClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p
            className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRADE HISTORY
          </p>
          <p className="mt-0.5 text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            All past trades with TRE verdict
          </p>
        </div>
        <Link
          href="#"
          className="shrink-0 text-[12px] text-[#22D3EE] hover:underline"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          View Full History →
        </Link>
      </div>

      <div className="overflow-x-auto px-4 pb-3 pt-2">
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr>
              <th
                className="border-b border-white/[0.06] pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                TIME
              </th>
              <th
                className="border-b border-white/[0.06] pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                TRADED
              </th>
              <th
                className="border-b border-white/[0.06] pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                PLAYER GIVEN
              </th>
              <th
                className="border-b border-white/[0.06] pb-2 text-[10px] font-semibold normal-case tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                for
              </th>
              <th
                className="border-b border-white/[0.06] pb-2 text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                PLAYER RECEIVED
              </th>
              <th
                className="border-b border-white/[0.06] pb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                TRE VERDICT
              </th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: limit }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-2">
                      <div className="h-3 w-9 animate-pulse rounded bg-white/[0.08]" />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="h-3 w-10 animate-pulse rounded bg-white/[0.06]" />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
                        <div className="h-3 w-28 animate-pulse rounded bg-white/[0.06]" />
                      </div>
                    </td>
                    <td className="py-3 pr-2">
                      <div className="h-3 w-5 animate-pulse rounded bg-white/[0.05]" />
                    </td>
                    <td className="py-3 pr-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 shrink-0 animate-pulse rounded-full bg-white/[0.08]" />
                        <div className="h-3 w-36 animate-pulse rounded bg-white/[0.06]" />
                      </div>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <div className="ml-auto h-6 w-24 animate-pulse rounded-full bg-white/[0.07]" />
                    </td>
                  </tr>
                ))
              : error
                ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[13px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                        {error}
                      </td>
                    </tr>
                  )
                : (data?.trades ?? []).length === 0
                  ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                          No trade history yet.
                        </td>
                      </tr>
                    )
                  : (data?.trades ?? []).map((row) => <HistoryTableRow key={row.id} row={row} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HistoryTableRow({ row }: { row: TradeHistoryRowDto }) {
  const badge = verdictBadgeClass(row.verdict);
  const scoreCls = scoreColorClass(row.verdict, row.scoreDisplay);
  const receivedAvatarName = row.receivedDisplay.split(/\s*\+\s*/)[0]?.trim() ?? row.receivedDisplay;

  return (
    <tr className="cursor-pointer border-b border-white/[0.04] transition-colors last:border-b-0 hover:bg-white/[0.03]">
      <td
        className="min-w-[40px] py-3 pr-2 align-middle text-[11px] tabular-nums text-[#64748B]"
        style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
      >
        {row.timeLabel}
      </td>
      <td className="py-3 pr-2 align-middle text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        Traded
      </td>
      <td className="min-w-0 py-3 pr-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          <HistoryAvatar playerId={row.givenPlayerId} name={row.givenName} />
          <span className="flex min-w-0 items-center gap-1 text-[12px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            <span className="truncate">{row.givenName}</span>
            {row.givenWarning ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-label="Aging player warning" />
            ) : null}
          </span>
        </div>
      </td>
      <td className="py-3 pr-2 align-middle text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        for
      </td>
      <td className="min-w-0 py-3 pr-2 align-middle">
        <div className="flex min-w-0 items-center gap-2">
          {row.receivedPlayerId ? (
            <HistoryAvatar playerId={row.receivedPlayerId} name={receivedAvatarName} />
          ) : null}
          <span className="truncate text-[12px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {row.receivedDisplay}
          </span>
        </div>
      </td>
      <td className="py-3 pl-2 text-right align-middle">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${badge}`}
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {row.verdict}
          </span>
          <span
            className={`text-[12px] font-bold tabular-nums ${scoreCls}`}
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {row.scoreDisplay}
          </span>
        </div>
      </td>
    </tr>
  );
}
