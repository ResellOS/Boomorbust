'use client';

import type { BobCall } from '@/lib/performance/types';
import {
  confidenceLabel,
  formatCallDate,
  resultBorderColor,
} from '@/lib/performance/utils';

function HallCard({ call }: { call: BobCall }) {
  const border = resultBorderColor(call.result);

  return (
    <div
      className="rounded-[10px] border border-border bg-surface/50 p-3 backdrop-blur-xl"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      <div className="font-figtree text-[12px] font-semibold text-text">
        {call.recommendation.toUpperCase()} — {call.playerName}
      </div>
      <div className="mt-1 font-mono text-[9px] text-muted">
        {formatCallDate(call.callDate)}
        {call.confidencePct != null &&
          ` · ${call.confidencePct}% (${confidenceLabel(call.confidence)})`}
      </div>
      {call.marketImpact && (
        <div className="mt-1.5 font-mono text-[10px] text-boom">{call.marketImpact}</div>
      )}
      {call.missedBy && (
        <div className="mt-1.5 font-mono text-[10px] text-bust">{call.missedBy}</div>
      )}
      {call.outcomePct != null && !call.marketImpact && !call.missedBy && (
        <div className="mt-1.5 font-mono text-[10px] text-boom">
          {call.outcomePct > 0 ? '+' : ''}
          {call.outcomePct}%
        </div>
      )}
    </div>
  );
}

interface HallOfFameProps {
  calls: BobCall[];
  hasData: boolean;
}

export default function HallOfFame({ calls, hasData }: HallOfFameProps) {
  return (
    <section className="mb-6">
      <div className="mb-1 font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-boom">
        BOB&apos;s Best Calls
      </div>
      <p className="mb-3 font-figtree text-[11px] text-muted">
        The calls that aged the best. Updated automatically as outcomes resolve.
      </p>

      {hasData && calls.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {calls.map((call) => (
            <HallCard key={call.id} call={call} />
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-border/60 bg-surface/30 px-5 py-6 text-center">
          <p className="font-figtree text-[12px] text-muted">
            Best calls appear here once the 2026 season is underway.
          </p>
        </div>
      )}
    </section>
  );
}
