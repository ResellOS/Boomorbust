'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { IncomingOfferApi, IncomingOffersResponse, IncomingReceiveItem } from './types';
import { photoUrl } from './types';
import { useTradeOfferSelection } from './TradeOfferSelectionContext';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type { LeaguesListResponse } from '@/app/api/leagues/route';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

function treEdgeClass(edge: string): string {
  return edge.trim().startsWith('-') ? 'text-red-400' : 'text-[#36E7A1]';
}

function PlayerAvatar({ playerId, name }: { playerId?: string | null; name: string }) {
  const [err, setErr] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (!playerId || err) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-bold text-white">
        {initials}
      </div>
    );
  }

  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
      <Image
        src={photoUrl(playerId)}
        alt=""
        width={32}
        height={32}
        className="h-full w-full object-cover"
        unoptimized
        onError={() => setErr(true)}
      />
    </div>
  );
}

function ReceiveLine({ item }: { item: IncomingReceiveItem }) {
  if (item.kind === 'pick') {
    return (
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          {item.label}
        </span>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#64748B]" aria-hidden />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <PlayerAvatar playerId={item.playerId} name={item.name} />
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          {item.name}
        </p>
        <p className="truncate text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          {item.position} · {item.team}
        </p>
      </div>
    </div>
  );
}

function TeamColumn({
  teamName,
  handle,
  receives,
}: {
  teamName: string;
  handle: string;
  receives: IncomingReceiveItem[];
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        {teamName}
      </p>
      <p className="truncate text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        {handle}
      </p>
      <p
        className="mt-2 text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        RECEIVES
      </p>
      <div className="mt-1.5 flex flex-col gap-2.5">
        {receives.map((item, idx) => (
          <ReceiveLine key={`${item.kind}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function OfferCardSkeleton() {
  return (
    <div className={`${GLASS} p-3 animate-pulse sm:p-4`}>
      <div className="mb-3 flex justify-between">
        <div className="h-4 w-32 rounded bg-white/[0.08]" />
        <div className="h-3 w-16 rounded bg-white/[0.06]" />
      </div>
      <div className="flex gap-3">
        <div className="h-20 flex-1 rounded bg-white/[0.05]" />
        <div className="h-20 flex-1 rounded bg-white/[0.05]" />
      </div>
    </div>
  );
}

function OfferCard({
  offer,
  selected,
  onSelect,
}: {
  offer: IncomingOfferApi;
  selected: boolean;
  onSelect: () => void;
}) {
  const edgeCls = treEdgeClass(offer.treEdge);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full max-w-full rounded-xl border-2 bg-white/[0.03] p-3 text-left backdrop-blur-[24px] transition-colors sm:p-4',
        selected ? 'border-emerald-500/50' : 'border-white/[0.08] hover:bg-white/[0.04]',
      )}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{ background: offer.leagueIconBg }}
          >
            {offer.leagueLetter}
          </div>
          <span
            className="truncate text-[13px] font-medium text-[#22D3EE]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {offer.leagueName}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <span
            className="text-[11px] tabular-nums text-[#64748B]"
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {offer.timeAgo}
          </span>
          {offer.isNew ? (
            <span
              className="rounded-full border border-cyan-500/30 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
            >
              NEW
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:gap-3">
        <TeamColumn teamName={offer.proposerTeam} handle={offer.proposerHandle} receives={offer.proposerReceives} />
        <div
          className="flex shrink-0 items-center justify-center py-0.5 text-[11px] text-[#475569] sm:w-auto sm:self-stretch sm:pt-8 sm:pb-0"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          VS
        </div>
        <TeamColumn teamName={offer.recipientTeam} handle={offer.recipientHandle} receives={offer.recipientReceives} />
      </div>

      <div className="mt-3 flex justify-end sm:mt-3">
        <div className="text-right">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            OFFER VALUE
          </p>
          <p
            className={clsx('text-[20px] font-bold tabular-nums leading-tight sm:text-[24px]', edgeCls)}
            style={{
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
              textShadow: edgeCls.includes('red') ? '0 0 18px rgba(248,113,113,0.35)' : '0 0 18px rgba(54,231,161,0.35)',
            }}
          >
            {offer.treEdge}
          </p>
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRE EDGE
          </p>
        </div>
      </div>
    </button>
  );
}

export interface IncomingOffersPanelProps {
  /** Total incoming count from stats (same league scope). Falls back to loaded list length. */
  totalOfferCount?: number | null;
  /** Hide footer link (e.g. on full offers page). */
  hideViewAllLink?: boolean;
}

export default function IncomingOffersPanel({ totalOfferCount, hideViewAllLink }: IncomingOffersPanelProps) {
  const { selectedOffer, setSelectedOffer } = useTradeOfferSelection();
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);
  const leagues = useDashboardLeagueStore((s) => s.leagues);
  const setLeagues = useDashboardLeagueStore((s) => s.setLeagues);

  const [data, setData] = useState<IncomingOffersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (leagues.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/leagues', { credentials: 'include' });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as LeaguesListResponse;
        if (cancelled) return;
        setLeagues([...(json.myLeagues ?? []), ...(json.otherLeagues ?? [])]);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagues.length, setLeagues]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q =
        activeLeagueId && activeLeagueId !== 'all'
          ? `?leagueId=${encodeURIComponent(activeLeagueId)}`
          : '';
      const res = await fetch(`/api/trades/incoming${q}`, { credentials: 'include' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as IncomingOffersResponse);
    } catch {
      setError('Unable to load offers. Try again.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeLeagueId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const offers = data?.offers;
    if (!offers?.length) {
      setSelectedOffer(null);
      return;
    }
    if (selectedOffer && offers.some((o) => o.id === selectedOffer.id)) return;
    setSelectedOffer(offers[0]);
  }, [data?.offers, selectedOffer, setSelectedOffer]);

  const viewAllCount = totalOfferCount ?? data?.totalCount ?? 0;

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className={`${GLASS} flex h-full min-h-0 flex-1 flex-col overflow-hidden`}>
        <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.06] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
          <p
            className="text-[12px] font-semibold uppercase tracking-widest text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            ALL INCOMING OFFERS
          </p>
          <div className="relative">
            <select
              value={activeLeagueId === null || activeLeagueId === 'all' ? 'all' : activeLeagueId}
              onChange={(e) => {
                const v = e.target.value;
                useDashboardLeagueStore.getState().setActiveLeagueId(v === 'all' ? 'all' : v);
              }}
              className="min-h-[44px] w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 pr-9 text-[12px] text-white outline-none transition hover:bg-white/[0.05] focus:border-emerald-500/40 sm:w-auto sm:min-w-[160px]"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              aria-label="League filter"
            >
              <option value="all">All Leagues</option>
              {leagues.map((lg) => (
                <option key={lg.id} value={lg.id}>
                  {lg.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#94a3b8]">
              ▾
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 pb-4 pt-3 sm:px-4">
          {error ? (
            <div className="mb-3 shrink-0 flex flex-col items-center gap-2 text-center">
              <p className="text-[13px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="min-h-[44px] rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 text-[13px] text-white hover:bg-white/[0.08]"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                Retry
              </button>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="space-y-3 pr-0.5">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <OfferCardSkeleton key={i} />)
                : (data?.offers ?? []).map((o) => (
                    <OfferCard
                      key={o.id}
                      offer={o}
                      selected={selectedOffer?.id === o.id}
                      onSelect={() => setSelectedOffer(o)}
                    />
                  ))}
            </div>

            {!loading && !hideViewAllLink && viewAllCount > 0 ? (
              <div className="mt-3 shrink-0 pb-1 text-center">
                <Link
                  href="/dashboard/trade-hub/offers"
                  className="inline-flex min-h-[44px] w-full max-w-full items-center justify-center rounded-lg px-2 text-[12px] text-[#22D3EE] hover:bg-white/[0.04] hover:underline sm:w-auto sm:px-3"
                  style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
                >
                  View All {viewAllCount} Offers →
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
