import type { TradePageFooter } from '@/lib/trade/types';

interface TradeFooterProps {
  footer: TradePageFooter;
}

export default function TradeFooter({ footer }: TradeFooterProps) {
  return (
    <footer
      className="col-span-2 row-start-3 grid border-t border-border/50 bg-bg/[0.98]"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', height: 28 }}
    >
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <span className="h-1.5 w-1.5 shrink-0 animate-dashboard-pulse rounded-full bg-boom" />
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">Engine Status</div>
          <div className="font-figtree text-sm font-bold text-boom">{footer.engineStatus}</div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">Last run: 2 min ago</span>
      </div>
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Smart Counter Accuracy
          </div>
          <div className="font-figtree text-sm font-bold text-text">
            {footer.smartCounterAccuracy != null ? `${footer.smartCounterAccuracy}%` : '—'}
          </div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">
          {footer.smartCounterAccuracy != null ? 'Elite' : 'No data yet'}
        </span>
      </div>
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Suggestion Success Rate
          </div>
          <div className="font-figtree text-sm font-bold text-boom">
            {footer.suggestionSuccessRate != null ? `${footer.suggestionSuccessRate}%` : '—'}
          </div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">
          {footer.suggestionSuccessRate != null ? 'High' : 'No data yet'}
        </span>
      </div>
      <div className="flex h-full items-center gap-2 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">Trade Volume</div>
          <div className="font-figtree text-sm font-bold text-text">
            {footer.tradeVolumeThisMonth}
          </div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">This Month</span>
      </div>
    </footer>
  );
}
