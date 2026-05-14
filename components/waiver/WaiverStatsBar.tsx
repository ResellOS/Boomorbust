'use client';

import { useEffect, useState } from 'react';
import type { WaiverRadarData } from './types';

interface Props {
  data: WaiverRadarData | null;
  loading: boolean;
}

function Skeleton({ w }: { w: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded h-9 ${w}`} />;
}

function CountdownTimer({ targetMs }: { targetMs: number }) {
  const [display, setDisplay] = useState('—');

  useEffect(() => {
    function tick() {
      const diff = targetMs - Date.now();
      if (diff <= 0) { setDisplay('Now'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setDisplay(d > 0 ? `${d}d ${h}h` : `${h}h ${m}m`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [targetMs]);

  return <span style={{ fontFamily: 'JetBrains Mono, monospace' }}>{display}</span>;
}

export default function WaiverStatsBar({ data, loading }: Props) {
  const cards = [
    {
      label: 'Available Players',
      value: loading || !data ? null : data.availableCount.toString(),
      color: '#22D3EE',
    },
    {
      label: 'Roster Gaps',
      value: loading || !data ? null : data.rosterGaps.filter((g) => g.needLevel !== 'Low').length.toString(),
      color: '#22D3EE',
    },
    {
      label: 'Avg BBSM Score',
      value: loading || !data ? null : `+${data.avgBbsm.toFixed(1)}`,
      color: '#36E7A1',
    },
    {
      label: 'Hit Rate (Last 30 Days)',
      value: loading || !data ? null : `${data.hitRate}%`,
      color: '#22D3EE',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map(({ label, value, color }) => (
        <div key={label} className="glass-card p-4">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          {!value ? (
            <Skeleton w="w-20" />
          ) : (
            <p
              className="text-3xl font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace', color }}
            >
              {value}
            </p>
          )}
        </div>
      ))}

      {/* Next Waiver Run — countdown */}
      <div className="glass-card p-4 col-span-2 sm:col-span-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Next Waiver Run</p>
        {loading || !data ? (
          <Skeleton w="w-20" />
        ) : (
          <p className="text-3xl font-bold text-white">
            <CountdownTimer targetMs={data.nextWaiverMs} />
          </p>
        )}
      </div>
    </div>
  );
}
