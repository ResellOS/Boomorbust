'use client';

import type { TabId } from './types';

interface Tab {
  id:    TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'offers',      label: 'Incoming Offers' },
  { id: 'counter',     label: 'Smart Counter' },
  { id: 'suggestions', label: 'TRE Suggestions' },
  { id: 'history',     label: 'Trade History' },
];

export interface TabNavProps {
  activeTab:    TabId;
  onTabChange:  (tab: TabId) => void;
  offerCount?:  number;
}

export default function TabNav({ activeTab, onTabChange, offerCount }: TabNavProps) {
  return (
    <div
      className="flex items-center gap-0 overflow-x-auto scrollbar-hide"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
      role="tablist"
      aria-label="Trade Hub navigation"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className="relative flex items-center gap-1.5 px-4 py-3 shrink-0 transition-colors duration-150 min-h-[44px]"
            style={{
              fontFamily:    'var(--font-body), Inter, sans-serif',
              fontSize:      13,
              fontWeight:    isActive ? 600 : 400,
              color:         isActive ? '#ffffff' : '#94a3b8',
              background:    'transparent',
              border:        'none',
              cursor:        'pointer',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}
          >
            {tab.label}

            {/* Offer count badge */}
            {tab.id === 'offers' && (offerCount ?? 0) > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full font-mono text-[11px] font-bold"
                style={{
                  width:      18,
                  height:     18,
                  background: '#FBBF24',
                  color:      '#0a0d14',
                }}
              >
                {offerCount}
              </span>
            )}

            {/* Green active underline */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0"
                style={{
                  height:     2,
                  background: '#36E7A1',
                  borderRadius: '1px 1px 0 0',
                }}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
