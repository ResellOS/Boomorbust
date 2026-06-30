'use client';

import type { CategoryAccuracy, ConfidenceTierRow } from '@/lib/performance/types';
import { fmtPct } from '@/lib/performance/utils';

interface AccuracyByCategoryProps {
  categoryAccuracy: CategoryAccuracy;
  confidenceCalibration: ConfidenceTierRow[];
  hasData: boolean;
}

function StatPair({ label, value }: { label: string; value: number | null }) {
  return (
    <span>
      {label}:{' '}
      <span className="font-mono tabular-nums text-text">{fmtPct(value)}</span>
    </span>
  );
}

export default function AccuracyByCategory({
  categoryAccuracy,
  confidenceCalibration,
  hasData,
}: AccuracyByCategoryProps) {
  return (
    <section className="mb-6">
      <div className="mb-1 font-figtree text-[12px] font-bold uppercase tracking-[1.5px] text-text">
        Accuracy by Category
      </div>
      <p className="mb-3 font-figtree text-[12px] text-muted">
        {hasData
          ? 'Breakdown by call type and confidence tier.'
          : 'Category breakdowns populate automatically as calls resolve.'}
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[10px] border border-border bg-surface/40 p-4">
          <div className="mb-2 font-figtree text-[11px] font-semibold uppercase tracking-wide text-muted">
            Buy / Sell Calls
          </div>
          <div className="space-y-1 font-figtree text-[13px] text-muted">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <StatPair label="Buy Now" value={categoryAccuracy.buyNow} />
              <span className="text-border">·</span>
              <StatPair label="Buy Window" value={categoryAccuracy.buyWindow} />
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <StatPair label="Sell Now" value={categoryAccuracy.sellNow} />
              <span className="text-border">·</span>
              <StatPair label="Sell Window" value={categoryAccuracy.sellWindow} />
            </div>
          </div>
        </div>

        <div className="rounded-[10px] border border-border bg-surface/40 p-4">
          <div className="mb-2 font-figtree text-[11px] font-semibold uppercase tracking-wide text-muted">
            Start / Sit Calls
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 font-figtree text-[13px] text-muted">
            <StatPair label="Start Calls" value={categoryAccuracy.startCalls} />
            <span className="text-border">·</span>
            <StatPair label="Sit Calls" value={categoryAccuracy.sitCalls} />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[10px] border border-border bg-surface/40">
        <div className="border-b border-border px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-muted">
          Confidence Calibration
        </div>
        <div className="grid grid-cols-[1fr_72px_72px] gap-2 border-b border-border/50 px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-muted">
          <span>Confidence</span>
          <span className="text-right">Calls</span>
          <span className="text-right">Accuracy</span>
        </div>
        {confidenceCalibration.map((row) => (
          <div
            key={row.tier}
            className="grid grid-cols-[1fr_72px_72px] items-center gap-2 border-b border-border/30 px-3 py-2.5 last:border-b-0"
          >
            <div>
              <span className="font-figtree text-[13px] text-text">
                {row.label}
              </span>
              <span className="ml-2 font-mono text-[10px] text-muted">
                ({row.range})
              </span>
              {row.accuracy != null && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg/80">
                  <div
                    className="h-full rounded-full bg-boom"
                    style={{ width: `${Math.min(100, row.accuracy)}%` }}
                  />
                </div>
              )}
            </div>
            <span className="text-right font-mono text-[12px] tabular-nums text-muted">
              {row.calls ?? '--'}
            </span>
            <span className="text-right font-mono text-[12px] tabular-nums text-text">
              {fmtPct(row.accuracy)}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-2 font-figtree text-[11px] leading-relaxed text-muted">
        When BOB says 71%+ confidence (Smash), it should be right roughly 70%+ of the time.
        This table shows whether that&apos;s true.
      </p>
    </section>
  );
}
