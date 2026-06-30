'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import clsx from 'clsx';
import { toast } from 'sonner';
import type { SmartCounterApiResponse, SmartCounterCardDto } from './types';
import { useTradeOfferSelection } from './TradeOfferSelectionContext';

type UserTier = 'free' | 'pro' | 'elite' | 'all_pro_terminal';

const GLASS_CARD =
  'rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 backdrop-blur-[24px] sm:p-4';

function treScoreClass(display: string): string {
  const t = display.trim();
  if (t.startsWith('-')) return 'text-red-400';
  return 'text-emerald-400';
}

function tierStyles(tier: SmartCounterCardDto['tier']) {
  switch (tier) {
    case 'aggressive':
      return {
        borderLeft: 'border-l-[3px] border-l-[#36E7A1]',
        labelClass: 'text-[#36E7A1]',
        buttonClass:
          'min-h-[44px] w-full bg-emerald-500 hover:bg-emerald-400 text-black text-[13px] font-semibold px-4 py-2.5 rounded-lg mt-3 transition-colors',
        cardExtra: 'shadow-[0_0_16px_rgba(54,231,161,0.2)]',
      };
    case 'balanced':
      return {
        borderLeft: 'border-l-[3px] border-l-[#FBBF24]',
        labelClass: 'text-[#FBBF24]',
        buttonClass:
          'min-h-[44px] w-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-semibold px-4 py-2.5 rounded-lg mt-3 transition-colors',
        cardExtra: '',
      };
    case 'conservative':
      return {
        borderLeft: 'border-l-[3px] border-l-[#64748B]',
        labelClass: 'text-[#94a3b8]',
        buttonClass:
          'min-h-[44px] w-full bg-slate-600 hover:bg-slate-500 text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg mt-3 transition-colors',
        cardExtra: '',
      };
  }
}

function CounterResponseCard({ card, offerId }: { card: SmartCounterCardDto; offerId: string | null }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const styles = tierStyles(card.tier);
  const scoreCls = treScoreClass(card.treScoreDisplay);

  const handleSend = async () => {
    if (!offerId) return;
    setSending(true);
    try {
      const res = await fetch('/api/trades/counter/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId, tier: card.tier }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      toast.success('Counter sent.');
      setSent(true);
    } catch (e) {
      toast.error((e as Error).message ?? 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${GLASS_CARD} ${styles.borderLeft} ${styles.cardExtra}`}>
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={`text-[10px] font-semibold uppercase tracking-wide ${styles.labelClass}`}
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {card.label}
          </p>
          <p
            className="mt-1 truncate text-[16px] font-semibold text-white sm:whitespace-normal"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {card.title}
          </p>
          <p
            className="text-[13px] text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {card.description}
          </p>
          <p
            className="mt-2 text-[12px] text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            {card.modification}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-row items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:text-right">
          <p
            className="text-[10px] font-semibold uppercase tracking-wide text-[#64748B]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            TRE SCORE
          </p>
          <p
            className={clsx('text-[20px] font-bold tabular-nums sm:text-[22px]', scoreCls)}
            style={{ fontFamily: 'var(--font-mono), JetBrains Mono, monospace' }}
          >
            {card.treScoreDisplay}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleSend()}
        disabled={sending || sent || !offerId}
        className={styles.buttonClass}
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif', opacity: sending ? 0.75 : 1 }}
      >
        {sent ? 'Sent' : sending ? 'Sending…' : 'Send Counter'}
      </button>
    </div>
  );
}

function LockedOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/60 px-6 text-center backdrop-blur-sm">
      <Lock className="h-7 w-7 text-[#64748B]" aria-hidden />
      <p
        className="mt-3 max-w-[260px] text-[15px] font-medium text-white"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        Smart Counter is locked on Free and Rookie. Upgrade to Veteran or All-Pro Terminal.
      </p>
      <Link
        href="/pricing"
        className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-emerald-500 px-5 py-2 text-[14px] font-semibold text-black transition-colors hover:bg-emerald-400"
        style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
      >
        Upgrade Now →
      </Link>
    </div>
  );
}

function CounterSkeleton() {
  return (
    <div className={`${GLASS_CARD} animate-pulse border-l-[3px] border-l-white/[0.12]`}>
      <div className="flex gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-2.5 w-28 rounded bg-white/[0.08]" />
          <div className="h-4 w-40 rounded bg-white/[0.06]" />
          <div className="h-3 w-full max-w-[200px] rounded bg-white/[0.05]" />
        </div>
        <div className="h-12 w-14 shrink-0 rounded bg-white/[0.06]" />
      </div>
      <div className="mt-3 h-9 w-full rounded-lg bg-white/[0.06]" />
    </div>
  );
}

export interface SmartCounterPanelProps {
  /** Optional width/layout override (e.g. full width on the Smart Counter tab). */
  className?: string;
}

export default function SmartCounterPanel({ className }: SmartCounterPanelProps) {
  const { selectedOffer, selectedOfferId } = useTradeOfferSelection();
  const rootClass =
    className !== undefined ? className : 'w-full min-w-0 lg:w-[47%] lg:max-w-[47%] lg:shrink-0';
  const [tier, setTier] = useState<UserTier | null>(null);
  const [payload, setPayload] = useState<SmartCounterApiResponse | null>(null);
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [counterError, setCounterError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const loadCounters = useCallback(async (offer: NonNullable<typeof selectedOffer>, signal: AbortSignal) => {
    setLoadingCounters(true);
    setCounterError(null);
    try {
      const res = await fetch('/api/trades/counter', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offer }),
        signal,
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 403 && j.error === 'upgrade_required') {
          throw new Error('Upgrade to Veteran or All-Pro Terminal to use Smart Counter.');
        }
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as SmartCounterApiResponse;
      if (!signal.aborted) setPayload(json);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      if (!signal.aborted) {
        setCounterError('Unable to load Smart Counter. Try again.');
        setPayload(null);
      }
    } finally {
      if (!signal.aborted) setLoadingCounters(false);
    }
  }, []);

  useEffect(() => {
    if (isTierLocked || tier === null || !selectedOffer) {
      abortRef.current?.abort();
      setPayload(null);
      setCounterError(null);
      setLoadingCounters(false);
      return;
    }

    abortRef.current?.abort();
    const c = new AbortController();
    abortRef.current = c;
    void loadCounters(selectedOffer, c.signal);

    return () => c.abort();
  }, [isTierLocked, tier, selectedOffer, loadCounters]);

  return (
    <div
      className={`relative flex min-h-0 flex-col rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px] ${rootClass}`}
    >
      {tier !== null && isTierLocked ? <LockedOverlay /> : null}

      <div className="shrink-0 border-b border-white/[0.06] px-3 py-3 sm:px-4">
        <p
          className="text-[14px] font-semibold text-white"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          SMART COUNTER (3 RESPONSES)
        </p>
        <p
          className="text-[12px] text-[#64748B]"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
        >
          Powered by TRE Engine
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain p-3 sm:p-4">
        {tier !== null && isTierLocked ? (
          <div className="min-h-[360px]" aria-hidden />
        ) : !selectedOfferId ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[14px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              Select an incoming offer to generate counter responses.
            </p>
          </div>
        ) : tier === null ? (
          <div className="flex flex-col gap-3">
            <CounterSkeleton />
            <CounterSkeleton />
            <CounterSkeleton />
          </div>
        ) : counterError ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[14px] text-red-400" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              {counterError}
            </p>
            <button
              type="button"
              onClick={() => {
                if (!selectedOffer) return;
                abortRef.current?.abort();
                const c = new AbortController();
                abortRef.current = c;
                void loadCounters(selectedOffer, c.signal);
              }}
              className="min-h-[44px] rounded-lg border border-white/[0.12] bg-white/[0.05] px-4 text-[14px] text-white hover:bg-white/[0.08]"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
            >
              Retry
            </button>
          </div>
        ) : loadingCounters ? (
          <div className="flex flex-col gap-3">
            <CounterSkeleton />
            <CounterSkeleton />
            <CounterSkeleton />
          </div>
        ) : payload?.responses?.length ? (
          <>
            <div className="flex flex-col gap-3">
              {payload.responses.map((card) => (
                <CounterResponseCard key={card.tier} card={card} offerId={selectedOfferId} />
              ))}
            </div>
            <div className="mt-3 text-center">
              <Link
                href="/dashboard/trade-hub"
                className="inline-flex min-h-[44px] w-full max-w-full items-center justify-center text-[13px] text-[#22D3EE] hover:bg-white/[0.04] hover:underline sm:w-auto"
                style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              >
                View All Smart Counters →
              </Link>
            </div>
          </>
        ) : !loadingCounters ? (
          <p className="text-center text-[14px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            No counter data for this offer.
          </p>
        ) : null}
      </div>
    </div>
  );
}
