'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import type { TradeLeague, TradeOffer } from '@/lib/trade/types';
import PlayerAvatar from '@/components/trade/PlayerAvatar';

interface TradeSidebarProps {
  leagues: TradeLeague[];
  topOffer: TradeOffer | null;
}

export default function TradeSidebar({ leagues, topOffer }: TradeSidebarProps) {
  const copyTooltip = () => {
    toast.info('Copy & Send on Sleeper — paste the offer in Sleeper to accept.');
  };

  return (
    <aside className="row-start-2 flex flex-col overflow-hidden border-r border-border bg-surface">
      <div className="shrink-0 px-[15px] pb-[3px] pt-[11px] font-figtree text-[12px] font-extrabold uppercase tracking-[1.5px] text-muted">
        My Leagues
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leagues.map((league) => (
          <Link
            key={league.id}
            href={`/leagues/${league.id}`}
            className="flex items-center gap-[9px] px-[15px] py-[7px] text-inherit no-underline transition-colors hover:bg-white/[0.025]"
          >
            <div
              className="h-[7px] w-[7px] shrink-0 rounded-full"
              style={{ background: league.dotColor }}
            />
            <span className="min-w-0 flex-1 truncate font-figtree text-[13.5px] font-medium">
              {league.name}
            </span>
            <span
              className={`shrink-0 whitespace-nowrap rounded-[3px] px-[7px] py-0.5 font-mono text-[9px] font-bold ${
                league.tag === 'Contender'
                  ? 'bg-boom/10 text-boom'
                  : 'bg-bust/10 text-bust'
              }`}
            >
              {league.tag}
            </span>
          </Link>
        ))}
      </div>

      {topOffer ? (
        <div className="mx-2.5 mb-1.5 mt-2.5 shrink-0 rounded-lg border border-border bg-surface2 p-3">
          <div className="mb-0.5 font-mono text-[8.5px] uppercase tracking-[2px] text-muted">
            Quick Action
          </div>
          <div className="mb-px font-figtree text-[12px] font-bold text-boom">
            Top Offer — Action Required
          </div>
          <div className="mb-2 flex justify-between font-mono text-[9.5px] text-muted">
            <span className="text-boom">{topOffer.leagueName}</span>
            <span>{topOffer.timeAgo}</span>
          </div>
          <div className="mb-2.5 flex gap-2">
            {topOffer.receivePlayers.slice(0, 1).map((p) => (
              <div key={p.playerId} className="flex items-center gap-[7px]">
                <PlayerAvatar playerId={p.playerId} name={p.name} size={34} borderColor="#36E7A1" />
                <div>
                  <div className="font-figtree text-[12px] font-semibold text-text">{p.name}</div>
                  <div className="font-mono text-[9px] text-muted">
                    {p.position} · {p.team}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mb-1 font-mono text-[8.5px] uppercase tracking-wide text-muted">
            You Give Up
          </div>
          <div className="mb-2.5 flex flex-col gap-1">
            {topOffer.givePlayers.map((p) => (
              <div key={p.playerId} className="flex items-center gap-[7px]">
                <PlayerAvatar playerId={p.playerId} name={p.name} size={28} borderColor="#A78BFA" textColor="#A78BFA" />
                <div>
                  <div className="font-figtree text-[11.5px] font-semibold text-text">{p.name}</div>
                  <div className="font-mono text-[9px] text-muted">
                    {p.position} · {p.team}
                  </div>
                </div>
              </div>
            ))}
            {topOffer.givePicks.map((pick, i) => (
              <div key={`pick-${i}`} className="flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-0.5 font-mono text-[9.5px]">
                <span className="rounded bg-bust/10 px-1.5 py-px text-[9px] font-bold text-bust">
                  {pick.label}
                </span>
                <span className="text-muted">{pick.season} Round Pick</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-[5px]">
            <button
              type="button"
              title="Copy & Send on Sleeper"
              onClick={copyTooltip}
              className="w-full rounded-md bg-boom py-2 text-center font-figtree text-[12px] font-bold uppercase tracking-wide text-bg"
            >
              Accept
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-bust bg-transparent py-2 text-center font-figtree text-[12px] font-bold uppercase tracking-wide text-bust"
            >
              Counter
            </button>
            <button
              type="button"
              className="w-full rounded-md border border-[#ef4444]/30 bg-transparent py-2 text-center font-figtree text-[12px] font-bold uppercase tracking-wide text-[#ef4444]"
            >
              Decline
            </button>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
