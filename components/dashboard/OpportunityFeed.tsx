'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  buildOpportunityFeed,
  formatFeedTimeAgo,
  type FeedCategory,
  type OpportunityFeedItem,
} from '@/lib/dashboard/opportunityFeed';
import type { DashboardRotationData } from '@/lib/dashboard/rotation';

const CATEGORY_ICONS: Record<FeedCategory, string> = {
  'NEW EDGE': 'E',
  'BUY WINDOW': 'B',
  'LINEUP EDGE': 'L',
  'VALUE ALERT': 'V',
  'TRADE TREND': 'T',
  'SELL WINDOW': 'S',
};

interface OpportunityFeedProps {
  lineupOpportunity: DashboardRotationData['lineupOpportunity'];
  players: DashboardRotationData['portfolio']['players'];
  tradeTargets: DashboardRotationData['tradeTargets'];
}

export default function OpportunityFeed({
  lineupOpportunity,
  players,
  tradeTargets,
}: OpportunityFeedProps) {
  const items = buildOpportunityFeed({ lineupOpportunity, players, tradeTargets });

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="border-b border-[#1e2640]/80 px-3.5 py-2.5">
        <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Opportunity Feed
        </h3>
        <p className="font-mono text-[8px] text-[#6b7a99]">Actionable intelligence</p>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.length === 0 ? (
          <p className="px-4 py-5 font-figtree text-[11px] text-[#6b7a99]">
            Feed populates as BOB logs trade edges, value shifts, and lineup calls.
          </p>
        ) : (
          items.map((item) => <FeedRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}

function FeedRow({ item }: { item: OpportunityFeedItem }) {
  const inner = (
    <div className="flex gap-2.5 border-b border-[#1e2640]/50 px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-white/[0.02]">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded font-mono text-[10px] font-semibold"
        style={{ color: item.color, background: `${item.color}18`, border: `1px solid ${item.color}30` }}
      >
        {CATEGORY_ICONS[item.category]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span
            className="rounded px-1.5 py-0.5 font-mono text-[7px] uppercase tracking-wide"
            style={{ color: item.color, background: `${item.color}14` }}
          >
            {item.category}
          </span>
          <span className="font-mono text-[8px] tabular-nums text-[#6b7a99]">
            {formatFeedTimeAgo(item.minutesAgo)}
          </span>
        </div>
        <p className="mt-1 font-figtree text-[12px] font-medium leading-snug text-[#e8ecf4]">
          {item.headline}
        </p>
        <p className="mt-0.5 font-figtree text-[10px] leading-snug text-[#6b7a99]">
          {item.explanation}
        </p>
        {(item.metricValue || item.secondaryValue) && (
          <div className="mt-1 flex flex-wrap gap-x-3 font-mono text-[8px] tabular-nums text-[#6b7a99]">
            {item.metricLabel ? (
              <span>
                {item.metricLabel}: <span className="text-[#e8ecf4]">{item.metricValue ?? '—'}</span>
              </span>
            ) : null}
            {item.secondaryLabel ? (
              <span>
                {item.secondaryLabel}: <span className="text-boom">{item.secondaryValue ?? '—'}</span>
              </span>
            ) : null}
          </div>
        )}
        {item.href ? (
          <span className="mt-1.5 inline-flex items-center gap-0.5 font-mono text-[8px] text-boom">
            View <ChevronRight className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link href={item.href} className="block no-underline">
        {inner}
      </Link>
    );
  }
  return inner;
}
