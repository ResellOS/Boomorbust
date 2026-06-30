'use client';

import type { RookieTabId } from './types';

const TABS: { id: RookieTabId; label: string }[] = [
  { id: 'board',      label: 'ROOKIE BOARD' },
  { id: 'ffig',       label: 'F-FIG GRADES' },
  { id: 'landing',    label: 'LANDING SPOTS' },
  { id: 'sleepers',   label: 'SLEEPERS' },
  { id: 'capital',    label: 'DRAFT CAPITAL' },
  { id: 'measurables',label: 'MEASURABLES' },
  { id: 'film',       label: 'FILM NOTES' },
  { id: 'rankings',   label: 'ROOKIE RANKINGS' },
];

interface Props {
  active: RookieTabId;
  onChange: (id: RookieTabId) => void;
}

export default function RookieTabNav({ active, onChange }: Props) {
  return (
    <div className="flex gap-0 border-b border-white/[0.08] mb-4 overflow-x-auto scrollbar-hide">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-shrink-0 px-4 py-2.5 text-[12px] font-semibold tracking-wider transition-colors whitespace-nowrap"
            style={{
              color: isActive ? '#36E7A1' : '#64748B',
              borderBottom: isActive ? '2px solid #36E7A1' : '2px solid transparent',
              marginBottom: '-1px',
              background: 'transparent',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
