'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Zap,
  Target,
  Eye,
} from 'lucide-react';
import AppBackground from '@/components/AppBackground';
import {
  MARKET_VERDICT_COLORS,
  normalizeToMarketVerdict,
} from '@/lib/verdict/marketVerdict';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type {
  ScoutingData,
  WaiverRadarPlayer,
  ProcessResultsPlayer,
  HiddenGem,
  WREfficiencyPlayer,
} from '@/app/api/dashboard/scouting/route';

// ─── Design tokens ────────────────────────────────────────────────────────────

const MONO = { fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)' } as const;

const POS_COLOR: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};
function posColor(pos: string) { return POS_COLOR[pos?.toUpperCase()] ?? '#94A3B8'; }

function verdictMeta(v: string | null | undefined) {
  const mv = normalizeToMarketVerdict(v);
  if (!mv) return { color: '#64748B', label: 'N/A' };
  return { color: MARKET_VERDICT_COLORS[mv], label: mv };
}

const GLASS = {
  background: 'rgba(10,13,20,0.65)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
} as const;

// ─── Sleeper headshot ─────────────────────────────────────────────────────────

function PlayerThumb({ playerId, name, size = 36 }: { playerId: string; name: string; size?: number }) {
  const [errored, setErrored] = useState(false);
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (errored) {
    return (
      <div
        className="shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold"
        style={{ width: size, height: size, background: 'rgba(255,255,255,0.08)', color: '#94A3B8', ...MONO }}
      >
        {initials}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
      alt={name}
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
      onError={() => setErrored(true)}
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PanelSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 animate-pulse">
          <div className="skeleton shrink-0 rounded-full h-8 w-8" />
          <div className="flex-1 space-y-1">
            <div className="skeleton h-2 w-3/4" />
            <div className="skeleton h-1.5 w-1/2" />
          </div>
          <div className="skeleton h-5 w-10 rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── SVG Sparkline ────────────────────────────────────────────────────────────

function Sparkline({
  data,
  color,
  width = 60,
  height = 24,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Divergence Area Chart ────────────────────────────────────────────────────

function DivergenceChart({
  processHistory,
  resultsHistory,
}: {
  processHistory: number[];
  resultsHistory: number[];
}) {
  const W = 100;
  const H = 32;

  const allVals = [...processHistory, ...resultsHistory];
  const min = Math.min(...allVals) - 2;
  const max = Math.max(...allVals) + 2;
  const range = Math.max(max - min, 1);
  const n = Math.max(processHistory.length, resultsHistory.length);

  const toX = (i: number) => (i / (n - 1)) * W;
  const toY = (v: number) => H - ((v - min) / range) * (H - 4) - 2;

  const procPts = processHistory.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const resPts  = resultsHistory.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // Shaded area polygon between the two lines
  const fwd  = processHistory.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');
  const back  = resultsHistory.map((v, i) => `${toX(resultsHistory.length - 1 - i)},${toY(resultsHistory[resultsHistory.length - 1 - i] ?? v)}`).join(' ');
  const areaPath = `${fwd} ${back}`;

  return (
    <svg width={W} height={H} className="shrink-0">
      <defs>
        <linearGradient id="div-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#36E7A1" stopOpacity="0.10" />
        </linearGradient>
      </defs>
      <polygon points={areaPath} fill="url(#div-fill)" />
      <polyline points={procPts} fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeLinecap="round" />
      <polyline points={resPts}  fill="none" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Hex (6-point) Radar ─────────────────────────────────────────────────────

const HEX_AXES = [
  'Separation',
  'Routes Run',
  'TPRR',
  'Matchup',
  'Depth Chart',
  'Low Risk',
] as const;

function hexPoint(cx: number, cy: number, r: number, axisIdx: number) {
  const angle = ((axisIdx * 60) - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function hexPoly(values: number[], cx: number, cy: number, maxR: number): string {
  return values
    .map((v, i) => {
      const { x, y } = hexPoint(cx, cy, (v / 100) * maxR, i);
      return `${x},${y}`;
    })
    .join(' ');
}

const WR_COLORS = ['#22D3EE', '#A78BFA', '#36E7A1'] as const;

function HexRadar({
  players,
  selectedIds,
}: {
  players: WREfficiencyPlayer[];
  selectedIds: string[];
}) {
  const W = 220;
  const H = 200;
  const cx = W / 2;
  const cy = H / 2 + 4;
  const maxR = 72;
  const RINGS = [25, 50, 75, 100];

  const selected = selectedIds
    .map(id => players.find(p => p.player_id === id))
    .filter(Boolean) as WREfficiencyPlayer[];

  const benchmarkValues = [65, 62, 58, 61, 64, 70]; // avg reference

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ maxWidth: W }}>
      {/* Grid rings */}
      {RINGS.map(pct => (
        <polygon
          key={pct}
          points={hexPoly([pct, pct, pct, pct, pct, pct], cx, cy, maxR)}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* Axis lines */}
      {HEX_AXES.map((_, i) => {
        const { x, y } = hexPoint(cx, cy, maxR, i);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />;
      })}

      {/* Benchmark polygon */}
      <polygon
        points={hexPoly(benchmarkValues, cx, cy, maxR)}
        fill="rgba(34,211,238,0.06)"
        stroke="rgba(34,211,238,0.25)"
        strokeWidth="1"
        strokeDasharray="3,2"
      />

      {/* Player polygons */}
      {selected.map((player, pi) => {
        const vals = [
          player.separation_grade,
          player.routes_run_pct,
          player.tprr,
          player.matchup_multiplier,
          player.depth_chart_priority,
          player.boom_bust_risk,
        ];
        const col = WR_COLORS[pi % WR_COLORS.length]!;
        return (
          <polygon
            key={player.player_id}
            points={hexPoly(vals, cx, cy, maxR)}
            fill={`${col}22`}
            stroke={col}
            strokeWidth="1.5"
          />
        );
      })}

      {/* Axis labels */}
      {HEX_AXES.map((label, i) => {
        const r = maxR + 14;
        const { x, y } = hexPoint(cx, cy, r, i);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#22D3EE"
            fontSize="7"
            fontFamily="JetBrains Mono, monospace"
            opacity={0.75}
          >
            {label.slice(0, 8)}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Waiver Radar Panel ───────────────────────────────────────────────────────

type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE';

function WaiverRadarPanel({ players, gapPositions }: { players: WaiverRadarPlayer[]; gapPositions: string[] }) {
  const [filter, setFilter] = useState<PosFilter>('ALL');

  const filtered = filter === 'ALL' ? players : players.filter(p => p.position === filter);

  const FILTERS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE'];

  return (
    <section
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ ...GLASS, border: '1px solid rgba(34,211,238,0.15)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-[#22D3EE]" />
          <span className="text-[12px] font-bold uppercase tracking-widest text-white/70" style={MONO}>
            Waiver Radar
          </span>
        </div>
        {gapPositions.length > 0 && (
          <span className="text-[10px] text-[#22D3EE]/70 uppercase tracking-wide" style={MONO}>
            Needs: {gapPositions.join(', ')}
          </span>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/[0.05]">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all"
            style={{
              ...MONO,
              background: filter === f ? (f === 'ALL' ? 'rgba(34,211,238,0.18)' : `${posColor(f)}22`) : 'rgba(255,255,255,0.05)',
              color: filter === f ? (f === 'ALL' ? '#22D3EE' : posColor(f)) : '#64748B',
              border: `1px solid ${filter === f ? (f === 'ALL' ? 'rgba(34,211,238,0.40)' : posColor(f) + '55') : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/[0.04]" style={{ maxHeight: 440 }}>
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-[12px] text-white/30" style={MONO}>
            No waiver targets found
          </div>
        )}
        {filtered.map((p, i) => {
          const vm = verdictMeta(p.verdict);
          const isNeed = gapPositions.includes(p.position);
          return (
            <div
              key={p.player_id}
              className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-white/[0.03] transition-colors"
            >
              {/* Rank */}
              <span className="text-[11px] w-4 text-white/25 shrink-0 text-right" style={MONO}>{i + 1}</span>

              {/* Avatar */}
              <PlayerThumb playerId={p.player_id} name={p.name} size={32} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold text-white/90 truncate">{p.name}</span>
                  {isNeed && (
                    <span className="text-[9px] px-1 py-0.5 rounded font-bold uppercase"
                      style={{ background: 'rgba(34,211,238,0.15)', color: '#22D3EE', ...MONO }}>
                      NEED
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] font-bold" style={{ color: posColor(p.position), ...MONO }}>
                    {p.position}
                  </span>
                  <span className="text-[11px] text-white/30" style={MONO}>{p.team}</span>
                </div>
              </div>

              {/* Trend */}
              <div className="shrink-0">
                {p.trend === 'up'   && <TrendingUp  size={13} className="text-[#36E7A1]" />}
                {p.trend === 'down' && <TrendingDown size={13} className="text-[#EF4444]" />}
                {p.trend === 'flat' && <Minus        size={13} className="text-[#64748B]" />}
              </div>

              {/* Verdict badge */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                  style={{ ...MONO, background: `${vm.color}18`, color: vm.color, border: `1px solid ${vm.color}40` }}
                >
                  {vm.label}
                </span>
                <span className="text-[11px] font-bold" style={{ color: '#22D3EE', ...MONO }}>
                  {p.bbsm_score.toFixed(1)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* BBSM legend */}
      <div className="px-3 py-2 border-t border-white/[0.05] flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-white/25 uppercase tracking-wide" style={MONO}>BBSM =</span>
        {[
          { label: 'P3W', weight: '45%' },
          { label: 'Trend', weight: '30%' },
          { label: 'Need', weight: '25%' },
        ].map(({ label, weight }) => (
          <span key={label} className="text-[10px] text-white/35" style={MONO}>
            {label} <span className="text-white/20">{weight}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── Process vs Results Panel ─────────────────────────────────────────────────

function buildHistory(processScore: number, resultsScore: number, trend: string, n = 5): { proc: number[]; res: number[] } {
  const dir = trend === 'rising' ? 1 : trend === 'falling' ? -1 : 0;
  const proc: number[] = [];
  const res: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    proc.push(Math.round(processScore - dir * (1 - t) * 6 + (Math.random() * 2 - 1)));
    res.push(Math.round(resultsScore - dir * (1 - t) * 4 + (Math.random() * 2 - 1)));
  }
  return { proc, res };
}

function ProcessResultsPanel({ players }: { players: ProcessResultsPlayer[] }) {
  const gems  = players.filter(p => p.divergence_type === 'hidden_gem').slice(0, 6);
  const regs  = players.filter(p => p.divergence_type === 'regression_risk').slice(0, 4);
  const aligned = players.filter(p => p.divergence_type === 'aligned').slice(0, 4);

  function PlayerProcessRow({ p }: { p: ProcessResultsPlayer }) {
    const { proc, res } = buildHistory(p.process_score, p.results_score, p.tfo_trend);
    const isGem = p.divergence_type === 'hidden_gem';
    const isReg = p.divergence_type === 'regression_risk';
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-white/[0.03] transition-colors">
        <PlayerThumb playerId={p.player_id} name={p.name} size={28} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] font-semibold text-white/90 truncate">{p.name}</span>
            <span className="text-[10px] font-bold" style={{ color: posColor(p.position), ...MONO }}>{p.position}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-[#A78BFA]" style={MONO}>
              PROC {p.process_score.toFixed(0)}
            </span>
            <span className="text-[10px] text-white/20">|</span>
            <span className="text-[10px] text-[#36E7A1]" style={MONO}>
              RES {p.results_score.toFixed(0)}
            </span>
          </div>
        </div>
        <DivergenceChart processHistory={proc} resultsHistory={res} />
        <div className="shrink-0 text-right min-w-[36px]">
          <span
            className="text-[11px] font-bold"
            style={{ ...MONO, color: isGem ? '#36E7A1' : isReg ? '#EF4444' : '#94A3B8' }}
          >
            {p.divergence > 0 ? '+' : ''}{p.divergence.toFixed(0)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <section
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ ...GLASS, border: '1px solid rgba(167,139,250,0.15)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
        <Eye size={13} className="text-[#A78BFA]" />
        <span className="text-[12px] font-bold uppercase tracking-widest text-white/70" style={MONO}>
          Process vs Results
        </span>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ background: '#A78BFA' }} />
            <span className="text-[10px] text-white/30" style={MONO}>Process</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-0.5 rounded" style={{ background: '#36E7A1' }} />
            <span className="text-[10px] text-white/30" style={MONO}>Results</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ maxHeight: 460 }}>
        {gems.length > 0 && (
          <div>
            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
              <div className="h-px flex-1 bg-[#36E7A1]/20" />
              <span className="text-[10px] font-bold uppercase text-[#36E7A1]/70" style={MONO}>Hidden Gems — Process &gt; Results</span>
              <div className="h-px flex-1 bg-[#36E7A1]/20" />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {gems.map(p => <PlayerProcessRow key={p.player_id} p={p} />)}
            </div>
          </div>
        )}
        {regs.length > 0 && (
          <div>
            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
              <div className="h-px flex-1 bg-[#EF4444]/20" />
              <span className="text-[10px] font-bold uppercase text-[#EF4444]/70" style={MONO}>Regression Risk — Results &gt; Process</span>
              <div className="h-px flex-1 bg-[#EF4444]/20" />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {regs.map(p => <PlayerProcessRow key={p.player_id} p={p} />)}
            </div>
          </div>
        )}
        {aligned.length > 0 && (
          <div>
            <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
              <div className="h-px flex-1 bg-white/[0.06]" />
              <span className="text-[10px] font-bold uppercase text-white/25" style={MONO}>Aligned</span>
              <div className="h-px flex-1 bg-white/[0.06]" />
            </div>
            <div className="divide-y divide-white/[0.04]">
              {aligned.map(p => <PlayerProcessRow key={p.player_id} p={p} />)}
            </div>
          </div>
        )}
        {players.length === 0 && (
          <div className="px-4 py-10 text-center text-[12px] text-white/30" style={MONO}>
            No data — sync your leagues to populate
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Hidden Gems Panel ────────────────────────────────────────────────────────

function HiddenGemsPanel({ gems }: { gems: HiddenGem[] }) {
  return (
    <section
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ ...GLASS, border: '1px solid rgba(54,231,161,0.15)' }}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
        <Target size={13} className="text-[#36E7A1]" />
        <span className="text-[12px] font-bold uppercase tracking-widest text-white/70" style={MONO}>
          Hidden Gems
        </span>
        <span className="text-[10px] text-white/30 ml-auto" style={MONO}>BVI &gt; KTC + Process &gt; Results</span>
      </div>

      <div className="flex-1 divide-y divide-white/[0.05]" style={{ maxHeight: 460, overflowY: 'auto' }}>
        {gems.length === 0 && (
          <div className="px-4 py-10 text-center text-[12px] text-white/30" style={MONO}>
            No hidden gems detected — BVI data populates nightly
          </div>
        )}
        {gems.map(gem => {
          const vm = verdictMeta(gem.verdict);
          const gemVerdict = normalizeToMarketVerdict(gem.verdict);
          const isBoom = gemVerdict === 'BOOM' || gemVerdict === 'BUY';
          const posC = posColor(gem.position);
          const sparkData = [gem.results_score, (gem.results_score + gem.process_score) / 2, gem.process_score];

          return (
            <Link
              key={gem.player_id}
              href={`/dashboard/trade/finder?targetPlayerId=${gem.player_id}&intent=buy`}
              className="block px-3 py-3.5 hover:bg-white/[0.03] transition-colors group"
            >
              <div className="flex items-start gap-3">
                <PlayerThumb playerId={gem.player_id} name={gem.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[14px] font-semibold text-white/90">{gem.name}</span>
                    <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ background: `${posC}18`, color: posC, ...MONO }}>
                      {gem.position}
                    </span>
                    {isBoom && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                        style={{ background: 'rgba(54,231,161,0.18)', color: '#36E7A1', border: '1px solid rgba(54,231,161,0.40)', ...MONO }}>
                        BOOM
                      </span>
                    )}
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ml-auto"
                      style={{ background: `${vm.color}18`, color: vm.color, border: `1px solid ${vm.color}40`, ...MONO }}>
                      {vm.label}
                    </span>
                  </div>

                  {/* BVI delta badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px]" style={{ color: '#22D3EE', ...MONO }}>
                      BVI {gem.bvi_score.toLocaleString()} | KTC {gem.ktc_value.toLocaleString()} |{' '}
                      <span style={{ color: '#36E7A1' }}>△+{gem.delta.toLocaleString()} UNDERVALUED</span>
                    </span>
                  </div>

                  {/* Reasoning */}
                  <p className="text-[11px] text-white/45 leading-snug mt-1.5 line-clamp-2"
                    style={MONO}>
                    {gem.reasoning}
                  </p>
                </div>

                {/* Sparkline */}
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <Sparkline data={sparkData} color="#36E7A1" width={48} height={20} />
                  <span className="text-[10px] text-white/25 group-hover:text-[#22D3EE]/60 transition-colors" style={MONO}>
                    View →
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── WR Efficiency Matrix ─────────────────────────────────────────────────────

function WREfficiencyMatrix({ players }: { players: WREfficiencyPlayer[] }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  // Auto-select top 2 on data load
  useEffect(() => {
    if (players.length >= 1 && selected.length === 0) {
      setSelected(players.slice(0, 2).map(p => p.player_id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players.length]);

  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{ ...GLASS, border: '1px solid rgba(34,211,238,0.12)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#22D3EE', boxShadow: '0 0 6px #22D3EE' }} />
          <span className="text-[12px] font-bold uppercase tracking-widest text-white/70" style={MONO}>
            WR Efficiency Matrix
          </span>
        </div>
        <span className="ml-auto text-[10px] text-white/30" style={MONO}>Compare up to 3 WRs</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-0">
        {/* Radar */}
        <div className="flex items-center justify-center p-4 sm:w-[240px] shrink-0">
          <HexRadar players={players} selectedIds={selected} />
        </div>

        {/* Legend + WR picker */}
        <div className="flex-1 border-t sm:border-t-0 sm:border-l border-white/[0.07]">
          {/* Legend */}
          {selected.length > 0 && (
            <div className="flex items-center gap-3 px-3 py-2 border-b border-white/[0.05] flex-wrap">
              {selected.map((id, i) => {
                const p = players.find(p => p.player_id === id);
                if (!p) return null;
                return (
                  <div key={id} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: WR_COLORS[i % WR_COLORS.length] }} />
                    <span className="text-[11px] text-white/70" style={MONO}>{p.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Axis breakdown for selected player */}
          {selected[0] && (() => {
            const p = players.find(pl => pl.player_id === selected[0]);
            if (!p) return null;
            const axes = [
              { label: 'Separation Grade', val: p.separation_grade },
              { label: 'Routes Run %',     val: p.routes_run_pct },
              { label: 'TPRR',             val: p.tprr },
              { label: 'Matchup Mult.',    val: p.matchup_multiplier },
              { label: 'Depth Chart',      val: p.depth_chart_priority },
              { label: 'Low Risk',         val: p.boom_bust_risk },
            ];
            return (
              <div className="px-3 py-2 space-y-1 border-b border-white/[0.05]">
                {axes.map(({ label, val }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className="text-[10px] text-white/40 w-28 shrink-0 truncate" style={MONO}>{label}</span>
                    <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${val}%`, background: '#22D3EE' }}
                      />
                    </div>
                    <span className="text-[10px] w-6 text-right" style={{ color: '#22D3EE', ...MONO }}>{Math.round(val)}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Player picker */}
          <div className="overflow-y-auto divide-y divide-white/[0.04]" style={{ maxHeight: 200 }}>
            {players.map((p) => {
              const isSelected = selected.includes(p.player_id);
              const selIdx = selected.indexOf(p.player_id);
              return (
                <button
                  key={p.player_id}
                  onClick={() => toggle(p.player_id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <div
                    className="w-2 h-2 rounded-full shrink-0 transition-all"
                    style={{
                      background: isSelected ? WR_COLORS[selIdx % WR_COLORS.length] : 'rgba(255,255,255,0.12)',
                      boxShadow: isSelected ? `0 0 6px ${WR_COLORS[selIdx % WR_COLORS.length]}` : 'none',
                    }}
                  />
                  <span className="text-[11px] font-medium truncate" style={{ color: isSelected ? '#fff' : '#94A3B8' }}>
                    {p.name}
                  </span>
                  <span className="ml-auto text-[10px] shrink-0" style={{ color: '#22D3EE', ...MONO }}>
                    {Math.round(p.depth_chart_priority)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScoutingPage() {
  const activeLeagueId = useDashboardLeagueStore(s => s.activeLeagueId);
  const [data, setData] = useState<ScoutingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = activeLeagueId ? `?leagueId=${activeLeagueId}` : '';
      const res = await fetch(`/api/dashboard/scouting${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as ScoutingData;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLeagueId]);

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      void load();
    }
  }, [load]);

  // Reload when league changes
  useEffect(() => {
    if (hasFetched.current) {
      hasFetched.current = false;
      void load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLeagueId]);

  return (
    <AppBackground intensity="subtle">
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(10,13,20,0.90)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors"
          style={{ ...MONO, fontSize: 11 }}
        >
          <ChevronLeft size={14} />
          Dashboard
        </Link>
        <span className="text-white/20 text-xs">/</span>
        <span className="text-white/60 text-[12px] uppercase tracking-widest" style={MONO}>
          Scouting Terminal
        </span>
        {data && (
          <span className="text-white/30 text-[11px] ml-1" style={MONO}>
            — {data.activeLeagueName}
          </span>
        )}
        <button
          onClick={() => void load(true)}
          disabled={refreshing}
          className="ml-auto flex items-center gap-1.5 text-white/30 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="text-[11px]" style={MONO}>Refresh</span>
        </button>
      </nav>

      <main className="min-h-screen pt-16 pb-20 px-3 sm:px-5">

        {/* Page header */}
        <div className="mb-4">
          <h1 className="text-[18px] font-bold tracking-tight text-white/90">Scouting Terminal</h1>
          <p className="text-[12px] text-white/35 mt-0.5" style={MONO}>
            Waiver radar · Process vs results · Hidden gems · WR efficiency
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-3 text-[12px] text-[#EF4444]" style={MONO}>
            {error}
          </div>
        )}

        {/* ── THREE COLUMN GRID ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">

          {/* LEFT — Waiver Radar */}
          <div>
            {loading
              ? (
                <div className="rounded-2xl overflow-hidden" style={GLASS}>
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <div className="skeleton h-2.5 w-24" />
                  </div>
                  <PanelSkeleton rows={8} />
                </div>
              )
              : (
                <WaiverRadarPanel
                  players={data?.waiverRadar ?? []}
                  gapPositions={data?.gapPositions ?? []}
                />
              )}
          </div>

          {/* CENTER — Process vs Results */}
          <div>
            {loading
              ? (
                <div className="rounded-2xl overflow-hidden" style={GLASS}>
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <div className="skeleton h-2.5 w-32" />
                  </div>
                  <PanelSkeleton rows={8} />
                </div>
              )
              : (
                <ProcessResultsPanel players={data?.processResults ?? []} />
              )}
          </div>

          {/* RIGHT — Hidden Gems */}
          <div>
            {loading
              ? (
                <div className="rounded-2xl overflow-hidden" style={GLASS}>
                  <div className="px-4 py-3 border-b border-white/[0.07]">
                    <div className="skeleton h-2.5 w-20" />
                  </div>
                  <PanelSkeleton rows={4} />
                </div>
              )
              : (
                <HiddenGemsPanel gems={data?.hiddenGems ?? []} />
              )}
          </div>
        </div>

        {/* ── BOTTOM — WR Efficiency Matrix ────────────────────────────────── */}
        {loading
          ? (
            <div className="rounded-2xl overflow-hidden" style={GLASS}>
              <div className="px-4 py-3 border-b border-white/[0.07]">
                <div className="skeleton h-2.5 w-40" />
              </div>
              <div className="h-52 flex items-center justify-center">
                <div className="skeleton h-32 w-32 rounded-full" />
              </div>
            </div>
          )
          : (
            <WREfficiencyMatrix players={data?.wrEfficiency ?? []} />
          )}

        {/* Empty state guidance */}
        {!loading && !error && data && data.waiverRadar.length === 0 && data.processResults.length === 0 && (
          <div
            className="mt-6 rounded-2xl px-6 py-8 text-center"
            style={{ ...GLASS, border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <p className="text-[15px] font-semibold text-white/60 mb-1">No scouting data yet</p>
            <p className="text-[12px] text-white/35" style={MONO}>
              The nightly engine populates tfo_cache at 2 AM. Sync your leagues first.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-[#22D3EE] hover:underline"
              style={MONO}
            >
              Go to Dashboard →
            </Link>
          </div>
        )}
      </main>
    </AppBackground>
  );
}
