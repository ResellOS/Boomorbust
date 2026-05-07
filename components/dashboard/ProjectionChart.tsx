'use client';

import { useId, useMemo } from 'react';
import { Settings } from 'lucide-react';
import Link from 'next/link';

export interface ProjectionAnnotation {
  /** Index into the labels/data arrays this annotation is anchored to. */
  index: number;
  /** Player short name (e.g. "J. Chase"). */
  player: string;
  /** Sub-line, e.g. "50+ yd reception". */
  note?: string;
}

interface Props {
  /** Empire / lineup projected pts per week, oldest → newest. */
  data: number[];
  labels: string[];
  /** Inline player annotations rendered under the X-axis. */
  annotations?: ProjectionAnnotation[];
  title?: string;
  /** Optional context line under the hero readout. */
  subtitle?: string;
  /** e.g. "Empire Score" — pairs with scoreHighlightValue or numeric + suffix. */
  scoreHighlightLabel?: string;
  /** Large neon number only, e.g. "679.8k" (suffix rendered smaller). */
  scoreHighlightNumeric?: string;
  /** Smaller suffix next to numeric, e.g. "KTC". */
  scoreHighlightSuffix?: string;
  /** Large neon headline when not using numeric split, e.g. "+12K Δ". */
  scoreHighlightValue?: string;
  rightActionLabel?: string;
  rightActionHref?: string;
  /** Optional formatter for the last-point label / readouts (e.g. KTC). */
  valueFormatter?: (n: number) => string;
  /** Horizontal benchmark (e.g. league-average roster KTC) — dashed line. */
  benchmarkValue?: number | null;
  benchmarkLabel?: string;
  /** Optional secondary controls rendered next to the title. */
  controls?: React.ReactNode;
  className?: string;
}

const W = 720;
const H = 200;
const PAD_X = 36;
const PAD_Y = 26;

const EMERALD = '#36E7A1';

/** Sharp segment path (HUD “zig” read) — reads as tactical peaks, not spline mush. */
function buildLinearOpenPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  if (n < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 1; i < n; i++) {
    d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
  }
  return d;
}

/** When the real series is nearly flat, add bounded micro-wiggle so the line still reads as active HUD. */
function embellishDisplayValues(values: number[]): number[] {
  const n = values.length;
  if (n < 2) return [...values];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min;
  const scale = Math.max(Math.abs(max), Math.abs(min), 1);
  const micro = spread < Math.max(scale * 0.012, 2.5);
  if (!micro) return [...values];
  return values.map((v, i) => {
    const t = n > 1 ? i / (n - 1) : 0;
    const wiggle =
      Math.sin(t * Math.PI * 5) * (scale * 0.024 + 2) +
      Math.cos(t * Math.PI * 9) * (scale * 0.014 + 1.2);
    return v + wiggle;
  });
}

function buildPath(
  data: number[],
  minV: number,
  maxV: number,
): { line: string; area: string; pts: { x: number; y: number; v: number }[] } {
  const n = data.length;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y * 2;
  const range = maxV - minV || 1;

  const pts = data.map((v, i) => ({
    x: PAD_X + (i / (n - 1)) * innerW,
    y: PAD_Y + innerH - ((v - minV) / range) * innerH,
    v,
  }));

  const line = buildLinearOpenPath(pts);
  const last = pts[n - 1]!;
  const first = pts[0]!;
  const floorY = PAD_Y + innerH;
  const area = `${line} L ${last.x.toFixed(2)} ${floorY} L ${first.x.toFixed(2)} ${floorY} Z`;

  return { line, area, pts };
}

export default function ProjectionChart({
  data,
  labels,
  annotations = [],
  title = 'Week Projected Pts',
  subtitle,
  scoreHighlightLabel,
  scoreHighlightNumeric,
  scoreHighlightSuffix,
  scoreHighlightValue,
  rightActionLabel = 'View All Trade',
  rightActionHref = '/dashboard/trade',
  valueFormatter,
  benchmarkValue = null,
  benchmarkLabel = 'League Average Benchmark',
  controls,
  className = '',
}: Props) {
  const id = useId();

  const safeData = data.length > 0 ? data : [0, 0];
  const safeLabels = labels.length === safeData.length ? labels : safeData.map((_, i) => `T-${i}`);

  const fmt = (n: number) => (valueFormatter ? valueFormatter(n) : n.toFixed(1));

  const displayData = useMemo(() => embellishDisplayValues(safeData), [safeData]);

  const bench =
    typeof benchmarkValue === 'number' &&
    Number.isFinite(benchmarkValue) &&
    benchmarkValue > 0
      ? benchmarkValue
      : null;

  const minV =
    Math.min(...displayData, ...(bench !== null ? [bench] : [])) -
    Math.max(8, Math.abs(Math.min(...displayData)) * 0.05);
  const maxV =
    Math.max(...displayData, ...(bench !== null ? [bench] : [])) +
    Math.max(8, Math.abs(Math.max(...displayData)) * 0.05);

  const { line, area, pts } = useMemo(
    () => buildPath(displayData, minV, maxV),
    [displayData, minV, maxV],
  );

  const benchPts = useMemo(() => {
    if (bench === null || displayData.length < 2) return '';
    const n = displayData.length;
    const innerW = W - PAD_X * 2;
    const innerH = H - PAD_Y * 2;
    const range = maxV - minV || 1;
    const benchPtsOnly = displayData.map((_, i) => ({
      x: PAD_X + (i / (n - 1)) * innerW,
      y: PAD_Y + innerH - ((bench - minV) / range) * innerH,
    }));
    return buildLinearOpenPath(benchPtsOnly);
  }, [bench, displayData, minV, maxV]);

  const grad = `${id}-grad`;
  const innerH = H - PAD_Y * 2;
  const gridYs = [0.25, 0.5, 0.75].map((r) => PAD_Y + innerH * (1 - r));

  return (
    <div className={`glass-panel p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3 gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
            <span
              className="w-1 h-3 inline-block"
              style={{
                background: EMERALD,
                boxShadow: `0 0 10px ${EMERALD}, 0 0 18px rgba(54,231,161,0.45)`,
              }}
            />
            {title}
          </h3>
          {(scoreHighlightLabel &&
            (scoreHighlightValue || (scoreHighlightNumeric && scoreHighlightSuffix))) ||
          subtitle ? (
            <div className="mt-2 space-y-1">
              {scoreHighlightLabel &&
              scoreHighlightNumeric &&
              scoreHighlightSuffix ? (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                    {scoreHighlightLabel}
                  </p>
                  <p className="flex items-baseline gap-1.5 leading-none">
                    <span
                      className="text-2xl sm:text-3xl lg:text-[2.65rem] font-black font-mono-tactical tracking-tight"
                      style={{
                        color: EMERALD,
                        textShadow:
                          '0 0 18px rgba(54,231,161,0.55), 0 0 42px rgba(54,231,161,0.22), 0 0 2px rgba(255,255,255,0.15)',
                      }}
                    >
                      {scoreHighlightNumeric}
                    </span>
                    <span className="text-xs sm:text-sm font-bold font-mono-tactical text-slate-400 mt-0.5">
                      {scoreHighlightSuffix}
                    </span>
                  </p>
                </>
              ) : scoreHighlightLabel && scoreHighlightValue ? (
                <>
                  <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-slate-500">
                    {scoreHighlightLabel}
                  </p>
                  <p
                    className="text-2xl sm:text-3xl lg:text-4xl font-black font-mono-tactical leading-none tracking-tight"
                    style={{
                      color: EMERALD,
                      textShadow:
                        '0 0 18px rgba(54,231,161,0.55), 0 0 42px rgba(54,231,161,0.22), 0 0 2px rgba(255,255,255,0.15)',
                    }}
                  >
                    {scoreHighlightValue}
                  </p>
                </>
              ) : null}
              {subtitle ? (
                <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono-tactical pt-0.5">
                  {subtitle}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          {controls}
          {rightActionLabel ? (
            <Link
              href={rightActionHref}
              className="text-[10px] font-bold text-[#22D3EE] hover:text-white transition-colors flex items-center gap-1"
            >
              {rightActionLabel}
              <span aria-hidden>→</span>
            </Link>
          ) : null}
          <button
            type="button"
            className="text-slate-600 hover:text-slate-300 transition-colors"
            aria-label="Chart settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="relative w-full" style={{ height: `${H}px` }}>
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Area fill: 20% opacity green → transparent */}
            <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={EMERALD} stopOpacity={0.22} />
              <stop offset="85%" stopColor={EMERALD} stopOpacity={0.04} />
              <stop offset="100%" stopColor={EMERALD} stopOpacity={0} />
            </linearGradient>
            {/* Neon glow filter for the line */}
            <filter id={`${id}-glow`} x="-25%" y="-55%" width="150%" height="210%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {gridYs.map((y, i) => (
            <line
              key={i}
              x1={PAD_X}
              y1={y}
              x2={W - PAD_X}
              y2={y}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          ))}

          {/* Area fill */}
          <path d={area} fill={`url(#${grad})`} />
          {/* League Average Benchmark — dashed gray secondary line */}
          {benchPts && (
            <path
              d={benchPts}
              fill="none"
              stroke="rgba(255,255,255,0.28)"
              strokeWidth={1.5}
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
          )}
          {/* Jagged emerald portfolio line with bloom glow */}
          <path
            d={line}
            fill="none"
            stroke={EMERALD}
            strokeWidth={2.75}
            strokeLinecap="square"
            strokeLinejoin="miter"
            filter={`url(#${id}-glow)`}
            style={{
              filter: `url(#${id}-glow) drop-shadow(0 0 8px rgba(54,231,161,0.95)) drop-shadow(0 0 20px rgba(54,231,161,0.55)) drop-shadow(0 0 36px rgba(54,231,161,0.25))`,
            }}
          />

          {/* Data dots */}
          {pts.map((p, i) => {
            const isLast = i === pts.length - 1;
            const labelV = safeData[i] ?? p.v;
            return (
              <g key={i}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isLast ? 5 : 3}
                  fill={EMERALD}
                  stroke="#0D1117"
                  strokeWidth={isLast ? 2 : 1.5}
                  filter={`url(#${id}-glow)`}
                />
                {isLast && (
                  <text
                    x={p.x - 8}
                    y={p.y - 12}
                    fill={EMERALD}
                    fontSize="11"
                    fontWeight="800"
                    fontFamily="var(--font-mono-tactical), ui-monospace, monospace"
                    textAnchor="end"
                    style={{
                      filter:
                        'drop-shadow(0 0 10px rgba(54,231,161,0.75)) drop-shadow(0 0 20px rgba(54,231,161,0.35))',
                    }}
                  >
                    {fmt(labelV)}
                  </text>
                )}
              </g>
            );
          })}

          {/* X-axis labels */}
          {safeLabels.map((label, i) => {
            const innerW = W - PAD_X * 2;
            const x = PAD_X + (i / Math.max(1, safeLabels.length - 1)) * innerW;
            return (
              <text
                key={i}
                x={x}
                y={H - 4}
                fill="#475569"
                fontSize="10"
                fontWeight="700"
                fontFamily="var(--font-mono-tactical), ui-monospace, monospace"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>

        <div className="flex items-center justify-between mt-1 px-1">
          <span className="text-[9px] font-mono-tactical text-slate-600 uppercase tracking-wider">
            {bench !== null ? `${benchmarkLabel}: ${fmt(bench)}` : '\u00a0'}
          </span>
        </div>

        {/* Player annotations beneath the line */}
        {annotations.length > 0 && (
          <div className="absolute inset-x-0 top-[58%] pointer-events-none">
            {annotations.map((a, i) => {
              const innerW = 100 - (PAD_X * 2 * 100) / W;
              const left =
                (PAD_X * 100) / W + (a.index / Math.max(1, safeLabels.length - 1)) * innerW;
              return (
                <div
                  key={i}
                  className="absolute -translate-x-1/2 text-center"
                  style={{ left: `${left}%`, maxWidth: 110 }}
                >
                  <div className="text-[9px] font-mono-tactical font-bold leading-tight" style={{ color: EMERALD, textShadow: '0 0 10px rgba(54,231,161,0.45)' }}>
                    {a.player}
                  </div>
                  {a.note && (
                    <div className="text-[8px] text-slate-500 leading-tight">{a.note}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
