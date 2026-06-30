'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { clsx } from 'clsx';
import type { DynastyPlayer2026 } from '@/lib/rankings/dynasty2026';
import { gradeFromScore } from '@/lib/tfo/formula';
import type { SleeperPlayerLite } from '@/lib/portfolio/dynastyThreeYear';
import {
  abbrevGrade,
  buildPortfolioThreeYearRows,
  CARD_POS_BADGE,
  portfolioThreeYearSummary,
  positionLineColor,
  scoreBandColor,
  shortInitialLast,
  sortThreeYearRows,
  tradeBadgeFor,
  type PortfolioThreeYearRow,
  type ThreeYearSortMode,
} from '@/lib/portfolio/dynastyThreeYear';

const VB_W = 1000;
const VB_H = 300;
const PAD_L = 52;
const PAD_R = 28;
const PAD_T = 32;
const PAD_B = 48;
const INNER_W = VB_W - PAD_L - PAD_R;
const INNER_H = VB_H - PAD_T - PAD_B;

function xYear(i: number): number {
  return PAD_L + (i * INNER_W) / 2;
}

function yScore(s: number): number {
  return PAD_T + INNER_H - (Math.max(0, Math.min(100, s)) / 100) * INNER_H;
}

interface TooltipState {
  x: number;
  y: number;
  name: string;
  position: string;
  year: number;
  score: number;
}

interface Props {
  rosterPlayerIds: string[];
  playersById: Record<string, SleeperPlayerLite>;
  ktcByNameLower: Record<string, number>;
}

export default function DynastyThreeYearSection({
  rosterPlayerIds,
  playersById,
  ktcByNameLower,
}: Props) {
  const [dynastyRows, setDynastyRows] = useState<DynastyPlayer2026[]>([]);
  const [dynLoading, setDynLoading] = useState(true);
  const [sortMode, setSortMode] = useState<ThreeYearSortMode>('score');
  const [tip, setTip] = useState<TooltipState | null>(null);
  const chartWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setDynLoading(true);
    fetch('/api/rankings/dynasty-enriched')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: DynastyPlayer2026[]) => {
        if (!cancelled && Array.isArray(rows)) setDynastyRows(rows);
      })
      .catch(() => {
        if (!cancelled) setDynastyRows([]);
      })
      .finally(() => {
        if (!cancelled) setDynLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const models = useMemo(() => {
    if (!rosterPlayerIds.length) return [];
    return buildPortfolioThreeYearRows(rosterPlayerIds, playersById, ktcByNameLower, dynastyRows);
  }, [rosterPlayerIds, playersById, ktcByNameLower, dynastyRows]);

  const sorted = useMemo(() => sortThreeYearRows(models, sortMode), [models, sortMode]);
  const summary = useMemo(() => portfolioThreeYearSummary(models), [models]);

  const showTip = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, row: PortfolioThreeYearRow, year: number, score: number) => {
      const rect = chartWrapRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        name: row.name,
        position: row.position,
        year,
        score: Math.round(score),
      });
    },
    [],
  );

  const refLines = [
    { y: 88, label: 'ELITE', color: '#36E7A1' },
    { y: 75, label: 'HIGH VALUE', color: '#22D3EE' },
    { y: 60, label: 'VIABLE', color: '#94A3B8' },
    { y: 45, label: 'AVOID', color: '#EF4444' },
  ];

  const zoneTops = [100, 88, 75, 60, 45, 0];
  const zoneColors = [
    'rgba(54,231,161,0.03)',
    'rgba(34,211,238,0.02)',
    'rgba(148,163,184,0.02)',
    'rgba(239,68,68,0.02)',
    'rgba(239,68,68,0.02)',
  ];

  if (!rosterPlayerIds.length) {
    return (
      <section className="glass-panel rounded-xl p-6 text-center text-sm text-[var(--text-muted)]">
        No skill-position players on synced rosters yet.
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-mono text-[11px] font-black uppercase tracking-[0.2em] text-[#64748B]">
            ROSTER TRAJECTORY
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">Dynasty rating outlook · 2025–2027</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'score' as const, label: 'By Score' },
              { id: 'trajectory' as const, label: 'By Trajectory' },
              { id: 'position' as const, label: 'By Position' },
            ]
          ).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => setSortMode(b.id)}
              className={clsx(
                'rounded-lg border px-3 py-1.5 text-[11px] font-bold font-mono uppercase tracking-wide transition',
                sortMode === b.id
                  ? 'border-[var(--cyan)] bg-[var(--cyan)]/15 text-white'
                  : 'border-white/10 bg-white/[0.04] text-[#94A3B8] hover:border-white/20',
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass-panel relative min-h-[300px] overflow-visible rounded-xl p-4">
        {dynLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 text-[12px] font-mono text-[#94A3B8]">
            Loading dynasty model…
          </div>
        )}
        <div ref={chartWrapRef} className="relative">
          <svg
            viewBox={`0 0 ${VB_W} ${VB_H}`}
            className="h-[300px] w-full"
            preserveAspectRatio="xMidYMid meet"
            onMouseLeave={() => setTip(null)}
          >
            {zoneTops.slice(0, -1).map((top, zi) => {
              const yTop = yScore(top);
              const yBot = yScore(zoneTops[zi + 1]!);
              const h = Math.max(0, yBot - yTop);
              return <rect key={zi} x={PAD_L} y={yTop} width={INNER_W} height={h} fill={zoneColors[zi]} />;
            })}

            {refLines.map((rl) => (
              <g key={rl.y}>
                <line
                  x1={PAD_L}
                  x2={PAD_L + INNER_W}
                  y1={yScore(rl.y)}
                  y2={yScore(rl.y)}
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
                <text
                  x={PAD_L + INNER_W + 4}
                  y={yScore(rl.y) + 3}
                  fill={rl.color}
                  fontSize={8}
                  fontFamily="var(--font-mono), JetBrains Mono, monospace"
                >
                  {rl.label}
                </text>
              </g>
            ))}

            <line
              x1={PAD_L}
              y1={PAD_T + INNER_H}
              x2={PAD_L + INNER_W}
              y2={PAD_T + INNER_H}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth={1}
            />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + INNER_H} stroke="rgba(255,255,255,0.08)" strokeWidth={1} />

            {[0, 25, 50, 75, 100].map((tick) => (
              <text
                key={tick}
                x={PAD_L - 6}
                y={yScore(tick) + 3}
                textAnchor="end"
                fill="#475569"
                fontSize={7}
                fontFamily="var(--font-mono), monospace"
              >
                {tick}
              </text>
            ))}

            {[2025, 2026, 2027].map((yr, i) => (
              <text
                key={yr}
                x={xYear(i)}
                y={VB_H - 14}
                textAnchor="middle"
                fill="#64748B"
                fontSize={10}
                fontFamily="var(--font-mono), monospace"
              >
                {yr}
              </text>
            ))}

            {sorted.map((row) => {
              const col = positionLineColor(row.position);
              const pts: [number, number][] = [
                [xYear(0), yScore(row.y2025)],
                [xYear(1), yScore(row.y2026)],
                [xYear(2), yScore(row.y2027)],
              ];
              const d = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px} ${py}`).join(' ');
              const dash = row.chartDashed ? '4 2' : undefined;
              const scores = [row.y2025, row.y2026, row.y2027];
              const years = [2025, 2026, 2027];

              return (
                <g key={row.id}>
                  <path
                    d={d}
                    fill="none"
                    stroke={col}
                    strokeWidth={1.5}
                    strokeDasharray={dash}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {pts.map(([px, py], ii) => (
                    <circle
                      key={ii}
                      cx={px}
                      cy={py}
                      r={3}
                      fill={col}
                      fillOpacity={0.4}
                      stroke={col}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={(e) => showTip(e, row, years[ii]!, scores[ii]!)}
                      onMouseMove={(e) => showTip(e, row, years[ii]!, scores[ii]!)}
                    />
                  ))}
                  <text
                    x={pts[0]![0]}
                    y={pts[0]![1] - 8}
                    textAnchor="middle"
                    fill={col}
                    fontSize={8}
                    fontFamily="var(--font-mono), JetBrains Mono, monospace"
                  >
                    {shortInitialLast(row.name)}
                  </text>
                </g>
              );
            })}
          </svg>

          {tip && chartWrapRef.current && (
            <div
              className="glass-panel pointer-events-none absolute z-[80] w-[120px] rounded-lg border border-white/10 p-2 text-[11px] shadow-xl backdrop-blur-md"
              style={{
                left: Math.min(chartWrapRef.current.clientWidth - 124, Math.max(4, tip.x + 12)),
                top: Math.min(chartWrapRef.current.clientHeight - 72, Math.max(4, tip.y + 12)),
              }}
            >
              <p className="truncate font-semibold text-white">{tip.name}</p>
              <p className="font-mono text-[#94A3B8]">{tip.position}</p>
              <p className="mt-1 font-mono text-[#36E7A1]">
                {tip.year}: <span className="text-white">{tip.score}</span> TFO
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Summary strip */}
      <div className="glass-panel my-4 flex flex-wrap justify-between gap-4 rounded-xl p-4">
        {(
          [
            { k: 'ELITE', v: summary.elite, c: '#36E7A1' },
            { k: 'DECLINING', v: summary.declining, c: '#EF4444' },
            { k: 'RISING', v: summary.rising, c: '#36E7A1' },
            { k: 'AT RISK', v: summary.atRisk, c: '#FBBF24' },
            { k: 'AVG TFO', v: summary.avgTfo, c: '#22D3EE' },
          ] as const
        ).map((s) => (
          <div key={s.k} className="min-w-[72px] flex-1 text-center">
            <div className="text-[24px] font-bold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: s.c }}>
              {s.v}
            </div>
            <div className="mt-0.5 text-[10px] font-mono uppercase tracking-[0.1em] text-[#64748B]">{s.k}</div>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3 lg:grid-cols-4">
        {sorted.map((row) => (
          <PlayerThreeYearCard key={row.id} row={row} />
        ))}
      </div>
    </section>
  );
}

function PlayerThreeYearCard({ row }: { row: PortfolioThreeYearRow }) {
  const badge = tradeBadgeFor(row);
  const y1 = row.y2025;
  const y2 = row.y2026;
  let trend: { text: string; className: string };
  if (y2 > y1 + 3) trend = { text: '↗ RISING', className: 'text-[#36E7A1]' };
  else if (y2 < y1 - 5) trend = { text: '↘ DECLINING', className: 'text-[#EF4444]' };
  else trend = { text: '→ STABLE', className: 'text-[#94A3B8]' };

  const years = [
    { y: 2025, s: row.y2025 },
    { y: 2026, s: row.y2026 },
    { y: 2027, s: row.y2027 },
  ];

  const badgeCls =
    badge === 'SELL'
      ? 'bg-[rgba(239,68,68,0.15)] border-[rgba(239,68,68,0.3)] text-[#EF4444]'
      : badge === 'BUY'
        ? 'bg-[rgba(54,231,161,0.15)] border-[rgba(54,231,161,0.3)] text-[#36E7A1]'
        : 'bg-[rgba(148,163,184,0.1)] border-[rgba(148,163,184,0.2)] text-[#94A3B8]';

  return (
    <div className="glass-panel relative rounded-xl p-[14px]">
      <div className="flex items-start gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={row.photoUrl}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-white">{row.name}</p>
          <span
            className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-black font-mono"
            style={{
              background: `${CARD_POS_BADGE[row.position]}22`,
              color: CARD_POS_BADGE[row.position],
              border: `1px solid ${CARD_POS_BADGE[row.position]}44`,
            }}
          >
            {row.position}
          </span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-1">
        {years.map((cell, i) => {
          const g = gradeFromScore(cell.s);
          const col = scoreBandColor(cell.s);
          return (
            <div key={cell.y} className={clsx('px-1 py-1 text-center', i > 0 && 'border-l border-white/[0.06]')}>
              <p className="text-center text-[9px] font-mono text-[#64748B]">{cell.y}</p>
              <p className="text-center text-[17px] font-bold font-mono tabular-nums" style={{ color: col }}>
                {Math.round(cell.s)}
              </p>
              <p className="text-center text-[8px] font-bold font-mono" style={{ color: col }}>
                {abbrevGrade(g)}
              </p>
            </div>
          );
        })}
      </div>

      <p className={clsx('mt-2 text-[10px] font-black font-mono', trend.className)}>{trend.text}</p>

      <span
        className={clsx(
          'absolute bottom-2 right-2 rounded-[20px] border px-2 py-[2px] text-[9px] font-black font-mono',
          badgeCls,
        )}
      >
        {badge}
      </span>
    </div>
  );
}
