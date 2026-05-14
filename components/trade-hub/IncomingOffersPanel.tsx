'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { IncomingOfferApi, IncomingOffersResponse, IncomingReceiveItem } from './types';
import { photoUrl } from './types';
import { useTradeOfferSelection } from './TradeOfferSelectionContext';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

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
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
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
      <p className="text-[13px] font-medium text-white" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        {teamName}
      </p>
      <p className="text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
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
    <div className={`${GLASS} p-4 animate-pulse`}>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-xl border-2 bg-white/[0.03] p-4 text-left backdrop-blur-[24px] transition-colors',
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
              className="rounded-full border border-emerald-500/30 bg-emerald-950 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-400"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
            >
              NEW
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex gap-3">
        <TeamColumn teamName={offer.proposerTeam} handle={offer.proposerHandle} receives={offer.proposerReceives} />
        <div
          className="flex shrink-0 items-center self-stretch pt-8 text-[11px] text-[#475569]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          VS
        </div>
        <TeamColumn teamName={offer.recipientTeam} handle={offer.recipientHandle} receives={offer.recipientReceives} />
      </div>

      <div className="mt-3 flex justify-end">
        <div className="text-right">
          <p
            className="text-[9px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            OFFER VALUE
          </p>
          <p
            className="text-[24px] font-bold tabular-nums leading-tight text-[#36E7A1]"
            style={{
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
              textShadow: '0 0 18px rgba(54,231,161,0.35)',
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

export default function IncomingOffersPanel() {
  const { selectedOfferId, setSelectedOfferId } = useTradeOfferSelection();
  const [data, setData] = useState<IncomingOffersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trades/incoming', { credentials: 'include' });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      setData((await res.json()) as IncomingOffersResponse);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to load offers');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const offers = data?.offers;
    if (!offers?.length) return;
    const ids = new Set(offers.map((o) => o.id));
    if (!selectedOfferId || !ids.has(selectedOfferId)) {
      setSelectedOfferId(offers[0].id);
    }
  }, [data?.offers, selectedOfferId, setSelectedOfferId]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className={`${GLASS} flex h-full min-h-0 flex-1 flex-col overflow-hidden`}>
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3">
          <p
            className="text-[12px] font-semibold uppercase tracking-widest text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            ALL INCOMING OFFERS
          </p>
          <div className="relative">
            <select
              defaultValue="all"
              className="cursor-pointer appearance-none rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 pr-8 text-[12px] text-white outline-none transition hover:bg-white/[0.05] focus:border-emerald-500/40"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              aria-label="League filter"
            >
              <option value="all">All Leagues</option>
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#94a3b8]">
              ▾
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3">
          {error ? (
            <p className="mb-2 shrink-0 text-center text-[13px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              {error}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="space-y-3 pr-0.5">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => <OfferCardSkeleton key={i} />)
                : (data?.offers ?? []).map((o) => (
                    <OfferCard
                      key={o.id}
                      offer={o}
                      selected={selectedOfferId === o.id}
                      onSelect={() => setSelectedOfferId(o.id)}
                    />
                  ))}
            </div>

            {!loading && data?.offers?.length ? (
              <div className="mt-3 shrink-0 pb-1 text-center">
                <button
                  type="button"
                  className="text-[12px] text-[#22D3EE] hover:underline"
                  style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
                >
                  View All {data.totalCount} Offers →
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
