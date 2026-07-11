'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import type { ManagerTradeCard, TradeOpportunity } from '@/lib/trade/types';
import { displayArchetypeLabel } from '@/lib/trade/opportunityEngine';
import AnimatedCard from '@/components/ui/AnimatedCard';
import {
  managerBestAsset,
  recommendedOpeningOffer,
  resolveTradePartners,
  type ResolvedPartnerCard,
} from '@/lib/trade/resolvePartners';

function PartnerCard({
  card,
  onSelect,
}: {
  card: ResolvedPartnerCard;
  onSelect: (m: ManagerTradeCard) => void;
}) {
  const { manager: m, behaviorSignal, bestApproach, isSkeleton } = card;
  const needs = (m.profile.needs ?? []).slice(0, 2).join(', ') || 'Analyzing…';
  const surplus = (m.profile.surplus ?? []).slice(0, 2).join(', ') || 'Analyzing…';

  if (isSkeleton) {
    return (
      <div className="animate-pulse border-b border-[#1e2640]/40 px-3 py-2.5 last:border-b-0">
        <div className="h-3 w-24 rounded bg-[#1e2640]/60" />
        <div className="mt-1.5 h-2 w-32 rounded bg-[#1e2640]/40" />
        <p className="mt-2 font-figtree text-[11px] text-[#6b7a99]">Building manager profile…</p>
      </div>
    );
  }

  const initial = m.displayName.trim().charAt(0).toUpperCase() || '?';

  return (
    <button
      type="button"
      onClick={() => onSelect(m)}
      className="dash-clickable-row w-full border-b border-[#1e2640]/40 px-3 py-2.5 text-left last:border-b-0 hover:dash-boom-glow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface font-mono text-[13px] font-semibold uppercase text-[#e8ecf4]">
            {initial}
          </span>
          <div className="min-w-0">
            <div className="font-figtree text-[13px] font-semibold text-[#e8ecf4]">{m.displayName}</div>
            <div className="font-mono text-[9px] text-[#8b9bb8]">
              {m.leagueName} · <span className="uppercase text-bust">{displayArchetypeLabel(m.profile)}</span>
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-[14px] font-semibold tabular-nums text-boom">{m.tradeLikelihood}%</div>
          <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Likelihood</div>
        </div>
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[9px]">
        <div>
          <span className="text-[#6b7a99]">Needs: </span>
          <span className="text-[#e8ecf4]">{needs}</span>
        </div>
        <div>
          <span className="text-[#6b7a99]">Surplus: </span>
          <span className="text-[#e8ecf4]">{surplus}</span>
        </div>
        <div className="col-span-2">
          <span className="text-[#6b7a99]">Best Asset: </span>
          <span className="text-boom">{managerBestAsset(m)}</span>
        </div>
      </div>

      <div className="mt-1.5 rounded border border-[#1e2640]/50 bg-[#141929]/40 px-2 py-1">
        <div className="font-mono text-[8px] uppercase text-[#6b7a99]">Suggested Opener</div>
        <div className="font-figtree text-[10px] text-[#e8ecf4]">{recommendedOpeningOffer(m)}</div>
      </div>

      <div className="mt-1.5 grid grid-cols-1 gap-0.5">
        <div className="font-mono text-[8px]">
          <span className="text-[#6b7a99]">Behavior: </span>
          <span className="text-[#A78BFA]">{behaviorSignal}</span>
        </div>
        <div className="font-mono text-[8px]">
          <span className="text-[#6b7a99]">Best Approach: </span>
          <span className="text-boom">{bestApproach}</span>
        </div>
      </div>

      <Link
        href={m.leagueId ? `/leagues/${m.leagueId}` : '/trade'}
        onClick={(e) => e.stopPropagation()}
        className="mt-1 inline-flex items-center gap-0.5 font-mono text-[9px] text-boom no-underline"
      >
        View Profile <ChevronRight className="h-3 w-3" />
      </Link>
    </button>
  );
}

export default function BestTradePartners({
  managers,
  opportunities,
  onSelectManager,
}: {
  managers: ManagerTradeCard[];
  opportunities: TradeOpportunity[];
  onSelectManager: (m: ManagerTradeCard) => void;
}) {
  const partners = useMemo(
    () => resolveTradePartners(managers, opportunities, 3).slice(0, 3),
    [managers, opportunities],
  );

  return (
    <section className="flex max-h-[520px] flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="shrink-0 border-b border-[#1e2640]/80 px-3 py-2">
        <h3 className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Best Trade Partners
        </h3>
        <p className="font-mono text-[9px] text-[#6b7a99]">Who to deal with + how to open</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {partners.map((card, index) => (
          <AnimatedCard
            key={`${card.manager.leagueId}-${card.manager.displayName}-${card.manager.sleeperRosterId}`}
            delay={index * 80}
          >
            <PartnerCard card={card} onSelect={onSelectManager} />
          </AnimatedCard>
        ))}
      </div>
    </section>
  );
}
