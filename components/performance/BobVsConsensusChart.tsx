'use client';

import type { ConsensusComparison, WeeklyAccuracyPoint } from '@/lib/performance/types';
import { fmtPct } from '@/lib/performance/utils';

interface BobVsConsensusChartProps {
  consensus: ConsensusComparison;
  weeklyChart: WeeklyAccuracyPoint[];
  hasData: boolean;
}

function ComparisonBar({
  label,
  value,
  color,
  maxWidth = 100,
}: {
  label: string;
  value: number | null;
  color: string;
  maxWidth?: number;
}) {
  const pct = value ?? 0;
  const width = value != null ? Math.min(100, (pct / maxWidth) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-[88px] font-figtree text-[12px] text-text">{label}</span>
        <span className="font-mono text-[13px] tabular-nums" style={{ color }}>
          {fmtPct(value)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-bg/80">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: value != null ? `${width}%` : '0%',
            background: color,
            opacity: value != null ? 1 : 0.25,
          }}
        />
      </div>
    </div>
  );
}

function AccuracyLineChart({ points }: { points: WeeklyAccuracyPoint[] }) {
  if (points.length < 2) return null;

  const w = 560;
  const h = 160;
  const pad = { t: 12, r: 16, b: 28, l: 36 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const maxWeek = Math.max(...points.map((p) => p.week));
  const minWeek = Math.min(...points.map((p) => p.week));

  const toX = (week: number) =>
    pad.l + ((week - minWeek) / Math.max(1, maxWeek - minWeek)) * innerW;
  const toY = (acc: number) => pad.t + innerH - (acc / 100) * innerH;

  const bobLine = points.map((p) => `${toX(p.week)},${toY(p.bobAccuracy)}`).join(' ');
  const conLine = points
    .map((p) => `${toX(p.week)},${toY(p.consensusAccuracy)}`)
    .join(' ');

  const yTicks = [0, 20, 40, 60, 80];

  return (
    <div className="mt-5 overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="min-w-[480px] w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.l}
              y1={toY(tick)}
              x2={w - pad.r}
              y2={toY(tick)}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={pad.l - 6}
              y={toY(tick) + 3}
              textAnchor="end"
              className="fill-muted font-mono text-[8px]"
            >
              {tick}%
            </text>
          </g>
        ))}

        <polyline
          fill="none"
          stroke="#A78BFA"
          strokeWidth={2}
          strokeOpacity={0.7}
          points={conLine}
        />
        <polyline
          fill="none"
          stroke="#36E7A1"
          strokeWidth={2.5}
          points={bobLine}
        />

        <text x={pad.l} y={h - 6} className="fill-muted font-mono text-[8px]">
          Week {minWeek}
        </text>
        <text
          x={w - pad.r}
          y={h - 6}
          textAnchor="end"
          className="fill-muted font-mono text-[8px]"
        >
          Week {maxWeek}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap gap-4 font-mono text-[9px]">
        <span className="flex items-center gap-1.5 text-boom">
          <span className="inline-block h-[2px] w-4 bg-boom" />
          BOB Accuracy
        </span>
        <span className="flex items-center gap-1.5 text-bust">
          <span className="inline-block h-[2px] w-4 bg-bust opacity-70" />
          FantasyPros
        </span>
      </div>
    </div>
  );
}

export default function BobVsConsensusChart({
  consensus,
  weeklyChart,
  hasData,
}: BobVsConsensusChartProps) {
  return (
    <section className="mb-6 rounded-[10px] border border-border bg-surface/50 p-4 backdrop-blur-xl md:p-5">
      <div className="mb-1 font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
        Season Accuracy vs Consensus
      </div>
      <p className="mb-4 font-figtree text-[11px] text-muted">
        {hasData
          ? 'Cumulative accuracy compared to expert consensus baselines.'
          : 'BOB vs Consensus tracking begins Week 1. Every week, BOB\'s calls are compared to FantasyPros consensus — automatically, publicly, without editing.'}
      </p>

      <div className="space-y-3">
        <ComparisonBar label="BOB" value={consensus.bob} color="#36E7A1" />
        <ComparisonBar
          label="FantasyPros"
          value={consensus.fantasyPros}
          color="#A78BFA"
        />
        <ComparisonBar label="KTC" value={consensus.ktc} color="#22D3EE" />
        <ComparisonBar label="Random" value={consensus.random} color="#64748B" />
      </div>

      {hasData && weeklyChart.length >= 2 ? (
        <AccuracyLineChart points={weeklyChart} />
      ) : (
        <div className="mt-5 flex h-[120px] items-center justify-center rounded-[8px] border border-dashed border-border/60 bg-bg/40">
          <p className="max-w-sm px-4 text-center font-figtree text-[11px] leading-relaxed text-muted">
            Weekly accuracy chart populates once calls resolve during the season.
          </p>
        </div>
      )}
    </section>
  );
}
