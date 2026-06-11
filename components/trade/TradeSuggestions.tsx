import Image from 'next/image';
import type { BobSuggestion } from '@/lib/trade/types';

interface TradeSuggestionsProps {
  suggestions: BobSuggestion[];
}

export default function TradeSuggestions({ suggestions }: TradeSuggestionsProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="shrink-0 border-b border-border bg-bg px-3 py-2">
        <div className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
          BOB Suggested Trades
        </div>
        <div className="font-mono text-[8px] text-muted">Proactive deals found by BOB Engine</div>
      </div>
      {suggestions.length === 0 ? (
        <div className="px-3 py-4 font-figtree text-[11px] text-muted">No suggestions yet.</div>
      ) : (
        suggestions.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2.5 border-b border-border/40 px-3 py-2 last:border-b-0"
          >
            <div className="relative h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full border border-border bg-surface2">
              <Image
                src={`https://sleepercdn.com/content/nfl/players/thumb/${s.playerId}.jpg`}
                alt={s.playerName}
                width={30}
                height={30}
                unoptimized
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1 font-figtree text-[11px] text-text">
              {s.type === 'buy' ? (
                <>
                  <span className="font-semibold text-boom">Buy</span> low on {s.playerName}
                </>
              ) : (
                <>
                  <span className="font-semibold text-bust">Sell</span> high on {s.playerName}
                </>
              )}
            </div>
            {s.targetName ? (
              <div className="flex items-center gap-1.5">
                <div className="relative h-[26px] w-[26px] overflow-hidden rounded-full border border-border bg-surface2">
                  {s.targetPlayerId ? (
                    <Image
                      src={`https://sleepercdn.com/content/nfl/players/thumb/${s.targetPlayerId}.jpg`}
                      alt={s.targetName}
                      width={26}
                      height={26}
                      unoptimized
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <span className="font-figtree text-[11px] font-medium text-text">{s.targetName}</span>
              </div>
            ) : null}
            <div className="min-w-[44px] text-right font-figtree text-[15px] font-bold text-boom">
              +{s.edgeScore.toFixed(1)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
