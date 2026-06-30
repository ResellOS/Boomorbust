'use client';

import type { RookieProspect } from './types';

interface Props {
  prospect: RookieProspect | null;
  loading: boolean;
}

function MetricCard({
  label, value, percentile,
}: {
  label: string;
  value: string;
  percentile: number;
}) {
  const barColor = percentile >= 80 ? '#36E7A1' : percentile >= 60 ? '#22D3EE' : percentile >= 40 ? '#FBBF24' : '#EF4444';

  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-1.5">{label}</p>
      <p
        className="text-[22px] font-bold text-white mb-1"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {value}
      </p>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-slate-400">{percentile}th</span>
        <span className="text-[11px] font-semibold" style={{ color: barColor }}>PERCENTILE</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06]">
        <div
          className="h-1.5 rounded-full"
          style={{ width: `${percentile}%`, background: barColor, opacity: 0.8 }}
        />
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="p-3 rounded-xl border border-white/[0.06] animate-pulse space-y-2">
      <div className="h-2 bg-white/[0.06] rounded w-1/2" />
      <div className="h-7 bg-white/[0.06] rounded w-3/4" />
      <div className="h-1.5 bg-white/[0.06] rounded-full" />
    </div>
  );
}

export default function MeasurablesPanel({ prospect, loading }: Props) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-bold text-white tracking-wide uppercase">MEASURABLES COMPARISON</h2>
        <button className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          View All
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : !prospect ? (
        <p className="text-[13px] text-slate-500 py-3 text-center">Select a player to view measurables</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="40-Yard Dash"
            value={prospect.measurables.fortyYard.value}
            percentile={prospect.measurables.fortyYard.percentile}
          />
          <MetricCard
            label="Vertical Jump"
            value={prospect.measurables.vertical.value}
            percentile={prospect.measurables.vertical.percentile}
          />
          <MetricCard
            label="Broad Jump"
            value={prospect.measurables.broadJump.value}
            percentile={prospect.measurables.broadJump.percentile}
          />
          <MetricCard
            label="Arm Length"
            value={prospect.measurables.armLength.value}
            percentile={prospect.measurables.armLength.percentile}
          />
        </div>
      )}
    </div>
  );
}
