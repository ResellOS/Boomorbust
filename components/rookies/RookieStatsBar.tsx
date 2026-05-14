'use client';

import type { RookieBoardData } from './types';

interface Props {
  data: RookieBoardData | null;
  loading: boolean;
}

function Skeleton() {
  return <div className="animate-pulse bg-white/[0.06] rounded h-9 w-24 mt-1" />;
}

export default function RookieStatsBar({ data, loading }: Props) {
  const cards = [
    { label: 'Rookie Profiles', value: data?.totalProfiles.toString(), color: '#22D3EE' },
    { label: 'Tier 1 Prospects', value: data?.tier1Count.toString(), color: '#22D3EE' },
    { label: 'Hidden Values', value: data?.hiddenValues.toString(), color: '#22D3EE' },
    {
      label: 'Avg RTS Edge',
      value: data ? `+${data.avgRtsEdge.toFixed(1)}` : null,
      color: '#36E7A1',
    },
    {
      label: 'Hit Rate Accuracy',
      value: data ? `${data.hitRate.toFixed(1)}%` : null,
      color: '#22D3EE',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="glass-card p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          {loading || !value ? (
            <Skeleton />
          ) : (
            <p className="text-3xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
              {value}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
