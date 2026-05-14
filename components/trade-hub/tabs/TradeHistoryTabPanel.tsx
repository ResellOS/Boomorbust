'use client';

import TradeHistoryPanel from '../TradeHistoryPanel';

export default function TradeHistoryTabPanel() {
  return (
    <div className="w-full min-w-0">
      <TradeHistoryPanel limit={15} className="mx-auto w-full max-w-5xl lg:max-w-none" />
    </div>
  );
}
