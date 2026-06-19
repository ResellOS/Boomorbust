'use client';

import type { TradeOpportunity } from '@/lib/trade/types';
import { acceptanceColor, bobBadgeStyle } from '@/lib/trade/tradeHubUi';

export default function LeagueWinningMoves({
  opportunities,
  onSelect,
}: {
  opportunities: TradeOpportunity[];
  onSelect: (opp: TradeOpportunity) => void;
}) {
  const cards = opportunities.slice(1, 5);

  if (cards.length === 0) return null;

  return (
    <section>
      <div className="mb-2 font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
        League-Winning Moves
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {cards.map((o) => {
          const badge = bobBadgeStyle(o.bobOpportunityBadge);
          const reason = o.reasonChips[0] ?? o.whyReasons[0] ?? o.portfolioImpactNote;
          return (
            <div
              key={o.id}
              className="min-w-[220px] shrink-0 rounded-[10px] border border-[#1e2640] bg-[#0f1420] p-3"
              style={{ boxShadow: '0 0 16px rgba(54,231,161,0.06)' }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[8px] uppercase text-[#6b7a99]">{o.actionVerb}</span>
                <span
                  className="rounded px-1 py-px font-mono text-[7px] uppercase"
                  style={{ color: badge.color, background: badge.bg }}
                >
                  {o.bobOpportunityBadge}
                </span>
              </div>
              <div className="mt-1 font-figtree text-[14px] font-semibold text-[#e8ecf4]">
                {o.playerName}
              </div>
              <div className="font-mono text-[9px] text-[#6b7a99]">{o.leagueName}</div>
              <div className="mt-2 space-y-0.5 font-mono text-[9px] tabular-nums">
                <div className="text-boom">+{o.championshipImpact.toFixed(1)}% Championship Odds</div>
                <div style={{ color: acceptanceColor(o.acceptanceProbability) }}>
                  {o.acceptanceProbability}% Acceptance
                </div>
              </div>
              <p className="mt-2 line-clamp-2 font-figtree text-[10px] leading-snug text-[#6b7a99]">
                {reason}
              </p>
              <button
                type="button"
                onClick={() => onSelect(o)}
                className="mt-2 font-mono text-[9px] text-boom hover:underline"
              >
                View Details →
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
