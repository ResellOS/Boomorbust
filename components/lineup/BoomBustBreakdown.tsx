'use client';

import type { BoomBustBreakdown } from './types';

interface Props {
  breakdown: BoomBustBreakdown | null;
  loading: boolean;
}

interface DonutProps {
  total: number;
  boom: number;
  hold: number;
  bust: number;
  label: string;
}

function DonutChart({ total, boom, hold, bust, label }: DonutProps) {
  const R = 38;
  const cx = 50;
  const cy = 50;
  const circumference = 2 * Math.PI * R;

  const boomPct = total > 0 ? boom / total : 0;
  const holdPct = total > 0 ? hold / total : 0;
  const bustPct = total > 0 ? bust / total : 0;

  const boomDash = boomPct * circumference;
  const holdDash = holdPct * circumference;
  const bustDash = bustPct * circumference;
  const gap = 0;

  // Starting offsets (circumference = full circle, start from top = -90deg)
  const boomOffset = circumference * 0.25;
  const holdOffset = boomOffset - boomDash - gap;
  const bustOffset = holdOffset - holdDash - gap;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />
        {/* BOOM arc */}
        {boomPct > 0 && (
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="#36E7A1"
            strokeWidth="8"
            strokeDasharray={`${boomDash} ${circumference - boomDash}`}
            strokeDashoffset={boomOffset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
          />
        )}
        {/* HOLD arc */}
        {holdPct > 0 && (
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="#FBBF24"
            strokeWidth="8"
            strokeDasharray={`${holdDash} ${circumference - holdDash}`}
            strokeDashoffset={holdOffset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
          />
        )}
        {/* BUST arc */}
        {bustPct > 0 && (
          <circle
            cx={cx} cy={cy} r={R}
            fill="none"
            stroke="#EF4444"
            strokeWidth="8"
            strokeDasharray={`${bustDash} ${circumference - bustDash}`}
            strokeDashoffset={bustOffset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '50px 50px' }}
          />
        )}
        {/* Center total */}
        <text
          x={cx} y={cy - 5}
          textAnchor="middle"
          fill="white"
          fontSize="16"
          fontWeight="700"
          fontFamily="JetBrains Mono, monospace"
        >
          {total}
        </text>
        <text
          x={cx} y={cy + 10}
          textAnchor="middle"
          fill="#64748B"
          fontSize="8"
          fontFamily="system-ui"
        >
          Total
        </text>
      </svg>

      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-1">{label}</p>

      {/* Legend */}
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#36E7A1' }} />
          <span className="text-[10px] text-slate-400">{boom} BOOM</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#FBBF24' }} />
          <span className="text-[10px] text-slate-400">{hold} HOLD</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#EF4444' }} />
          <span className="text-[10px] text-slate-400">{bust} BUST</span>
        </div>
      </div>
    </div>
  );
}

export default function BoomBustBreakdownPanel({ breakdown, loading }: Props) {
  return (
    <div className="glass-card p-4 h-full">
      <h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-4">BOOM / BUST BREAKDOWN</h2>

      {loading || !breakdown ? (
        <div className="flex justify-around animate-pulse">
          <div className="w-24 h-28 bg-white/[0.06] rounded-full" />
          <div className="w-24 h-28 bg-white/[0.06] rounded-full" />
        </div>
      ) : (
        <div className="flex justify-around gap-2">
          <DonutChart
            total={breakdown.starterTotal}
            boom={breakdown.starterBoom}
            hold={breakdown.starterHold}
            bust={breakdown.starterBust}
            label="STARTERS"
          />
          <DonutChart
            total={breakdown.benchTotal}
            boom={breakdown.benchBoom}
            hold={breakdown.benchHold}
            bust={breakdown.benchBust}
            label="BENCH"
          />
        </div>
      )}
    </div>
  );
}
