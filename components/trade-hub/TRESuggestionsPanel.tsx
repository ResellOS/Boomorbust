'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Lock } from 'lucide-react';
import type { TreSuggestionRowDto, TreSuggestionsApiResponse } from './types';
import { photoUrl } from './types';

type UserTier = 'free' | 'pro' | 'elite' | 'all_pro_terminal';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function SuggestionAvatar({ playerId, name }: { playerId: string; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!playerId || err) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[11px] font-bold text-white">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
      <Image
        src={photoUrl(playerId)}
        alt=""
        width={36}
        height={36}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => setErr(true)}
      />
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/60 px-6 text-center backdrop-blur-sm">
      <Lock className="h-7 w-7 text-[#64748B]" aria-hidden />
      <p
        className="mt-3 max-w-[280px] text-[14px] font-medium text-white"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        TRE Suggestions require Veteran or All-Pro
      </p>
      <Link
        href="/pricing"
        className="mt-4 rounded-lg bg-emerald-500 px-5 py-2 text-[13px] font-semibold text-black transition-colors hover:bg-emerald-400"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        Upgrade Now →
      </Link>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 border-b border-white/[0.04] py-3 last:border-b-0">
      <div className="h-9 w-9 shrink-0 rounded-full bg-white/[0.08]" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-[85%] max-w-[280px] rounded bg-white/[0.07]" />
        <div className="h-2.5 w-1/2 max-w-[160px] rounded bg-white/[0.05]" />
      </div>
      <div className="h-10 w-14 shrink-0 rounded bg-white/[0.06]" />
    </div>
  );
}

function SuggestionRow({ row }: { row: TreSuggestionRowDto }) {
  return (
    <button
      type="button"
      className="flex w-full cursor-pointer items-center gap-3 border-b border-white/[0.04] py-3 text-left transition-colors last:border-b-0 hover:bg-white/[0.03]"
    >
      <SuggestionAvatar playerId={row.playerId} name={row.playerDisplayName} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          {row.headline}
        </p>
        <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          Target: {row.targetName}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          TRE EDGE
        </p>
        <p
          className="text-[18px] font-bold tabular-nums text-[#36E7A1]"
          style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
        >
          {row.treEdge}
        </p>
      </div>
    </button>
  );
}

export interface TRESuggestionsPanelProps {
  className?: string;
}

export default function TRESuggestionsPanel({ className }: TRESuggestionsPanelProps) {
  const [tier, setTier] = useState<UserTier | null>(null);
  const [data, setData] = useState<TreSuggestionsApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isTierLocked = tier === 'free' || tier === 'pro';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/user/tier', { credentials: 'include' });
        const j = (await res.json().catch(() => ({}))) as { tier?: string };
        if (cancelled) return;
        const t = j.tier;
        if (t === 'free' || t === 'pro' || t === 'elite' || t === 'all_pro_terminal') {
          setTier(t);
        } else {
          setTier('free');
        }
      } catch {
        if (!cancelled) setTier('free');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trades/suggestions', { credentials: 'include' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as TreSuggestionsApiResponse);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load suggestions');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tier === null || isTierLocked) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void loadSuggestions();
  }, [tier, isTierLocked, loadSuggestions]);

  const rootClass = className ?? 'w-full';

  return (
    <div className={`relative ${GLASS} ${rootClass}`}>
      {tier !== null && isTierLocked ? <LockedOverlay /> : null}

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="min-w-0">
          <p
            className="text-[12px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRE SUGGESTED TRADES
          </p>
          <p className="mt-0.5 text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            Proactive deals found by TRE Engine
          </p>
        </div>
        <Link
          href="#"
          className="shrink-0 text-[12px] text-[#22D3EE] hover:underline"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          View All Suggestions →
        </Link>
      </div>

      <div className="px-4 pb-1 pt-0">
        {tier !== null && isTierLocked ? (
          <div className="min-h-[200px]" aria-hidden />
        ) : tier === null || loading ? (
          <div>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
        ) : error ? (
          <p className="py-6 text-center text-[13px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {error}
          </p>
        ) : data?.suggestions?.length ? (
          <div>
            {data.suggestions.map((row) => (
              <SuggestionRow key={row.id} row={row} />
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-[13px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            No suggestions right now.
          </p>
        )}
      </div>
    </div>
  );
}
