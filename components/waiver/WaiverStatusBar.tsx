'use client';

import type { WaiverRadarData } from './types';

interface Props {
  data: WaiverRadarData | null;
  loading: boolean;
}

export default function WaiverStatusBar({ data, loading }: Props) {
  const items = [
    {
      label: 'TRE ENGINE STATUS',
      value: 'Optimal',
      sub: 'Last run: 2m ago',
      color: '#36E7A1',
    },
    {
      label: 'WAIVER ACCURACY',
      value: loading || !data ? '—' : `${data.hitRate.toFixed(1)}%`,
      sub: 'Elite',
      color: '#22D3EE',
    },
    {
      label: 'HITS THIS SEASON',
      value: loading || !data ? '—' : data.hitsThisSeason.toString(),
      sub: 'Top 7%',
      color: '#FBBF24',
    },
    {
      label: 'PLAYERS ADDED',
      value: loading || !data ? '—' : data.totalPlayersAdded.toString(),
      sub: 'Across All Leagues',
      color: '#A78BFA',
    },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.06]"
      style={{ background: 'rgba(10,13,20,0.95)', backdropFilter: 'blur(12px)' }}
    >
      <div className="max-w-[1400px] mx-auto px-4 py-2 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(({ label, value, sub, color }) => (
          <div key={label} className="flex flex-col">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
            <span className="text-[16px] font-bold mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
              {value}
            </span>
            <span className="text-[11px] text-slate-500">{sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
