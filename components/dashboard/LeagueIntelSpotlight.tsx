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
      <div className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-4">
        <h3 className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel Spotlight
        </h3>
        <p className="mt-2 font-mono text-[10px] text-[#6b7a99]">Not enough data yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="border-b border-[#1e2640]/80 px-3 py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel Spotlight
        </span>
      </div>
      <div className="space-y-2.5 px-3 py-3">
        <div>
          <div className="font-figtree text-[14px] font-semibold text-[#e8ecf4]">
            {data.managerName}
            <span className="font-normal text-[#6b7a99]"> — {data.leagueName}</span>
          </div>
        </div>

        <div>
          <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">Archetype</div>
          <div className="font-figtree text-[12px] text-[#A78BFA]">{data.archetype}</div>
        </div>

        {data.signals.length > 0 ? (
          <div>
            <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">Signals</div>
            <ul className="mt-1 space-y-0.5">
              {data.signals.map((s, i) => (
                <li key={i} className="font-figtree text-[10px] leading-snug text-[#6b7a99]">
                  · {s}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">Trade Success Rate</div>
            <div className="font-mono text-[11px] tabular-nums text-[#6b7a99]">
              {data.tradeSuccessRate ?? '—'}
            </div>
            {!data.tradeSuccessRate ? (
              <div className="font-mono text-[7px] text-[#6b7a99]/80">Tracking begins Week 1</div>
            ) : null}
          </div>
          <div>
            <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">Best Approach</div>
            <div className="font-figtree text-[11px] text-boom">{data.bestApproach}</div>
          </div>
        </div>

        <Link
          href={intelHref}
          className="inline-flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline hover:underline"
        >
          View League Intel
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
