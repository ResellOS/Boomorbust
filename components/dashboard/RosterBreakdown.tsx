'use client';

import { LEAGUE_STATUS, type RosterBreakdown as RosterBreakdownData } from '@/lib/dashboard/rotation';

// Grade colors — green/yellow/amber (no red/purple; "needs work", not "bad").
const GRADE_COLOR: Record<string, string> = {
  Strong: '#36E7A1',
  Average: '#FBBF24',
  Weak: '#f59e0b',
};

export default function RosterBreakdown({ breakdown }: { breakdown: RosterBreakdownData }) {
  const status = LEAGUE_STATUS[breakdown.status];

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-[13px] py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-text">
          Dynasty GPS
        </span>
        <span
          className="rounded-[3px] px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide"
          style={{ color: status.color, background: `${status.color}1f` }}
        >
          {status.label}
        </span>
      </div>

      <div className="p-3">
        <div className="mb-1.5 font-mono text-[7.5px] uppercase tracking-[1.5px] text-muted">
          Position Grades
        </div>
        <div className="mb-2.5 grid grid-cols-4 gap-1.5">
          {breakdown.positionGrades.map((g) => (
            <div
              key={g.position}
              className="rounded-[6px] border border-border bg-bg/40 px-1.5 py-1.5 text-center"
              title={`${g.have} rostered · ${g.required} starter slot(s)`}
            >
              <div className="font-mono text-[8px] text-muted">{g.position}</div>
              <div
                className="font-figtree text-[11px] font-bold leading-tight"
                style={{ color: GRADE_COLOR[g.grade] ?? '#6b7a99' }}
              >
                {g.grade}
              </div>
              <div className="font-mono text-[8px] text-muted">
                {g.avgTfo > 0 ? g.avgTfo.toFixed(0) : '—'}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[6px] border border-border bg-bg/40 px-2.5 py-2 font-figtree text-[10px] leading-snug text-muted">
          {breakdown.actionSummary}
        </div>
      </div>
    </div>
  );
}
