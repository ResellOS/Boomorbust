'use client';

import Link from 'next/link';
import type { TopOpportunityRow } from '@/lib/dashboard/topOpportunities';

export default function TopOpportunitiesPanel({ opportunities }: { opportunities: TopOpportunityRow[] }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <div className="shrink-0 border-b border-border bg-bg px-[13px] py-2">
        <span className="font-figtree text-[10.5px] uppercase tracking-[1.5px] text-text">
          Top Opportunities
        </span>
      </div>
      <div className="px-[13px] py-2.5">
        {opportunities.length === 0 ? (
          <p className="font-figtree text-[11px] text-muted">Opportunities sync with daily tasks.</p>
        ) : (
          opportunities.map((row) => (
            <Link
              key={row.id}
              href={row.playerId ? `/trade?target=${row.playerId}` : '/trade'}
              className="flex items-center justify-between gap-2 border-b border-border/35 py-2 last:border-b-0 no-underline hover:opacity-90"
            >
              <span className="min-w-0 truncate font-figtree text-[12px] text-text">{row.label}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-boom">{row.impact}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
