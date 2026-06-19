'use client';

import { useMemo, useState } from 'react';
import type { BobCall, CallFilter } from '@/lib/performance/types';
import { EMPTY_TRACKER_MESSAGE } from '@/lib/performance/constants';
import {
  confidenceLabel,
  formatCallDate,
  isBuySell,
  isStartSit,
  resultBorderColor,
  resultEmoji,
} from '@/lib/performance/utils';

const FILTERS: { id: CallFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'buy_sell', label: 'Buy/Sell' },
  { id: 'start_sit', label: 'Start/Sit' },
  { id: 'wins', label: 'Wins' },
  { id: 'losses', label: 'Losses' },
  { id: 'pending', label: 'Pending' },
];

function matchesFilter(call: BobCall, filter: CallFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'buy_sell') return isBuySell(call.recommendation);
  if (filter === 'start_sit') return isStartSit(call.recommendation);
  if (filter === 'wins') return call.result === 'WIN' || call.result === 'PUSH';
  if (filter === 'losses') return call.result === 'LOSS';
  if (filter === 'pending') return call.result === 'PENDING';
  return true;
}

function resultDisplay(call: BobCall): { text: string; className: string } {
  if (call.result === 'WIN') return { text: 'WIN ✓', className: 'text-boom' };
  if (call.result === 'LOSS') return { text: 'LOSS ✗', className: 'text-bust' };
  if (call.result === 'PUSH') return { text: 'PUSH', className: 'text-muted' };
  if (call.result === 'INVALIDATED') return { text: 'Invalidated', className: 'text-muted' };
  return { text: 'Pending', className: 'text-hold' };
}

function CallCard({ call }: { call: BobCall }) {
  const border = resultBorderColor(call.result);
  const res = resultDisplay(call);
  const emoji = resultEmoji(call.recommendation, call.result);

  return (
    <div
      className="rounded-[10px] border border-border bg-surface/50 p-4 backdrop-blur-xl"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      <div className="font-figtree text-[13px] font-semibold text-text">
        {emoji} {call.recommendation.toUpperCase()} — {call.playerName}
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted">
        Called: {formatCallDate(call.callDate)}
      </div>
      {call.confidencePct != null && (
        <div className="mt-0.5 font-mono text-[10px] text-muted">
          Confidence: {call.confidencePct}% ({confidenceLabel(call.confidence)})
        </div>
      )}

      {(call.bobRating != null || call.marketRank) && (
        <div className="mt-2 font-mono text-[10px] text-text">
          {call.bobRating != null && <>BOB Rating: {call.bobRating}</>}
          {call.bobRating != null && call.marketRank && ' · '}
          {call.marketRank && <>Market Rank: {call.marketRank}</>}
        </div>
      )}

      <div className={`mt-2 font-mono text-[11px] font-semibold ${res.className}`}>
        Result: {res.text}
      </div>

      {call.marketImpact && (
        <div className="mt-1 font-mono text-[10px] text-muted">
          Market Value: {call.marketImpact}
        </div>
      )}
      {call.missedBy && (
        <div className="mt-1 font-mono text-[10px] text-muted">
          Missed by: {call.missedBy}
        </div>
      )}
    </div>
  );
}

export default function RecentCallsFeed({ calls }: { calls: BobCall[] }) {
  const [filter, setFilter] = useState<CallFilter>('all');
  const hasAny = calls.length > 0;

  const filtered = useMemo(
    () => calls.filter((c) => matchesFilter(c, filter)),
    [calls, filter],
  );

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
            Recent Calls
          </div>
          <p className="mt-0.5 font-figtree text-[10px] text-muted">
            The live record — every call, win and loss.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-[5px] px-2.5 py-1 font-mono text-[9px] transition-colors ${
                filter === f.id
                  ? 'bg-boom/15 text-boom'
                  : 'text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hasAny ? (
        <div className="rounded-[10px] border border-dashed border-border bg-surface/30 px-6 py-10 text-center">
          <p className="mx-auto max-w-md font-figtree text-[13px] leading-relaxed text-muted">
            {EMPTY_TRACKER_MESSAGE}
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface/30 px-6 py-8 text-center font-figtree text-[12px] text-muted">
          No calls match this filter.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((call) => (
            <CallCard key={call.id} call={call} />
          ))}
        </div>
      )}
    </section>
  );
}
