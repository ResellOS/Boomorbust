'use client';

import type { BobCall } from '@/lib/performance/types';
import {
  confidenceLabel,
  formatCallDate,
  resultBorderColor,
} from '@/lib/performance/utils';

function MissCard({ call }: { call: BobCall }) {
  const border = resultBorderColor('LOSS');

  return (
    <div
      className="rounded-[10px] border border-border bg-surface/50 p-3 backdrop-blur-xl"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
    >
      <div className="font-figtree text-[13px] font-semibold text-text">
        {call.recommendation.toUpperCase()} — {call.playerName}
      </div>
      <div className="mt-1 font-mono text-[10px] text-muted">
        {formatCallDate(call.callDate)}
        {call.confidencePct != null &&
          ` · ${call.confidencePct}% (${confidenceLabel(call.confidence)})`}
      </div>
      {call.missedBy && (
        <div className="mt-1.5 font-mono text-[11px] text-bust">
          Missed by: {call.missedBy}
        </div>
      )}
      {call.marketImpact && (
        <div className="mt-1.5 font-mono text-[11px] text-bust">{call.marketImpact}</div>
      )}
    </div>
  );
}

interface HallOfAccountabilityProps {
  calls: BobCall[];
  hasData: boolean;
}

export default function HallOfAccountability({ calls, hasData }: HallOfAccountabilityProps) {
  return (
    <section className="mb-6">
      <div className="mb-1 font-figtree text-[12px] font-bold uppercase tracking-[1.5px] text-bust">
        Worst Calls
      </div>
      <p className="mb-3 font-figtree text-[12px] text-muted">
        These stay here forever. Transparency builds trust.
      </p>

      {hasData && calls.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {calls.map((call) => (
            <MissCard key={call.id} call={call} />
          ))}
        </div>
      ) : (
        <div className="rounded-[10px] border border-dashed border-border/60 bg-surface/30 px-5 py-6 text-center">
          <p className="font-figtree text-[13px] leading-relaxed text-muted">
            BOB&apos;s worst calls appear here too. Every miss stays on the record. No
            exceptions.
          </p>
        </div>
      )}
    </section>
  );
}
