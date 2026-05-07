'use client';

import { Star, TrendingUp } from 'lucide-react';

interface Props {
  player: {
    name: string;
    position: string;
    team: string;
    photoUrl?: string;
  };
  /** Headline status, e.g. "MVP week". */
  status: string;
  /** Headline numeric as single string, e.g. "10906 KTC" (legacy). */
  metric?: string;
  /** Large number for mock split typography. */
  metricMain?: string;
  /** Suffix after metricMain, e.g. " KTC". */
  metricSuffix?: string;
  /** Tactical sub-line. */
  subline?: string;
  /** League context for rotation, e.g. "The Greatest on Paper". */
  leagueLabel?: string;
  /** Share of your team's points this week (0–100). */
  winSharePct?: number;
  /** Last few KTC snapshots (oldest → newest) for sparkline. */
  sparklineValues?: number[];
  className?: string;
}

const POS_COLORS: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FEBC2E',
  TE: '#A78BFA',
};

function PerformanceSparkline({ values }: { values: number[] }) {
  const v = values.filter((n) => Number.isFinite(n));
  if (v.length < 2) return null;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const range = max - min || 1;
  const w = 88;
  const h = 28;
  const pad = 3;
  const pts = v.map((n, i) => ({
    x: pad + (i / (v.length - 1)) * (w - pad * 2),
    y: pad + (1 - (n - min) / range) * (h - pad * 2),
  }));
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return (
    <svg width={w} height={h} className="shrink-0" aria-hidden>
      <path
        d={d}
        fill="none"
        stroke="#36E7A1"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter:
            'drop-shadow(0 0 6px rgba(54,231,161,0.65)) drop-shadow(0 0 14px rgba(54,231,161,0.35))',
        }}
      />
    </svg>
  );
}

export default function StarTistCard({
  player,
  status,
  metric,
  metricMain,
  metricSuffix = ' KTC',
  subline = '+1 next best points',
  leagueLabel,
  winSharePct,
  sparklineValues,
  className = '',
}: Props) {
  const posColor = POS_COLORS[player.position] ?? '#94A3B8';
  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`glass-panel p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <Star className="w-3 h-3 text-[#FEBC2E]" />
          Portfolio MVP
        </h3>
        {typeof winSharePct === 'number' && (
          <span className="text-[9px] font-mono-tactical text-[#36E7A1] font-black" style={{ textShadow: '0 0 10px rgba(54,231,161,0.4)' }}>
            {winSharePct.toFixed(0)}% share
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {player.photoUrl ? (
          <img
            src={player.photoUrl}
            alt={player.name}
            className="w-16 h-16 rounded-full object-cover border border-white/10"
            style={{
              filter:
                'drop-shadow(0 0 12px rgba(54,231,161,0.45)) drop-shadow(0 0 24px rgba(54,231,161,0.2))',
            }}
          />
        ) : (
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-sm font-black font-mono-tactical shrink-0"
            style={{
              color: posColor,
              border: `1.5px solid ${posColor}40`,
              background: `${posColor}15`,
            }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white truncate">{player.name}</div>
          <div className="text-[10px] text-slate-500 font-mono-tactical">
            {player.position} · {player.team}
          </div>
          {leagueLabel && (
            <div className="text-[9px] text-slate-600 font-mono-tactical truncate mt-0.5">
              {leagueLabel}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.04]">
        <div
          className="text-[10px] font-black uppercase tracking-widest font-mono-tactical text-[#36E7A1]"
          style={{ textShadow: '0 0 12px rgba(54,231,161,0.45), 0 0 24px rgba(54,231,161,0.2)' }}
        >
          {status}
        </div>
        <div className="flex items-end gap-3 mt-1.5 flex-wrap">
          <TrendingUp
            className="w-5 h-5 shrink-0 mb-1 text-[#36E7A1]"
            style={{ filter: 'drop-shadow(0 0 8px rgba(54,231,161,0.55))' }}
            aria-hidden
          />
          {metricMain != null && metricMain !== '' ? (
            <div className="flex items-end gap-3 min-w-0">
              <div className="flex items-baseline gap-1 leading-none">
                <span
                  className="text-3xl font-black font-mono-tactical tracking-tight text-[#36E7A1]"
                  style={{ textShadow: '0 0 18px rgba(54,231,161,0.5), 0 0 40px rgba(54,231,161,0.2)' }}
                >
                  {metricMain}
                </span>
                <span className="text-sm font-bold font-mono-tactical text-slate-400 pb-0.5">{metricSuffix}</span>
              </div>
              {sparklineValues && sparklineValues.length >= 2 && (
                <PerformanceSparkline values={sparklineValues} />
              )}
            </div>
          ) : (
            <div className="flex items-end gap-3">
              <div
                className="text-3xl font-black font-mono-tactical text-[#36E7A1] leading-none tracking-tight"
                style={{ textShadow: '0 0 18px rgba(54,231,161,0.5), 0 0 40px rgba(54,231,161,0.2)' }}
              >
                {metric ?? '—'}
              </div>
              {sparklineValues && sparklineValues.length >= 2 && (
                <PerformanceSparkline values={sparklineValues} />
              )}
            </div>
          )}
        </div>
        <div className="text-[10px] text-slate-500 mt-1.5 font-mono-tactical">{subline}</div>
      </div>
    </div>
  );
}
