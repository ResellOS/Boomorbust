'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import type { ManagerTradeCard } from '@/lib/trade/types';
import { displayArchetypeLabel } from '@/lib/trade/opportunityEngine';
import { managerTendencies } from '@/lib/trade/tradeHubUi';

export default function LeagueIntelPanel({
  manager,
}: {
  manager: ManagerTradeCard | null;
}) {
  if (!manager) {
    return (
      <section className="rounded-[10px] border border-dashed border-[#1e2640] bg-[#0f1420] px-4 py-5">
        <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel
        </h3>
        <p className="mt-2 font-figtree text-[12px] text-[#6b7a99]">
          Building league intelligence… Select a trade partner or opportunity to spotlight manager behavior.
        </p>
      </section>
    );
  }

  const tendencies = managerTendencies(manager);
  const needs = manager.profile.needs ?? [];
  const surplus = manager.profile.surplus ?? [];
  const successProxy = Math.min(95, Math.round(manager.tradeLikelihood * 0.75));

  return (
    <section className="dash-clickable-card overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] dash-boom-glow">
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3 py-2">
        <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          League Intel
        </h3>
        <span className="font-mono text-[8px] text-[#6b7a99]">Manager Spotlight</span>
      </div>

      <div className="grid gap-3 p-3 sm:grid-cols-[1fr_auto]">
        <div>
          <div className="font-figtree text-[15px] font-semibold text-[#e8ecf4]">
            {manager.displayName}
            <span className="font-normal text-[#8b9bb8]"> — {manager.leagueName}</span>
          </div>
          <div className="mt-0.5 font-figtree text-[11px] text-[#A78BFA]">
            {displayArchetypeLabel(manager.profile)}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[9px]">
            <div>
              <div className="text-[#6b7a99]">Needs</div>
              <div className="text-[#e8ecf4]">{needs.slice(0, 3).join(', ') || 'Analyzing…'}</div>
            </div>
            <div>
              <div className="text-[#6b7a99]">Surplus</div>
              <div className="text-[#e8ecf4]">{surplus.slice(0, 3).join(', ') || 'Analyzing…'}</div>
            </div>
          </div>

          <div className="mt-2">
            <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Trade Tendencies</div>
            <ul className="mt-0.5 space-y-0.5">
              {tendencies.map((t) => (
                <li key={t} className="font-figtree text-[10px] text-[#9aa8c4]">· {t}</li>
              ))}
            </ul>
          </div>

          <div className="mt-2 rounded border border-[#1e2640]/50 bg-[#141929]/40 px-2 py-1.5">
            <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Best Approach</div>
            <div className="font-figtree text-[10px] leading-snug text-boom">
              {(manager.profile.pitch_angle ?? 'Lead with draft capital and positional need.').slice(0, 120)}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end justify-between gap-2 sm:min-w-[120px]">
          <div className="text-center">
            <div className="font-mono text-[28px] font-semibold tabular-nums text-boom">
              {successProxy}%
            </div>
            <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Deal Success Rate</div>
            <div className="font-mono text-[8px] text-[#8b9bb8]">{manager.tradeLikelihood}% trade likelihood</div>
          </div>
          <Link
            href={`/leagues/${manager.leagueId}`}
            className="dash-action-btn inline-flex items-center gap-0.5 rounded border border-boom/30 bg-boom/10 px-2.5 py-1.5 font-mono text-[9px] text-boom no-underline"
          >
            View Full Intel <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
