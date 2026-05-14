'use client';

import type { ProfileData } from '@/app/api/settings/profile/route';

interface DonutProps {
  label:   string;
  current: number;
  max:     number;
  color:   string;
}

function UsageDonut({ label, current, max, color }: DonutProps) {
  const r        = 42;
  const cx       = 56;
  const cy       = 56;
  const circ     = 2 * Math.PI * r;
  const fill     = Math.min(1, current / max);
  const dashFill = fill * circ;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 112, height: 112 }}>
        <svg width="112" height="112" viewBox="0 0 112 112">
          {/* Track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          {/* Fill */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={`${dashFill} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ filter: `drop-shadow(0 0 5px ${color}70)` }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p
            className="text-[18px] font-bold leading-none"
            style={{ fontFamily: 'JetBrains Mono, monospace', color }}
          >
            {current.toLocaleString()}
          </p>
          <p className="text-[9px] text-slate-500 mt-0.5">of {max.toLocaleString()}</p>
        </div>
      </div>
      <p className="text-[10px] text-slate-400 text-center leading-tight max-w-[90px]">{label}</p>
    </div>
  );
}

interface Props {
  usage:       ProfileData['usage'];
  renewsLabel: string;
}

const DONUT_COLORS = ['#36E7A1', '#22D3EE', '#A78BFA', '#FBBF24'];

export default function UsageDonuts({ usage, renewsLabel }: Props) {
  const items = [
    { label: 'Players Tracked',  ...usage.playersTracked },
    { label: 'Trade Analyses',   ...usage.tradeAnalyses },
    { label: 'AI Queries',       ...usage.aiQueries },
    { label: 'Reports Exported', ...usage.reportsExported },
  ];

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-5">USAGE OVERVIEW</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 justify-items-center">
        {items.map((item, i) => (
          <UsageDonut
            key={item.label}
            label={item.label}
            current={item.current}
            max={item.max}
            color={DONUT_COLORS[i]}
          />
        ))}
      </div>

      <p className="text-[10px] text-slate-500 mt-5 flex items-center gap-1.5">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <circle cx="5.5" cy="5.5" r="4.5" stroke="#64748B" strokeWidth="1"/>
          <path d="M5.5 3.5v2.5l1.5 1" stroke="#64748B" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        Next Reset: {renewsLabel}
      </p>
    </div>
  );
}
