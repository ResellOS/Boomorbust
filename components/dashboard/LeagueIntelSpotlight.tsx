'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { LeagueIntelSpotlight as LeagueIntelData } from '@/lib/dashboard/leagueIntel';

export default function LeagueIntelSpotlight({
  data,
  intelHref = '/leagues',
}: {
  data: LeagueIntelData | null;
  intelHref?: string;
}) {
  if (!data) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-3">
        <h3 className="font-figtree text-[10.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel Spotlight
        </h3>
        <p className="mt-1.5 font-mono text-[10px] text-[#6b7a99]">Not enough data yet</p>
      </div>
    );
  }

  return (
    <Link
      href={intelHref}
      className="dash-clickable-card block overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] no-underline"
    >
      <div className="border-b border-[#1e2640]/80 px-3 py-1.5">
        <span className="font-figtree text-[10.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel Spotlight
        </span>
      </div>
      <div className="space-y-2 px-3 py-2.5">
        <div className="font-figtree text-[14px] font-semibold leading-snug text-[#e8ecf4]">
          {data.managerName}
          <span className="font-normal text-[#8b9bb8]"> — {data.leagueName}</span>
        </div>

        <div>
          <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">Archetype</div>
          <div className="font-figtree text-[12px] text-[#A78BFA]">{data.archetype}</div>
        </div>

        {data.signals.length > 0 ? (
          <div>
            <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">Signals</div>
            <ul className="mt-0.5 space-y-0.5">
              {data.signals.slice(0, 3).map((s, i) => (
                <li key={i} className="font-figtree text-[11px] leading-snug text-[#9aa8c4]">
                  · {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">Best Approach</div>
          <div className="font-figtree text-[12px] text-boom">{data.bestApproach}</div>
        </div>

        {data.tradeSuccessRate ? (
          <div className="font-mono text-[10px] text-[#8b9bb8]">
            Trade Success Rate: <span className="text-boom">{data.tradeSuccessRate}</span>
          </div>
        ) : null}

        <span className="inline-flex items-center gap-0.5 font-mono text-[10px] text-boom">
          View League Intel
          <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </Link>
  );
}
