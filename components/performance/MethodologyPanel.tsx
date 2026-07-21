'use client';

import { useEffect, useState } from 'react';

// Out-of-sample forward validation milestone (see CLAUDE.md / settings About).
const VALIDATION_DATE = new Date('2027-02-01T00:00:00Z');

export default function MethodologyPanel() {
  // Countdown is client-only to avoid a hydration mismatch on the day count.
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  useEffect(() => {
    const ms = VALIDATION_DATE.getTime() - Date.now();
    setDaysLeft(Math.max(0, Math.ceil(ms / 86_400_000)));
  }, []);

  return (
    <section className="mb-6">
      <div className="mb-3 font-figtree text-[12px] font-bold uppercase tracking-[1.5px] text-text">
        Methodology
      </div>

      {/* Forward validation countdown */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-boom/25 bg-boom/[0.06] p-4">
        <div>
          <div className="font-figtree text-[13px] font-semibold text-boom">Forward Validation</div>
          <p className="mt-1 max-w-md font-figtree text-[12px] leading-relaxed text-muted">
            Every call is logged the moment it&apos;s made. On <span className="text-text">Feb 1, 2027</span> we
            grade a full season of out-of-sample predictions — no hindsight, no cherry-picking.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[26px] font-bold leading-none text-boom tabular-nums">
            {daysLeft != null ? daysLeft.toLocaleString() : '—'}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wide text-muted">days to validation</div>
        </div>
      </div>

      {/* TFO formula */}
      <div className="mb-3 rounded-[10px] border border-border bg-surface/60 p-4">
        <div className="font-figtree text-[13px] font-semibold text-text">The TFO Formula</div>
        <p className="mt-1 font-figtree text-[12px] leading-relaxed text-muted">
          Every verdict rolls up from four weighted axes — opportunity, scheme, film, and situation:
        </p>
        <code className="mt-2 block overflow-x-auto rounded-[6px] border border-border bg-bg/60 px-3 py-2 font-mono text-[11px] text-boom">
          TFO = (OPS × 0.35) + (SFS × 0.25) + (F-FIG × 0.25) + (SIT × 0.15)
        </code>
      </div>

      {/* Trust quote */}
      <blockquote className="rounded-[10px] border-l-2 border-boom bg-surface/40 px-4 py-3 font-figtree text-[13px] italic leading-relaxed text-text">
        &ldquo;We show everything — because a formula willing to show its failures is one you can trust.&rdquo;
      </blockquote>
    </section>
  );
}
