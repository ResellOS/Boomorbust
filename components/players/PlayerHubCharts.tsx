'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const w = 120;
  const h = 36;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={2} points={pts} opacity={0.9} />
    </svg>
  );
}

export function TrendSparkline({ values, color }: { values: number[]; color: string }) {
  return <Sparkline values={values} color={color} />;
}

export function RatingGauge({
  score,
  color,
  animateKey,
}: {
  score: number;
  color: string;
  /** When set, ring + number count up on key change */
  animateKey?: string;
}) {
  const [displayScore, setDisplayScore] = useState(animateKey ? 0 : score);
  const raf = useRef(0);

  useEffect(() => {
    if (!animateKey) {
      setDisplayScore(score);
      return;
    }
    cancelAnimationFrame(raf.current);
    setDisplayScore(0);
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplayScore(score * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [animateKey, score]);

  const pct = Math.min(100, Math.max(0, displayScore));
  const r = 54;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative mx-auto h-[128px] w-[128px]">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={r} fill="none" stroke="#1e2640" strokeWidth="10" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'stroke-dashoffset 80ms linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-[9px] uppercase tracking-[2px] text-muted">OVR</div>
        <div className="font-mono text-[32px] leading-none tabular-nums" style={{ color }}>
          {displayScore.toFixed(1)}
        </div>
      </div>
    </div>
  );
}

export function PeakWindowTimeline({ years, activeYear }: { years: number[]; activeYear: number }) {
  return (
    <div className="mt-3 flex items-center gap-1">
      {years.map((y) => {
        const active = y === activeYear;
        return (
          <div key={y} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={`h-2 w-full rounded-full ${active ? 'bg-boom' : 'bg-[#1e2640]'}`}
              style={active ? { boxShadow: '0 0 10px rgba(54,231,161,0.45)' } : undefined}
            />
            <span className={`font-mono text-[9px] ${active ? 'text-boom' : 'text-muted'}`}>{y}</span>
          </div>
        );
      })}
    </div>
  );
}

type HistoryRange = '1Y' | '2Y' | '3Y' | 'ALL';

function sliceHistory(values: number[], dates: string[], range: HistoryRange): { values: number[]; dates: string[] } {
  if (range === 'ALL' || values.length <= 2) return { values, dates };
  const months = range === '1Y' ? 12 : range === '2Y' ? 24 : 36;
  const cutoff = Date.now() - months * 30 * 24 * 60 * 60 * 1000;
  const indices: number[] = [];
  dates.forEach((d, i) => {
    const t = new Date(d).getTime();
    if (!Number.isNaN(t) && t >= cutoff) indices.push(i);
  });
  if (indices.length < 2) {
    const take = Math.min(values.length, range === '1Y' ? 4 : range === '2Y' ? 8 : 12);
    return {
      values: values.slice(-take),
      dates: dates.slice(-take),
    };
  }
  const start = indices[0]!;
  return {
    values: values.slice(start),
    dates: dates.slice(start),
  };
}

export function RatingHistoryChart({
  values,
  dates,
}: {
  values: number[];
  dates: string[];
}) {
  const [range, setRange] = useState<HistoryRange>('ALL');
  const sliced = useMemo(() => sliceHistory(values, dates, range), [values, dates, range]);

  if (values.length < 2) {
    return (
      <p className="py-4 text-center font-figtree text-[12px] text-muted">
        Historical tracking begins today — BOB will chart this player&apos;s rating over time.
      </p>
    );
  }

  const w = 320;
  const h = 100;
  const pad = 8;
  const min = Math.min(...sliced.values, 0);
  const max = Math.max(...sliced.values, 100);
  const rangeVal = max - min || 1;

  const pts = sliced.values.map((v, i) => {
    const x = pad + (i / (sliced.values.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / rangeVal) * (h - pad * 2);
    return { x, y, v };
  });

  const line = pts.map((p) => `${p.x},${p.y}`).join(' ');
  const area = `${pad},${h - pad} ${line} ${w - pad},${h - pad}`;

  const ranges: HistoryRange[] = ['1Y', '2Y', '3Y', 'ALL'];

  return (
    <div className="rounded-[8px] border border-border bg-[#0f1420] p-3">
      <div className="mb-2 flex gap-1">
        {ranges.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[9px] ${
              range === r ? 'bg-boom/15 text-boom' : 'text-muted hover:text-text'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#36E7A1" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#36E7A1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon points={area} fill="url(#ratingFill)" />
        <polyline fill="none" stroke="#36E7A1" strokeWidth={2} points={line} />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#36E7A1" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[9px] text-muted">
        <span>{formatShortDate(sliced.dates[0])}</span>
        <span className="text-boom">{sliced.values[sliced.values.length - 1]?.toFixed(1)} now</span>
      </div>
    </div>
  );
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  } catch {
    return '—';
  }
}

export function MarketRangeBar({
  bobRank,
  marketRank,
  maxRank = 200,
}: {
  bobRank: number | null;
  marketRank: number | null;
  maxRank?: number;
}) {
  if (bobRank == null || marketRank == null) return null;

  const bobPct = Math.min(100, Math.max(0, (bobRank / maxRank) * 100));
  const ktcPct = Math.min(100, Math.max(0, (marketRank / maxRank) * 100));

  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-[#1e2640]">
        <div
          className="absolute top-[-4px] h-4 w-1 rounded-full bg-boom"
          style={{ left: `${bobPct}%`, boxShadow: '0 0 8px rgba(54,231,161,0.6)' }}
          title={`BOB ${bobRank}`}
        />
        <div
          className="absolute top-[-4px] h-4 w-1 rounded-full bg-bust"
          style={{ left: `${ktcPct}%`, boxShadow: '0 0 8px rgba(167,139,250,0.5)' }}
          title={`Market ${marketRank}`}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[9px] text-muted">
        <span>1</span>
        <span>{maxRank}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10px]">
        <span className="text-boom">BOB {bobRank}</span>
        <span className="text-bust">Market {marketRank}</span>
        <span className="text-muted">
          Gap {Math.abs(marketRank - bobRank)} spots
        </span>
      </div>
      <p className="mt-2 font-figtree text-[10px] leading-relaxed text-muted">
        Higher BOB rank = BOB sees more value than market consensus
      </p>
    </div>
  );
}
