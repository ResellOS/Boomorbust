'use client';

import { useEffect, useRef, useState } from 'react';
import { Activity, Radar } from 'lucide-react';
import DashboardIconRail from '@/components/DashboardIconRail';

const BG = '#0B0E14';
const TICKER_GREEN = '#22c55e';
const CYAN = '#06B6D4';
const EMERALD = '#10B981';
const RED = '#EF4444';

const FONT_BEBAS = { fontFamily: 'var(--font-display), "Bebas Neue", Impact, sans-serif' } as const;

type ScatterDatum = { id: string; label: string; mv: number; sals: number };

function salsFill(sals: number): string {
  if (sals > 2000) return CYAN;
  if (sals < 0) return RED;
  return EMERALD;
}

const MOCK_SCATTER: ScatterDatum[] = [
  { id: '1',  label: 'J.L',  mv: 42, sals: 2680  },
  { id: '2',  label: 'CMC',  mv: 88, sals: 420   },
  { id: '3',  label: 'JJ',   mv: 72, sals: -180  },
  { id: '4',  label: 'TL',   mv: 65, sals: 1150  },
  { id: '5',  label: 'BT',   mv: 38, sals: 2105  },
  { id: '6',  label: 'GW',   mv: 55, sals: -420  },
  { id: '7',  label: 'PG',   mv: 81, sals: 890   },
  { id: '8',  label: 'AB',   mv: 28, sals: 3200  },
  { id: '9',  label: 'KT',   mv: 48, sals: 0     },
  { id: '10', label: 'DW',   mv: 62, sals: -95   },
  { id: '11', label: 'MH',   mv: 34, sals: 1750  },
  { id: '12', label: 'CB',   mv: 91, sals: 2450  },
];

// ── Pure SVG scatter plot ────────────────────────────────────────────────────

function ScatterPlot({ data }: { data: ScatterDatum[] }) {
  const [hovered, setHovered] = useState<ScatterDatum | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const PAD = { top: 20, right: 20, bottom: 48, left: 60 };
  const W = 540;
  const H = 420;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const mvMin = Math.min(...data.map((d) => d.mv)) - 8;
  const mvMax = Math.max(...data.map((d) => d.mv)) + 8;
  const salsMin = Math.min(...data.map((d) => d.sals)) - 300;
  const salsMax = Math.max(...data.map((d) => d.sals)) + 300;

  const scaleX = (v: number) => PAD.left + ((v - mvMin) / (mvMax - mvMin)) * plotW;
  const scaleY = (v: number) => PAD.top + plotH - ((v - salsMin) / (salsMax - salsMin)) * plotH;

  const gridXCount = 5;
  const gridYCount = 5;

  return (
    <div className="relative w-full h-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height="100%"
        style={{ overflow: 'visible' }}
        aria-label="SALS scatter plot"
      >
        {/* Grid lines */}
        {Array.from({ length: gridXCount }, (_, i) => {
          const x = PAD.left + (i / (gridXCount - 1)) * plotW;
          return <line key={`gx${i}`} x1={x} y1={PAD.top} x2={x} y2={PAD.top + plotH} stroke="#1F2937" strokeDasharray="3 8" strokeOpacity={0.85} />;
        })}
        {Array.from({ length: gridYCount }, (_, i) => {
          const y = PAD.top + (i / (gridYCount - 1)) * plotH;
          return <line key={`gy${i}`} x1={PAD.left} y1={y} x2={PAD.left + plotW} y2={y} stroke="#1F2937" strokeDasharray="3 8" strokeOpacity={0.85} />;
        })}

        {/* Zero SALS line */}
        {salsMin < 0 && salsMax > 0 && (
          <line
            x1={PAD.left} y1={scaleY(0)}
            x2={PAD.left + plotW} y2={scaleY(0)}
            stroke={CYAN} strokeOpacity={0.15} strokeDasharray="6 4"
          />
        )}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + plotH} stroke="#475569" />
        <line x1={PAD.left} y1={PAD.top + plotH} x2={PAD.left + plotW} y2={PAD.top + plotH} stroke="#475569" />

        {/* Axis ticks & labels */}
        {Array.from({ length: gridXCount }, (_, i) => {
          const val = Math.round(mvMin + (i / (gridXCount - 1)) * (mvMax - mvMin));
          const x = scaleX(val);
          return (
            <text key={`xl${i}`} x={x} y={PAD.top + plotH + 16} textAnchor="middle" fill="#64748b" fontSize={9}>{val}</text>
          );
        })}
        {Array.from({ length: gridYCount }, (_, i) => {
          const val = Math.round(salsMin + (i / (gridYCount - 1)) * (salsMax - salsMin));
          const y = scaleY(val);
          return (
            <text key={`yl${i}`} x={PAD.left - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize={9}>{val}</text>
          );
        })}

        {/* Axis labels */}
        <text x={PAD.left + plotW / 2} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="monospace" letterSpacing="0.06em">Market Value</text>
        <text
          x={14}
          y={PAD.top + plotH / 2}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
          fontFamily="monospace"
          letterSpacing="0.06em"
          transform={`rotate(-90, 14, ${PAD.top + plotH / 2})`}
        >
          BBSM SALS Score
        </text>

        {/* Data points */}
        {data.map((d) => {
          const cx = scaleX(d.mv);
          const cy = scaleY(d.sals);
          const fill = salsFill(d.sals);
          const r = 11;
          return (
            <g
              key={d.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                setHovered(d);
                const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
                setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={fill} strokeOpacity={0.3} strokeWidth={1} />
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke="#0B0E14" strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 6px ${fill})` }} />
              <text x={cx} y={cy + 1} dominantBaseline="middle" textAnchor="middle" fill="#05080d" fontSize={7} fontWeight={700} fontFamily="ui-monospace, monospace">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hovered && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border px-3 py-2 text-[12px] shadow-xl"
          style={{
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 16,
            background: 'rgba(17,24,39,0.96)',
            borderColor: `${EMERALD}55`,
            color: '#e2e8f0',
          }}
        >
          <p className="font-semibold text-white">{hovered.label}</p>
          <p style={{ fontFamily: 'ui-monospace, monospace' }}>MV {hovered.mv} · SALS {hovered.sals}</p>
          <p className="mt-1 text-[11px]" style={{ color: '#94a3b8' }}>
            {hovered.sals > 2000 ? 'Tier: SALS > 2000' : hovered.sals < 0 ? 'Tier: Negative SALS' : 'Tier: SALS 0–2000'}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Live ticker ───────────────────────────────────────────────────────────────

function useLiveFeed() {
  const [lines, setLines] = useState<string[]>(() => [
    'VALUE SHIFT: J. LOVE +2.4%',
    'VALUE SHIFT: CMC -0.8%',
    'ARB: JSN vs KTC mid +1.1σ',
    'FLOW: 2027 1st premium +3.2%',
    'VALUE SHIFT: M. NABERS +1.9%',
    'ALERT: RB room L4 depth -12% vs league',
  ]);

  useEffect(() => {
    const players = ['J. LOVE', 'P. MAHOMES', 'J. CHASE', 'B. ROBINSON', 'T. LAWRENCE', 'M. PITTMAN', 'D. LONDON'];
    let i = 0;
    const id = window.setInterval(() => {
      const p = players[i % players.length]!;
      const delta = (Math.random() * 5.2 - 1.1).toFixed(1);
      const sign = Number(delta) >= 0 ? '+' : '';
      setLines((prev) => [`VALUE SHIFT: ${p} ${sign}${delta}%`, ...prev].slice(0, 90));
      i += 1;
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [lines]);

  return { lines, ref };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MissionControlPage() {
  const { lines, ref: tickerRef } = useLiveFeed();

  return (
    <div className="min-h-screen" style={{ background: BG }}>
      <DashboardIconRail />
      <div className="flex min-h-[calc(100vh-72px)] flex-col pb-24 lg:ml-16 lg:pb-0">
        {/* DEFCON header */}
        <header className="shrink-0 p-3 sm:p-4">
          <div
            className="flex flex-wrap items-center gap-3 px-4 py-3 sm:gap-4 rounded-xl border"
            style={{ borderColor: 'rgba(245,158,11,0.45)', background: 'rgba(245,158,11,0.06)' }}
          >
            <Radar className="h-6 w-6 shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
            <span className="text-xl tracking-[0.12em] text-amber-100 sm:text-2xl" style={FONT_BEBAS}>
              SYSTEM STATUS: DEFCON 2
            </span>
            <span className="ml-auto hidden text-[11px] font-medium uppercase tracking-[0.2em] text-amber-200/70 sm:inline" style={{ fontFamily: 'var(--font-body)' }}>
              Market sync live
            </span>
          </div>
        </header>

        <div className="flex min-h-[min(calc(100vh-260px),900px)] flex-1 flex-col gap-3 px-3 pb-4 sm:px-4 lg:flex-row lg:gap-4 lg:pb-6">
          {/* Left ticker */}
          <aside
            className="flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden rounded-xl border lg:h-auto lg:max-h-none lg:w-[300px]"
            style={{ borderColor: '#1F2937', background: '#0D1220' }}
            aria-label="Live market feed"
          >
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: '#1F2937' }}>
              <Activity className="h-4 w-4 text-[#22c55e]/80" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#64748b' }}>
                Live feed
              </span>
            </div>
            <div ref={tickerRef} className="min-h-[160px] flex-1 overflow-y-auto px-3 py-2">
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-[1.55]" style={{ color: TICKER_GREEN }}>
                {lines.join('\n')}
              </pre>
            </div>
          </aside>

          {/* Tactical map */}
          <section
            className="flex min-h-[420px] min-w-0 flex-1 flex-col p-2 sm:p-3 rounded-xl border"
            style={{ borderColor: '#1F2937', background: '#0D1220' }}
            aria-label="Tactical map"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">Scatter · SALS tiers</p>
              <div className="flex flex-wrap gap-3 text-[10px] font-mono uppercase text-[#94a3b8]">
                {[
                  { color: CYAN,    label: 'SALS > 2000' },
                  { color: EMERALD, label: '0–2000' },
                  { color: RED,     label: 'Negative' },
                ].map(({ color, label }) => (
                  <span key={label} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="h-[min(480px,calc(100vh-340px))] w-full flex-1 min-h-[360px]">
              <ScatterPlot data={MOCK_SCATTER} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
