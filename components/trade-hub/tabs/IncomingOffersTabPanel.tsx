'use client';

import type { TradeHubStatsPayload } from '../types';
import IncomingOffersPanel from '../IncomingOffersPanel';
import SmartCounterPanel from '../SmartCounterPanel';
import TRESuggestionsPanel from '../TRESuggestionsPanel';
import TradeHistoryPanel from '../TradeHistoryPanel';
import TradeHubFooterStatusBar from '../TradeHubFooterStatusBar';

export interface IncomingOffersTabPanelProps {
  stats: TradeHubStatsPayload | null;
  statsLoading: boolean;
}

/**
 * INCOMING OFFERS tab: top row offers + smart counter;
 * bottom row 40% TRE suggestions / 60% trade history + footer status bar from `/api/trades/stats`.
 */
export default function IncomingOffersTabPanel({ stats, statsLoading }: IncomingOffersTabPanelProps) {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4">
      <div className="flex w-full min-w-0 flex-none flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch lg:gap-4">
        <div className="flex w-full min-w-0 flex-col lg:h-full lg:w-[53%] lg:max-w-[53%] lg:shrink-0">
          <IncomingOffersPanel totalOfferCount={stats?.incomingOffers ?? null} />
        </div>
        <div className="flex w-full min-w-0 flex-col lg:h-full lg:w-[47%] lg:max-w-[47%] lg:shrink-0">
          <SmartCounterPanel className="flex h-full min-h-0 w-full max-w-full flex-col lg:max-w-none" />
        </div>
      </div>

      <div className="mt-4 flex w-full shrink-0 flex-col gap-4 lg:flex-row lg:gap-4">
        <div className="w-full lg:w-[40%] lg:max-w-[40%] lg:shrink-0">
          <TRESuggestionsPanel />
        </div>
        <div className="w-full lg:w-[60%] lg:max-w-[60%] lg:shrink-0">
          <TradeHistoryPanel limit={5} />
        </div>
      </div>

      <TradeHubFooterStatusBar stats={stats} loading={statsLoading} />
    </div>
  );
}
