'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';

export type TradeQuickAction =
  | 'buy_low'
  | 'sell_high'
  | 'contender'
  | 'rebuild'
  | 'target_wr'
  | 'target_rb';

const QUICK_ACTIONS: { id: TradeQuickAction; label: string }[] = [
  { id: 'buy_low', label: 'Find Buy Lows' },
  { id: 'sell_high', label: 'Sell Aging Assets' },
  { id: 'contender', label: 'Build Contender Package' },
  { id: 'rebuild', label: 'Find Rebuild Trades' },
  { id: 'target_wr', label: 'Target WR' },
  { id: 'target_rb', label: 'Target RB' },
];

export default function AiTradeAssistant({
  onQuickAction,
}: {
  onQuickAction?: (action: TradeQuickAction) => void;
}) {
  const [query, setQuery] = useState('');

  return (
    <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-2.5">
      <div className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
        AI Trade Assistant
      </div>
      <p className="font-mono text-[8px] text-[#6b7a99]">Quick filters or ask Dynasty Coach</p>
      <div className="mt-2 flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Ask: "Who should I sell high?" or "Find me an RB upgrade."'
          className="min-w-0 flex-1 rounded-md border border-[#1e2640] bg-[#141929] px-2.5 py-1.5 font-figtree text-[11px] text-[#e8ecf4] outline-none placeholder:text-[#6b7a99] focus:border-boom/40"
        />
        <Link
          href={query.trim() ? `/dashboard/coach?q=${encodeURIComponent(query.trim())}` : '/dashboard/coach'}
          className="dash-action-btn flex shrink-0 items-center gap-1 rounded-md border border-boom/30 bg-boom/10 px-3 py-1.5 font-mono text-[9px] text-boom no-underline"
        >
          <Send className="h-3 w-3" />
          Send
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onQuickAction?.(a.id)}
            className="dash-action-btn rounded border border-[#1e2640] px-2 py-0.5 font-mono text-[8px] text-[#8b9bb8] hover:border-boom/40 hover:text-boom"
          >
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
