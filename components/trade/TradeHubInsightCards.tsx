'use client';

import type { ManagerTradeCard, MarketTemperatureRow } from '@/lib/trade/types';

export function TradeHubInsightCards({
  marketTemperature,
  managerCards,
}: {
  marketTemperature: MarketTemperatureRow[];
  managerCards: ManagerTradeCard[];
}) {
  const partners = managerCards.slice(0, 4);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-3">
        <div className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Market Temperature
        </div>
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(marketTemperature.length > 0
            ? marketTemperature
            : [
                { position: 'QB', status: 'NEUTRAL', icon: '⚡' },
                { position: 'RB', status: 'BUY WINDOW', icon: '❄️' },
                { position: 'WR', status: 'NEUTRAL', icon: '⚡' },
                { position: 'TE', status: 'RISING', icon: '📈' },
              ]
          ).map((row) => (
            <div key={row.position} className="rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-2 py-2">
              <div className="font-mono text-[9px] uppercase text-[#6b7a99]">{row.position} Market</div>
              <div className="mt-0.5 font-mono text-[11px] text-[#e8ecf4]">
                {row.icon} {row.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-3">
        <div className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Top Trade Partners
        </div>
        <p className="mt-0.5 font-mono text-[9px] text-[#6b7a99]">
          Most likely managers to complete a deal this week.
        </p>
        <div className="mt-2 space-y-1.5">
          {partners.length === 0 ? (
            <p className="font-figtree text-[11px] text-[#6b7a99]">Manager profiles syncing…</p>
          ) : (
            partners.map((m, i) => (
              <div key={`${m.leagueId}-${m.sleeperRosterId}`} className="flex items-center justify-between">
                <span className="font-figtree text-[12px] text-[#e8ecf4]">
                  {i + 1}. {m.displayName}
                </span>
                <span className="font-mono text-[12px] tabular-nums text-boom">{m.tradeLikelihood}%</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
