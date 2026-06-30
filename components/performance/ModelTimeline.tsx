'use client';

import type { ModelEvolutionEntry } from '@/lib/performance/types';
import { fmtPct } from '@/lib/performance/utils';

interface ModelTimelineProps {
  entries: ModelEvolutionEntry[];
}

export default function ModelTimeline({ entries }: ModelTimelineProps) {
  return (
    <section className="mb-6">
      <div className="mb-1 font-figtree text-[12px] font-bold uppercase tracking-[1.5px] text-text">
        How BOB Improves
      </div>
      <p className="mb-4 font-figtree text-[12px] text-muted">
        The model adjusts based on outcomes. Here&apos;s the history.
      </p>

      <div className="relative space-y-0 pl-4">
        <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />

        {entries.map((entry, i) => (
          <div key={`${entry.date}-${i}`} className="relative pb-5 last:pb-0">
            <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full border-2 border-boom bg-bg" />
            <div className="font-mono text-[11px] text-boom">{entry.date}</div>
            <div className="mt-0.5 font-figtree text-[14px] font-semibold text-text">
              {entry.title}
            </div>
            <div className="mt-1 font-figtree text-[12px] leading-relaxed text-muted">
              {entry.detail}
            </div>
            {(entry.accuracyBefore != null || entry.accuracyAfter != null) && (
              <div className="mt-1 font-mono text-[10px] text-muted">
                Accuracy: {fmtPct(entry.accuracyBefore)} → {fmtPct(entry.accuracyAfter)}
              </div>
            )}
          </div>
        ))}

        <div className="relative pb-2">
          <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full border-2 border-border bg-bg" />
          <p className="font-figtree text-[12px] italic text-muted">
            Future entries appear automatically as Phase 3 self-refinement runs.
          </p>
        </div>
      </div>
    </section>
  );
}
