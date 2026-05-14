'use client';

import type { SignalsResponse } from '@/app/api/dashboard/signals/route';

// ─── SVG donut helpers ────────────────────────────────────────────────────────

const CX = 90;
const CY = 90;
const INNER_R = 55;
const OUTER_R = 80;
const GAP_DEG = 2.5; // visual gap between segments in degrees

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number,
): string {
  const sweep = endAngle - startAngle;
  if (Math.abs(sweep) < 0.01) return '';
  const large = sweep > 180 ? 1 : 0;

  const os = polarToCartesian(cx, cy, outerR, startAngle);
  const oe = polarToCartesian(cx, cy, outerR, endAngle);
  const ie = polarToCartesian(cx, cy, innerR, endAngle);
  const is_ = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${os.x.toFixed(3)} ${os.y.toFixed(3)}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x.toFixed(3)} ${oe.y.toFixed(3)}`,
    `L ${ie.x.toFixed(3)} ${ie.y.toFixed(3)}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is_.x.toFixed(3)} ${is_.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

interface Segment {
  value: number;
  color: string;
  label: string;
  legendColor: string;
}

function DonutChart({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  const total = buy + hold + sell;

  const segments: Segment[] = [
    { value: buy,  color: '#36E7A1', label: 'BUY',  legendColor: '#36E7A1' },
    { value: hold, color: '#FBBF24', label: 'HOLD', legendColor: '#FBBF24' },
    { value: sell, color: '#EF4444', label: 'SELL', legendColor: '#EF4444' },
  ];

  // Empty ring when no data
  if (total === 0) {
    return (
      <svg viewBox="0 0 180 180" width={180} height={180} aria-label="No signals data">
        <circle
          cx={CX} cy={CY}
          r={(OUTER_R + INNER_R) / 2}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={OUTER_R - INNER_R}
        />
        <text x={CX} y={CY + 4} textAnchor="middle" dominantBaseline="middle"
          fill="#475569" fontSize={14} fontFamily='"JetBrains Mono",monospace'>
          —
        </text>
      </svg>
    );
  }

  const totalGapDeg = GAP_DEG * segments.filter((s) => s.value > 0).length;
  const availDeg    = 360 - totalGapDeg;

  let cursor = 0; // degrees, starting from 0 (top after -90 offset in polarToCartesian)
  const paths: { d: string; color: string }[] = [];

  for (const seg of segments) {
    if (seg.value === 0) continue;
    const sweep = (seg.value / total) * availDeg;
    const d = arcPath(CX, CY, INNER_R, OUTER_R, cursor, cursor + sweep);
    paths.push({ d, color: seg.color });
    cursor += sweep + GAP_DEG;
  }

  return (
    <svg viewBox="0 0 180 180" width={180} height={180} aria-label="Buy/Hold/Sell donut chart">
      {/* Subtle background ring */}
      <circle
        cx={CX} cy={CY}
        r={(OUTER_R + INNER_R) / 2}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth={OUTER_R - INNER_R}
      />
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity={0.9} />
      ))}
      {/* Center total */}
      <text
        x={CX} y={CY - 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#ffffff"
        fontSize={20}
        fontFamily='"JetBrains Mono","JetBrains Mono NL",monospace'
        fontWeight={700}
      >
        {total}
      </text>
      <text
        x={CX} y={CY + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#64748B"
        fontSize={9}
        fontFamily='Inter,sans-serif'
        letterSpacing={1}
      >
        TOTAL SIGNALS
      </text>
    </svg>
  );
}

// ─── Legend item ──────────────────────────────────────────────────────────────

function LegendItem({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="rounded-full shrink-0"
        style={{ width: 8, height: 8, background: color }}
        aria-hidden
      />
      <span
        style={{
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:   12,
          color:      '#94a3b8',
        }}
      >
        <span style={{ color, fontWeight: 700 }}>{count}</span>{' '}
        {label}
      </span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SignalsSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 animate-pulse" aria-hidden>
      <div className="rounded-full bg-white/[0.07]" style={{ width: 180, height: 180 }} />
      <div className="flex gap-4">
        {[72, 80, 72].map((w, i) => (
          <div key={i} className="h-3.5 rounded bg-white/[0.07]" style={{ width: w }} />
        ))}
      </div>
    </div>
  );
}

// ─── SignalsPanel ─────────────────────────────────────────────────────────────

export interface SignalsPanelProps {
  data:    SignalsResponse | null;
  loading: boolean;
}

export default function SignalsPanel({ data, loading }: SignalsPanelProps) {
  const buy  = data?.buy  ?? 0;
  const hold = data?.hold ?? 0;
  const sell = data?.sell ?? 0;

  return (
    <div
      className="flex flex-col"
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        borderRadius:  12,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="uppercase tracking-widest"
          style={{
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      12,
            color:         '#64748B',
            letterSpacing: '0.1em',
          }}
        >
          Buy / Hold / Sell Signals
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-5 flex-1">
        {loading ? (
          <SignalsSkeleton />
        ) : (
          <>
            <DonutChart buy={buy} hold={hold} sell={sell} />
            {/* Legend */}
            <div className="flex items-center gap-5 flex-wrap justify-center">
              <LegendItem color="#36E7A1" label="BUY"  count={buy} />
              <LegendItem color="#FBBF24" label="HOLD" count={hold} />
              <LegendItem color="#EF4444" label="SELL" count={sell} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
