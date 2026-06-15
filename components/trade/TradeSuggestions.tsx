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
                  <span className="font-semibold" style={{ color: s.verdictColor }}>Buy</span> low on {s.playerName}
                  {s.managerName ? (
                    <span className="ml-1 font-mono text-[8.5px] text-muted">via {s.managerName}</span>
                  ) : null}
                </>
              ) : (
                <>
                  <span className="font-semibold" style={{ color: s.verdictColor }}>Sell</span> high on {s.playerName}
                </>
              )}
              <span
                className="ml-1.5 rounded-[3px] px-1 py-px font-mono text-[7px] font-bold"
                style={{ color: s.verdictColor, background: `${s.verdictColor}1f` }}
              >
                {s.verdict}
              </span>
            </div>
            <div
              className="min-w-[44px] text-right font-figtree text-[15px] font-bold"
              title="Engine vs market rank delta (scaled)"
              style={{ color: s.verdictColor }}
            >
              +{s.edgeScore.toFixed(1)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
