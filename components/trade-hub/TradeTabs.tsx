'use client';

import { lazy, Suspense, useCallback, useState } from 'react';
import clsx from 'clsx';

const LazyIncomingOffers = lazy(() => import('./tabs/IncomingOffersTabPanel'));
const LazySmartCounter = lazy(() => import('./tabs/SmartCounterTabPanel'));
const LazyTreSuggestions = lazy(() => import('./tabs/TreSuggestionsTabPanel'));
const LazyTradeHistory = lazy(() => import('./tabs/TradeHistoryTabPanel'));

export type TradeTabId = 'INCOMING_OFFERS' | 'SMART_COUNTER' | 'TRE_SUGGESTIONS' | 'TRADE_HISTORY';

const TABS: { id: TradeTabId; label: string; buttonId: string }[] = [
  { id: 'INCOMING_OFFERS', label: 'INCOMING OFFERS', buttonId: 'trade-tab-incoming-offers' },
  { id: 'SMART_COUNTER', label: 'SMART COUNTER', buttonId: 'trade-tab-smart-counter' },
  { id: 'TRE_SUGGESTIONS', label: 'TRE SUGGESTIONS', buttonId: 'trade-tab-tre-suggestions' },
  { id: 'TRADE_HISTORY', label: 'TRADE HISTORY', buttonId: 'trade-tab-trade-history' },
];

function TabPanelFallback() {
  return (
    <div
      className="min-h-[120px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
      aria-hidden
    />
  );
}

export default function TradeTabs() {
  const [activeTab, setActiveTab] = useState<TradeTabId>('INCOMING_OFFERS');
  const [visited, setVisited] = useState<Set<TradeTabId>>(() => new Set<TradeTabId>(['INCOMING_OFFERS']));

  const selectTab = useCallback((id: TradeTabId) => {
    setActiveTab(id);
    setVisited((prev) => new Set(prev).add(id));
  }, []);

  return (
    <div className="w-full">
      <div
        className="mt-4 flex w-full flex-nowrap items-end justify-start gap-8 overflow-x-auto scrollbar-hide border-b border-white/[0.06]"
        style={{ WebkitOverflowScrolling: 'touch' }}
        role="tablist"
        aria-label="Trade Hub sections"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={tab.buttonId}
              type="button"
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              className={clsx(
                'relative shrink-0 whitespace-nowrap border-0 bg-transparent px-0 pb-0 text-left uppercase tracking-wide transition-colors',
                'min-h-[44px] text-[13px] leading-none',
                isActive ? 'font-medium text-white' : 'font-normal text-[#64748B] hover:text-[#94a3b8]',
              )}
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
            >
              <span className="inline-flex min-h-[44px] items-center">{tab.label}</span>
              {isActive ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-0 left-0 right-0 rounded-[1px]"
                  style={{ height: 2, background: '#36E7A1', boxShadow: '0 0 10px rgba(54,231,161,0.35)' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-4 w-full min-w-0">
        {visited.has('INCOMING_OFFERS') ? (
          <div
            role="tabpanel"
            id="trade-panel-incoming-offers"
            aria-labelledby="trade-tab-incoming-offers"
            hidden={activeTab !== 'INCOMING_OFFERS'}
            className="min-w-0"
          >
            <Suspense fallback={<TabPanelFallback />}>
              <LazyIncomingOffers />
            </Suspense>
          </div>
        ) : null}
        {visited.has('SMART_COUNTER') ? (
          <div
            role="tabpanel"
            id="trade-panel-smart-counter"
            aria-labelledby="trade-tab-smart-counter"
            hidden={activeTab !== 'SMART_COUNTER'}
            className="min-w-0"
          >
            <Suspense fallback={<TabPanelFallback />}>
              <LazySmartCounter />
            </Suspense>
          </div>
        ) : null}
        {visited.has('TRE_SUGGESTIONS') ? (
          <div
            role="tabpanel"
            id="trade-panel-tre-suggestions"
            aria-labelledby="trade-tab-tre-suggestions"
            hidden={activeTab !== 'TRE_SUGGESTIONS'}
            className="min-w-0"
          >
            <Suspense fallback={<TabPanelFallback />}>
              <LazyTreSuggestions />
            </Suspense>
          </div>
        ) : null}
        {visited.has('TRADE_HISTORY') ? (
          <div
            role="tabpanel"
            id="trade-panel-trade-history"
            aria-labelledby="trade-tab-trade-history"
            hidden={activeTab !== 'TRADE_HISTORY'}
            className="min-w-0"
          >
            <Suspense fallback={<TabPanelFallback />}>
              <LazyTradeHistory />
            </Suspense>
          </div>
        ) : null}
      </div>
    </div>
  );
}
