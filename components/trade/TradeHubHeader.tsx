'use client';

import type { TradeLeague } from '@/lib/trade/types';

export type TradeViewMode = 'global' | 'league';

interface TradeHubHeaderProps {
  viewMode: TradeViewMode;
  onViewModeChange: (mode: TradeViewMode) => void;
  leagues: TradeLeague[];
  selectedLeagueId: string;
  onLeagueChange: (leagueId: string) => void;
}

export default function TradeHubHeader({
  viewMode,
  onViewModeChange,
  leagues,
  selectedLeagueId,
  onLeagueChange,
}: TradeHubHeaderProps) {
  const isGlobal = viewMode === 'global';
  const selected = leagues.find((l) => l.id === selectedLeagueId);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-figtree text-2xl leading-none tracking-[-1px] text-[#e8ecf4] md:text-[32px]">
            TRADE HUB
          </h1>
          <p className="mt-1 font-figtree text-[13px] text-[#8b9bb8]">
            Find league-winning trades. Make smarter moves.
          </p>
        </div>
        <div className="inline-flex rounded-[7px] border border-[#1e2640] bg-[#0f1420] p-0.5">
          <button
            type="button"
            onClick={() => onViewModeChange('global')}
            className={`rounded-[5px] px-3 py-1.5 font-figtree text-[12px] font-semibold transition-all ${
              isGlobal ? 'bg-boom/20 text-boom ring-1 ring-boom/40' : 'text-[#6b7a99] hover:text-[#e8ecf4]'
            }`}
          >
            Global View
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('league')}
            className={`rounded-[5px] px-3 py-1.5 font-figtree text-[12px] font-semibold transition-all ${
              !isGlobal ? 'bg-boom/20 text-boom ring-1 ring-boom/40' : 'text-[#6b7a99] hover:text-[#e8ecf4]'
            }`}
          >
            League View
          </button>
        </div>
      </div>

      {!isGlobal && leagues.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLeagueId}
            onChange={(e) => onLeagueChange(e.target.value)}
            className="rounded-[6px] border border-[#1e2640] bg-[#0f1420] px-3 py-1.5 font-figtree text-[13px] text-[#e8ecf4] outline-none focus:border-boom/40"
          >
            {leagues.map((lg) => (
              <option key={lg.id} value={lg.id}>
                {lg.name}
              </option>
            ))}
          </select>
          {selected ? (
            <div className="flex items-center gap-2 font-mono text-[11px] text-[#8b9bb8]">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: selected.dotColor, boxShadow: `0 0 6px ${selected.dotColor}` }}
              />
              <span style={{ color: selected.dotColor }}>{selected.tag}</span>
            </div>
          ) : null}
        </div>
      ) : isGlobal ? (
        <p className="font-mono text-[10px] text-boom/80">● Cross-league best trades</p>
      ) : null}
    </div>
  );
}
