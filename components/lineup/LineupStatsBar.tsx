'use client';

import type { OptimalLineupData, WeatherOutlook } from './types';

interface Props {
  data: OptimalLineupData | null;
  loading: boolean;
}

function WeatherIcon({ outlook }: { outlook: WeatherOutlook }) {
  if (outlook === 'RAIN') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3C8.24 3 6 5.24 6 8c0 .34.04.67.1 1H5a3 3 0 100 6h12a3 3 0 000-6h-.1c.06-.33.1-.66.1-1 0-2.76-2.24-5-5-5z" fill="#FBBF24" opacity="0.8"/>
        <line x1="7" y1="17" x2="6" y2="20" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="11" y1="17" x2="10" y2="20" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="15" y1="17" x2="14" y2="20" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  if (outlook === 'SNOW') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M11 3C8.24 3 6 5.24 6 8c0 .34.04.67.1 1H5a3 3 0 100 6h12a3 3 0 000-6h-.1c.06-.33.1-.66.1-1 0-2.76-2.24-5-5-5z" fill="#93c5fd" opacity="0.8"/>
        <circle cx="8" cy="18" r="1" fill="#bfdbfe"/>
        <circle cx="12" cy="18" r="1" fill="#bfdbfe"/>
        <circle cx="16" cy="18" r="1" fill="#bfdbfe"/>
      </svg>
    );
  }
  if (outlook === 'WIND') {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 9h12a3 3 0 000-6 3 3 0 00-3 3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 13h8a3 3 0 010 6 3 3 0 01-3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M3 11h15" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 3C8.24 3 6 5.24 6 8c0 .34.04.67.1 1H5a3 3 0 100 6h12a3 3 0 000-6h-.1c.06-.33.1-.66.1-1 0-2.76-2.24-5-5-5z" fill="#36E7A1" opacity="0.9"/>
    </svg>
  );
}

function weatherLabel(outlook: WeatherOutlook): { label: string; color: string } {
  switch (outlook) {
    case 'RAIN': return { label: 'RAIN', color: '#FBBF24' };
    case 'SNOW': return { label: 'SNOW', color: '#93c5fd' };
    case 'WIND': return { label: 'WIND', color: '#9ca3af' };
    case 'MIXED': return { label: 'MIXED', color: '#FBBF24' };
    default: return { label: 'GOOD', color: '#36E7A1' };
  }
}

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-white/[0.06] rounded ${className ?? ''}`} />;
}

export default function LineupStatsBar({ data, loading }: Props) {
  const wl = weatherLabel(data?.weatherOutlook ?? 'GOOD');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {/* Projected Points */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Projected Points</p>
        {loading || !data ? (
          <Skeleton className="h-8 w-24 mt-1" />
        ) : (
          <p className="font-mono text-3xl font-bold text-cyan-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {data.totalProjected.toFixed(1)}
          </p>
        )}
      </div>

      {/* Optimal Record */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Optimal Record</p>
        {loading || !data ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="font-mono text-3xl font-bold text-white" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {data.optimalRecord}
          </p>
        )}
      </div>

      {/* Lineup Confidence */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Lineup Confidence</p>
        {loading || !data ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <p className="font-mono text-3xl font-bold text-cyan-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {data.lineupConfidence}%
          </p>
        )}
      </div>

      {/* TRE Edge */}
      <div className="glass-card p-4">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">TRE Edge</p>
        {loading || !data ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p
            className="font-mono text-3xl font-bold"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: data.totalTreEdge >= 0 ? '#36E7A1' : '#EF4444',
            }}
          >
            {data.totalTreEdge >= 0 ? '+' : ''}{data.totalTreEdge.toFixed(1)}
          </p>
        )}
      </div>

      {/* Weather Outlook */}
      <div className="glass-card p-4 col-span-2 sm:col-span-1">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Weather Outlook</p>
        {loading || !data ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <WeatherIcon outlook={data.weatherOutlook} />
            <p
              className="font-mono text-2xl font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: wl.color }}
            >
              {wl.label}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
