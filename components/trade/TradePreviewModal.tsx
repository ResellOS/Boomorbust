'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { BobSuggestion, OwnedPick } from '@/lib/trade/types';
import { initialAssetsFromSuggestion } from '@/lib/trade/calculatorAssets';
import TradeCalculator from '@/components/trade/TradeCalculator';

interface TradePreviewModalProps {
  suggestion: BobSuggestion;
  givePicks: OwnedPick[];
  onClose: () => void;
}

export default function TradePreviewModal({ suggestion, givePicks, onClose }: TradePreviewModalProps) {
  const [mounted, setMounted] = useState(false);
  const { give, get } = initialAssetsFromSuggestion(suggestion);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="trade-preview-title"
      >
        <div className="shrink-0 border-b border-border px-4 py-3">
          <div id="trade-preview-title" className="font-figtree text-[15px] font-bold text-text">
            Trade Preview
          </div>
          <div className="mt-0.5 font-figtree text-[12px] text-muted">
            {suggestion.type === 'buy' ? (
              <>
                <span className="font-semibold" style={{ color: suggestion.verdictColor }}>Buy</span> low on{' '}
                {suggestion.playerName}
                {suggestion.managerName ? (
                  <span className="ml-1 font-mono text-[10px]">via {suggestion.managerName}</span>
                ) : null}
              </>
            ) : (
              <>
                <span className="font-semibold" style={{ color: suggestion.verdictColor }}>Sell</span> high on{' '}
                {suggestion.playerName}
              </>
            )}
            <span className="ml-2 font-mono text-[10px] text-muted">· {suggestion.leagueName}</span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TradeCalculator
            key={suggestion.id}
            givePicks={givePicks}
            initialGive={give}
            initialGet={get}
            embedded
          />
        </div>

        <div className="shrink-0 border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[6px] border border-border bg-bg px-4 py-2 font-figtree text-[12px] font-semibold text-text transition-colors hover:border-boom/50 hover:text-boom"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
