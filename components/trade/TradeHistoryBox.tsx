import type { TradeHistoryRow } from '@/lib/trade/types';
import { tradeVerdictHistClass } from '@/lib/trade/verdict';

interface TradeHistoryBoxProps {
  history: TradeHistoryRow[];
}

export default function TradeHistoryBox({ history }: TradeHistoryBoxProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="shrink-0 border-b border-border bg-bg px-3 py-2">
        <div className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
          Trade History
        </div>
        <div className="font-mono text-[8px] text-muted">Recent completed trades</div>
      </div>
      {history.length === 0 ? (
        <div className="px-3 py-4 font-figtree text-[11px] text-muted">No trade history yet.</div>
      ) : (
        history.map((row) => (
          <div
            key={row.id}
            className="flex items-center gap-2 border-b border-border/40 px-3 py-[7px] text-[11px] last:border-b-0"
          >
            <span className="min-w-[36px] font-mono text-[8.5px] text-muted">{row.timeAgo}</span>
            <span className="flex-1 font-figtree text-[11px] text-text">
              <span className="font-semibold">{row.gaveName}</span>
              <span className="mx-1 text-muted">→</span>
              {row.receivedDisplay}
            </span>
            <span className={`whitespace-nowrap font-figtree text-[11px] font-bold ${tradeVerdictHistClass(row.verdict)}`}>
              {row.verdict}{' '}
              {row.edgeScore > 0 ? '+' : ''}
              {row.edgeScore.toFixed(1)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
