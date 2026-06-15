'use client';

import type { LineupOpportunity } from '@/lib/dashboard/rotation';

// League-independent: the single biggest bench-over-starter projection edge
// across all of the user's rosters. Hidden entirely when there's no data
// (e.g. offseason with no lineups set).
export default function LineupOpportunityBanner({
  opportunity,
}: {
  opportunity: LineupOpportunity | null;
}) {
  if (!opportunity) return null;
  const o = opportunity;

  return (
    <div className="flex items-center gap-3 rounded-[8px] border border-boom/40 bg-boom/[0.06] px-3.5 py-2">
      <span className="shrink-0 rounded-[4px] bg-boom/15 px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-[1px] text-boom">
        Biggest Lineup Opportunity
      </span>
      <span className="min-w-0 flex-1 truncate font-figtree text-[12px] text-text">
        Start <span className="font-bold text-boom">{o.benchName}</span> ({o.benchProj.toFixed(1)}) over{' '}
        <span className="font-semibold">{o.starterName}</span> ({o.starterProj.toFixed(1)}) at {o.position}
        <span className="text-muted"> · {o.leagueName}</span>
      </span>
      <span className="shrink-0 font-mono text-[14px] font-bold text-boom">+{o.gap.toFixed(1)}</span>
    </div>
  );
}
