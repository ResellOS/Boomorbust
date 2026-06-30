'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

// ─── types ────────────────────────────────────────────────────────────────────

interface EmpireScoreData {
  score: number;
  grade: string;
  percentile: string;
  sparklineData: number[];
}

export interface EmpireScoreProps {
  /** Optional initial sparkline values (7 numbers). Overrides fetched data. */
  sparklineData?: number[];
  className?: string;
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

const SPARKLINE_W = 60;
const SPARKLINE_H = 24;
const STROKE_COLOR = '#36E7A1';

function Sparkline({ data }: { data: number[] }) {
  const points = useMemo(() => {
    if (!data.length) return { linePath: '', fillPath: '' };

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pad = 1.5; // vertical padding so stroke isn't clipped

    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * SPARKLINE_W,
      y: SPARKLINE_H - pad - ((v - min) / range) * (SPARKLINE_H - pad * 2),
    }));

    const linePath = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)},${p.y.toFixed(2)}`)
      .join(' ');

    const last  = pts[pts.length - 1]!;
    const first = pts[0]!;
    const fillPath =
      `${linePath} L ${last.x.toFixed(2)},${SPARKLINE_H} L ${first.x.toFixed(2)},${SPARKLINE_H} Z`;

    return { linePath, fillPath };
  }, [data]);

  return (
    <svg
      width={SPARKLINE_W}
      height={SPARKLINE_H}
      viewBox={`0 0 ${SPARKLINE_W} ${SPARKLINE_H}`}
      aria-hidden
      focusable="false"
      style={{ overflow: 'visible', display: 'block', flexShrink: 0 }}
    >
      {/* Fill area below line */}
      <path
        d={points.fillPath}
        fill={STROKE_COLOR}
        fillOpacity={0.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Line */}
      <path
        d={points.linePath}
        fill="none"
        stroke={STROKE_COLOR}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function EmpireScoreSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-2 ${className ?? ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
      aria-label="Loading empire score"
    >
      {/* Left skeleton */}
      <div className="flex flex-col gap-1.5">
        <div className="h-2.5 w-[80px] rounded animate-pulse bg-white/10" />
        <div className="h-7 w-[52px] rounded animate-pulse bg-white/10" />
        <div className="h-4 w-[90px] rounded-full animate-pulse bg-white/10" />
      </div>
      {/* Right sparkline skeleton */}
      <div
        className="rounded animate-pulse bg-white/10"
        style={{ width: SPARKLINE_W, height: SPARKLINE_H }}
      />
    </div>
  );
}

// ─── EmpireScore ──────────────────────────────────────────────────────────────

export default function EmpireScore({ sparklineData: sparklineProp, className }: EmpireScoreProps) {
  const [data, setData] = useState<EmpireScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/empire/score', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as EmpireScoreData;
        setData(json);
      } catch {
        // Fail silently — widget stays hidden rather than erroring the nav
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <EmpireScoreSkeleton className={className} />;
  }

  if (!data) return null;

  const sparkline = sparklineProp ?? data.sparklineData;

  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-4 py-2 ${className ?? ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* ── Left: label + score + badge row ─────────────────────────── */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {/* Label */}
        <span
          className="uppercase tracking-widest leading-none text-[11px]"
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            color: '#64748B',
            letterSpacing: '0.12em',
          }}
        >
          DYNASTY POWER RATING
        </span>

        {/* Score value */}
        <span
          className="leading-none tabular-nums font-bold"
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 28,
            color: '#36E7A1',
            lineHeight: 1.1,
          }}
        >
          {data.score.toFixed(1)}
        </span>

        {/* Badge row */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
            style={{
              background: 'rgba(6,78,59,0.5)',
              color: '#34d399',
              fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            }}
          >
            {data.grade}
          </span>
          <span
            className="text-[12px] leading-none whitespace-nowrap"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              color: '#64748B',
            }}
          >
            {data.percentile}
          </span>
        </div>
      </div>

      {/* ── Right: mini sparkline ────────────────────────────────────── */}
      <Sparkline data={sparkline} />
    </div>
  );
}
