'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { BobSuggestion } from '@/lib/trade/types';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';

interface TradeSuggestionsProps {
  suggestions: BobSuggestion[];
  onSuggestionClick?: (suggestion: BobSuggestion) => void;
}

function WhyBullets({ reasons, mobileOpen }: { reasons: string[]; mobileOpen: boolean }) {
  if (reasons.length === 0) return null;
  return (
    <ul
      className={`mt-1.5 space-y-0.5 ${mobileOpen ? 'block' : 'hidden'} md:block`}
    >
      {reasons.map((reason) => (
        <li
          key={reason}
          className="flex items-start gap-1.5 font-mono text-[9.5px] leading-snug text-muted"
        >
          <span className="mt-[3px] h-1 w-1 shrink-0 rounded-full bg-muted/60" aria-hidden />
          {reason}
        </li>
      ))}
    </ul>
  );
}

function SuggestionRow({
  s,
  onSuggestionClick,
}: {
  s: BobSuggestion;
  onSuggestionClick?: (suggestion: BobSuggestion) => void;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const reasons = s.whyReasons ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSuggestionClick?.(s)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSuggestionClick?.(s);
        }
      }}
      className="flex w-full cursor-pointer items-start gap-2.5 border-b border-border/40 px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.03]"
    >
      <div className="relative mt-0.5 h-[30px] w-[30px] shrink-0 overflow-hidden rounded-full border border-border bg-surface2">
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${s.playerId}.jpg`}
          alt={s.playerName}
          width={30}
          height={30}
          unoptimized
          className="h-full w-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="font-figtree text-[12px] text-text">
            {s.type === 'buy' ? (
              <>
                <span className="font-semibold" style={{ color: s.verdictColor }}>
                  Buy
                </span>{' '}
                low on {s.playerName}
                {s.managerName ? (
                  <span className="ml-1 font-mono text-[9.5px] text-muted">via {s.managerName}</span>
                ) : null}
              </>
            ) : (
              <>
                <span className="font-semibold" style={{ color: s.verdictColor }}>
                  Sell
                </span>{' '}
                high on {s.playerName}
              </>
            )}
            <span
              className="ml-1.5 rounded-[3px] px-1 py-px font-mono text-[8px] font-bold"
              style={{ color: s.verdictColor, background: `${s.verdictColor}1f` }}
            >
              {formatMarketVerdictLabel(s.verdict)}
            </span>
          </div>
          <div
            className="shrink-0 text-right font-figtree text-[16px] font-bold"
            title="Engine vs market rank delta (scaled)"
            style={{ color: s.verdictColor }}
          >
            +{s.edgeScore.toFixed(1)}
          </div>
        </div>

        {reasons.length > 0 ? (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setWhyOpen((v) => !v);
              }}
              className="mt-1 font-mono text-[9px] text-muted underline-offset-2 hover:text-text hover:underline md:hidden"
            >
              {whyOpen ? 'Hide why' : 'Why?'}
            </button>
            <WhyBullets reasons={reasons} mobileOpen={whyOpen} />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function TradeSuggestions({ suggestions, onSuggestionClick }: TradeSuggestionsProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="shrink-0 border-b border-border bg-bg px-3 py-2">
        <div className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
          BOB Suggested Trades
        </div>
        <div className="font-mono text-[9px] text-muted">Proactive deals found by BOB Engine</div>
      </div>
      {suggestions.length === 0 ? (
        <div className="px-3 py-4 font-figtree text-[12px] text-muted">No suggestions yet.</div>
      ) : (
        suggestions.map((s) => (
          <SuggestionRow
            key={s.playerId}
            s={s}
            onSuggestionClick={onSuggestionClick}
          />
        ))
      )}
    </div>
  );
}
