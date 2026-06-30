'use client';

import type { PerformanceStats } from '@/lib/performance/types';
import { METHODOLOGY_CLOSING, METHODOLOGY_POINTS } from '@/lib/performance/constants';
import { fmtPct } from '@/lib/performance/utils';

interface WhyBobPanelProps {
  stats: PerformanceStats;
}

export default function WhyBobPanel({ stats }: WhyBobPanelProps) {
  const { wins, losses, pending } = stats.seasonRecord;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-y-auto border-l border-border bg-surface/30 [scrollbar-width:thin]">
      <div className="border-b border-border px-4 py-3">
        <div className="font-figtree text-[12px] font-extrabold uppercase tracking-[1.5px] text-boom">
          What Powers BOB&apos;s Calls
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        <section className="space-y-3">
          {METHODOLOGY_POINTS.map((point) => (
            <div key={point.title}>
              <h3 className="font-figtree text-[13px] font-bold text-text">
                {point.title}
              </h3>
              <p className="font-figtree text-[12px] leading-relaxed text-muted">
                {point.body}
              </p>
            </div>
          ))}
        </section>

        <p className="font-figtree text-[12px] leading-relaxed text-muted italic">
          {METHODOLOGY_CLOSING}
        </p>

        <section className="rounded-[8px] border border-border bg-bg/50 p-3">
          <div className="font-figtree text-[11px] font-bold uppercase tracking-wide text-muted">
            Season Tracker
          </div>
          <div className="mt-2 font-mono text-[14px] tabular-nums text-text">
            W: {wins} · L: {losses} · P: {pending}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted">
            Hit Rate: {fmtPct(stats.hitRate)}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-muted">
            Tracking: Season 1
          </div>
        </section>
      </div>
    </aside>
  );
}
