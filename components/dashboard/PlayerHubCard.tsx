'use client';

// ─────────────────────────────────────────────────────────────────────────────
// PlayerHubCard — DASH_003  (new compact verdict card, ~180px wide × ≈300px tall)
// Default export → new design.
// Named export `PlayerHubCardLegacy` → old mvp/threat variant (keeps existing
//   dashboard/page.tsx working until the full dashboard rebuild lands).
// Named export `RadarMetric` → unchanged; imported by radarMetrics.ts.
// ─────────────────────────────────────────────────────────────────────────────

import { useId, useMemo } from 'react';
import { clsx } from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from './PlayerBhsActions';
import { getPositionAccent, normalizePosition } from './radarMetrics';
import { nflTeamPrimaryHex } from '@/lib/nfl/teamPrimaryHex';
import { formatLegacyVerdictLabel } from '@/lib/ui/labels';

// ─── Shared type (imported by radarMetrics.ts — keep stable) ─────────────────

export interface RadarMetric {
  label: string;
  /** Normalized 0..1 */
  value: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION A — DASH_003 (new card)
// ═══════════════════════════════════════════════════════════════════════════════

export type Verdict = 'BOOM' | 'BUST' | 'HOLD' | 'SELL';

export interface PlayerHubData {
  playerId: string;
  name: string;
  /** 'QB' | 'RB' | 'WR' | 'TE' */
  position: string;
  team: string;
  /** TFO score 0–100 */
  tfoScore: number;
  /** E.g. "Elite Upside", "High Floor", "Declining Value" */
  subLabel?: string;
  /**
   * [OPS, SFS, FIG, SIT, IRS] normalized 0..1.
   * Falls back to deterministic derivation from tfoScore when omitted.
   */
  radarValues?: [number, number, number, number, number];
  /**
   * Benchmark trace [OPS, SFS, FIG, SIT, IRS] 0..1.
   * Falls back to position-average constants when omitted.
   */
  benchmarkValues?: [number, number, number, number, number];
}

export interface PlayerHubCardProps {
  player: PlayerHubData;
  verdict: Verdict;
  className?: string;
}

// ── Pentagon constants ────────────────────────────────────────────────────────

const N          = 5;
const RADAR_CX   = 60;
const RADAR_CY   = 62;  // offset slightly down so top vertex clears label area
const RADAR_R    = 42;
const LABEL_R    = 55;
const SVG_W      = 120;
const SVG_H      = 124;
const AXIS_LABELS: [string, string, string, string, string] = [
  'Opportunity',
  'Scheme Fit',
  'Profile',
  'Situation',
  'Risk',
];

// ── Position colors ───────────────────────────────────────────────────────────

const POSITION_COLOR: Record<string, string> = {
  QB:    '#FBBF24',
  RB:    '#36E7A1',
  WR:    '#22D3EE',
  TE:    '#A78BFA',
};

function positionColor(pos: string): string {
  return POSITION_COLOR[pos.toUpperCase()] ?? '#94A3B8';
}

// ── Verdict styles ────────────────────────────────────────────────────────────

const VERDICT_STYLE: Record<Verdict, { border: string; shadow: string; valueColor: string }> = {
  BOOM: { border: 'rgba(16,185,129,0.30)', shadow: '0 0 20px rgba(54,231,161,0.12)',  valueColor: '#36E7A1' },
  BUST: { border: 'rgba(239,68,68,0.30)',  shadow: '0 0 20px rgba(239,68,68,0.12)',   valueColor: '#EF4444' },
  HOLD: { border: 'rgba(251,191,36,0.30)', shadow: '0 0 16px rgba(251,191,36,0.08)',  valueColor: '#FBBF24' },
  SELL: { border: 'rgba(239,68,68,0.40)',  shadow: '0 0 24px rgba(239,68,68,0.15)',   valueColor: '#EF4444' },
};

// Colors mirror MARKET_VERDICT_COLORS (design-system canonical):
// BOOM green · HOLD amber · SELL deep amber · BUST purple.
const VERDICT_BADGE: Record<Verdict, { bg: string; color: string }> = {
  BOOM: { bg: 'rgba(54,231,161,0.18)',  color: '#36E7A1' },
  HOLD: { bg: 'rgba(251,191,36,0.18)',  color: '#FBBF24' },
  SELL: { bg: 'rgba(245,158,11,0.18)',  color: '#f59e0b' },
  BUST: { bg: 'rgba(167,139,250,0.18)', color: '#A78BFA' },
};

// ── Position-level benchmark traces ──────────────────────────────────────────

const POSITION_BENCHMARKS: Record<string, [number, number, number, number, number]> = {
  QB: [0.75, 0.65, 0.60, 0.68, 0.72],
  RB: [0.70, 0.60, 0.65, 0.72, 0.68],
  WR: [0.72, 0.68, 0.75, 0.65, 0.70],
  TE: [0.60, 0.62, 0.65, 0.68, 0.72],
};
const DEFAULT_BENCH: [number, number, number, number, number] = [0.65, 0.65, 0.65, 0.65, 0.65];

// ── Deterministic radar derivation when no explicit values given ──────────────

function seededUnit(seed: string, salt: number): number {
  let h = 0x811c9dc5;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10001) / 10000;
}

function deriveRadarValues(
  tfoScore: number,
  playerId: string,
  verdict: Verdict,
): [number, number, number, number, number] {
  const verdictBase: Record<Verdict, number> = {
    BOOM: 0.82, HOLD: 0.62, BUST: 0.38, SELL: 0.45,
  };
  const base = (tfoScore / 100) * 0.5 + verdictBase[verdict] * 0.5;
  return [0, 1, 2, 3, 4].map((i) => {
    const jitter = (seededUnit(playerId, i + 100) - 0.5) * 0.35;
    return Math.min(0.97, Math.max(0.08, base + jitter));
  }) as [number, number, number, number, number];
}

// ── SVG geometry helpers ──────────────────────────────────────────────────────

function axisAngle(i: number): number {
  return (2 * Math.PI * i) / N - Math.PI / 2;
}

function polarPt(value: number, i: number, r = RADAR_R): { x: number; y: number } {
  const a = axisAngle(i);
  return {
    x: RADAR_CX + value * r * Math.cos(a),
    y: RADAR_CY + value * r * Math.sin(a),
  };
}

function polygonPts(vals: number[], r = RADAR_R): string {
  return vals
    .map((v, i) => {
      const p = polarPt(v, i, r);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

function labelAnchor(i: number): 'start' | 'end' | 'middle' {
  const cos = Math.cos(axisAngle(i));
  if (Math.abs(cos) < 0.18) return 'middle';
  return cos > 0 ? 'start' : 'end';
}

// ── Verdict badge pill ────────────────────────────────────────────────────────

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const s = VERDICT_BADGE[verdict];
  return (
    <span
      className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.08em] leading-none"
      style={{
        background: s.bg,
        color: s.color,
        fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
      }}
    >
      {formatLegacyVerdictLabel(verdict)}
    </span>
  );
}

// ── Default export — DASH_003 ────────────────────────────────────────────────

export default function PlayerHubCard({ player, verdict, className }: PlayerHubCardProps) {
  const uid = useId();
  const glowId  = `${uid.replace(/:/g, '')}-glow`;
  const fillId  = `${uid.replace(/:/g, '')}-fill`;

  const vs = VERDICT_STYLE[verdict];
  const pos = player.position.toUpperCase();
  const posColor = positionColor(pos);
  const _posColorFill = `${posColor}40`;

  const radarVals = useMemo(
    () => player.radarValues ?? deriveRadarValues(player.tfoScore, player.playerId, verdict),
    [player.radarValues, player.tfoScore, player.playerId, verdict],
  );

  const benchVals = useMemo(
    () =>
      player.benchmarkValues ??
      (POSITION_BENCHMARKS[pos] ?? DEFAULT_BENCH),
    [player.benchmarkValues, pos],
  );

  const rings = [0.33, 0.66, 1];

  return (
    <article
      className={`flex flex-col rounded-xl p-3 transition-shadow duration-300 ${className ?? ''}`}
      style={{
        width: 180,
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${vs.border}`,
        boxShadow: vs.shadow,
      }}
    >
      {/* ── Avatar ───────────────────────────────────────────────── */}
      <div className="flex justify-center mb-2">
        <PlayerAvatar
          playerId={player.playerId}
          playerName={player.name}
          position={player.position}
          size={48}
          thumb
          style={{ border: `2px solid ${posColor}40`, boxShadow: `0 0 10px ${posColor}20` }}
        />
      </div>

      {/* ── Header: name + pos·team ───────────────────────────────── */}
      <div className="mb-2 min-w-0 text-center">
        <p
          className="truncate font-semibold leading-tight text-white"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 13,
          }}
        >
          {player.name}
        </p>
        <p
          className="truncate leading-tight mt-0.5"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 11,
            color: '#64748B',
          }}
        >
          {player.position.toUpperCase()} · {player.team}
        </p>
      </div>

      {/* ── Pentagon radar chart ──────────────────────────────────── */}
      <div className="flex justify-center my-1">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width={110}
          height={110}
          aria-hidden
          focusable="false"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Fill gradient — position-colored */}
            <radialGradient id={fillId} cx="50%" cy="50%" r="65%">
              <stop offset="0%"   stopColor={posColor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={posColor} stopOpacity={0.08} />
            </radialGradient>

            {/* Glow filter — feGaussianBlur + feComposite */}
            <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" result="glow" />
            </filter>
          </defs>

          {/* Guide rings */}
          {rings.map((ratio) => (
            <polygon
              key={ratio}
              points={polygonPts(Array(N).fill(ratio))}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={0.75}
            />
          ))}

          {/* Axis spokes */}
          {AXIS_LABELS.map((_, i) => {
            const outer = polarPt(1, i);
            return (
              <line
                key={i}
                x1={RADAR_CX}
                y1={RADAR_CY}
                x2={outer.x.toFixed(1)}
                y2={outer.y.toFixed(1)}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={0.75}
              />
            );
          })}

          {/* Benchmark trace — league-average reference line, no fill */}
          <polygon
            points={polygonPts(benchVals)}
            fill="none"
            stroke="rgba(34,211,238,0.25)"
            strokeWidth={1}
            strokeDasharray="3 2"
          />

          {/* Player data shape — position-colored fill + stroke + glow */}
          <polygon
            points={polygonPts(radarVals)}
            fill={`url(#${fillId})`}
            stroke={posColor}
            strokeWidth={1.5}
            strokeOpacity={0.8}
            style={{ filter: `url(#${glowId})` }}
          />

          {/* Vertex dots */}
          {radarVals.map((v, i) => {
            const p = polarPt(v, i);
            return (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r={2}
                fill={posColor}
                fillOpacity={0.9}
              />
            );
          })}

          {/* Axis labels */}
          {AXIS_LABELS.map((label, i) => {
            const a     = axisAngle(i);
            const tx    = RADAR_CX + LABEL_R * Math.cos(a);
            const ty    = RADAR_CY + LABEL_R * Math.sin(a);
            const anchor = labelAnchor(i);
            return (
              <text
                key={label}
                x={tx.toFixed(1)}
                y={ty.toFixed(1)}
                fill="#64748B"
                fontSize={8}
                fontWeight={600}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="var(--font-mono), JetBrains Mono, ui-monospace, monospace"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>

      {/* ── Bottom: TFO score + verdict badge + sub-label ─────────── */}
      <div className="flex flex-col items-center gap-1.5 mt-1">
        {/* TFO score */}
        <span
          className="leading-none tabular-nums font-bold"
          style={{
            fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
            fontSize: 28,
            color: vs.valueColor,
            textShadow: `0 0 16px ${vs.valueColor}50`,
          }}
        >
          {Math.round(player.tfoScore)}
        </span>

        {/* Verdict badge */}
        <VerdictBadge verdict={verdict} />

        {/* Sub-label */}
        {player.subLabel && (
          <span
            className="leading-none text-center"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize: 10,
              color: '#64748B',
            }}
          >
            {player.subLabel}
          </span>
        )}
      </div>
    </article>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION B — Legacy card (existing mvp/threat variant)
// Kept as named export so app/dashboard/page.tsx can import it as:
//   import { PlayerHubCardLegacy as PlayerHubCard } from …
// ═══════════════════════════════════════════════════════════════════════════════

export type HubVariant = 'mvp' | 'threat';

export interface PlayerHubCardLegacyProps {
  variant: HubVariant;
  playerId: string;
  name: string;
  position: string;
  team: string;
  /** @deprecated kept for API compat */
  photoUrl?: string;
  projectedDelta: number;
  projectedLabel?: string;
  /** @deprecated */
  hubBandTitle?: string;
  radar: RadarMetric[];
  rotationIndex?: number;
  rotationTotal?: number;
  tfoScore?: number;
  tfoGrade?: string;
  tfoReasoning?: string;
  tfoVerdict?: string | null;
  leagueId?: string | null;
  className?: string;
  compact?: boolean;
}

const POS_BG_TINT: Record<string, string> = {
  QB:    'rgba(251,191,36,0.20)',
  RB:    'rgba(54,231,161,0.20)',
  WR:    'rgba(34,211,238,0.20)',
  TE:    'rgba(167,139,250,0.20)',
  OTHER: 'rgba(148,163,184,0.20)',
};

const BOOM_EMERALD   = '#36E7A1';
const BUST_PURPLE    = '#A78BFA';
const BUST_PURPLE_DEEP = '#7c3aed';

type RadarGeom = {
  RADAR_CX: number; RADAR_CY: number; RADAR_R: number;
  AXIS_LABEL_RADIUS: number; RADAR_SVG_W: number; RADAR_SVG_H: number;
  avatarSize: number;
};

const RADAR_FULL: RadarGeom    = { RADAR_CX: 118, RADAR_CY: 124, RADAR_R: 94,  AXIS_LABEL_RADIUS: 112, RADAR_SVG_W: 244, RADAR_SVG_H: 256, avatarSize: 104 };
const RADAR_COMPACT: RadarGeom = { RADAR_CX: 54,  RADAR_CY: 58,  RADAR_R: 42,  AXIS_LABEL_RADIUS: 52,  RADAR_SVG_W: 112, RADAR_SVG_H: 120, avatarSize: 56  };

function legacyAxisAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

export function PlayerHubCardLegacy({
  variant, playerId, name, position, team,
  photoUrl: _pUrl,
  projectedDelta, projectedLabel = 'pts project',
  radar, rotationIndex, rotationTotal,
  tfoScore, tfoGrade, tfoReasoning, tfoVerdict,
  leagueId = null, className = '', compact = false,
}: PlayerHubCardLegacyProps) {
  const id = useId();
  const isMvp = variant === 'mvp';
  const normalizedPos = normalizePosition(position);
  const positionAccent = getPositionAccent(position);
  const geom = useMemo(() => (compact ? RADAR_COMPACT : RADAR_FULL), [compact]);

  const polarPoint = (value: number, i: number, n: number, radius = geom.RADAR_R) => {
    const angle = legacyAxisAngle(i, n);
    return {
      x: geom.RADAR_CX + value * radius * Math.cos(angle),
      y: geom.RADAR_CY + value * radius * Math.sin(angle),
    };
  };

  const polygonPoints = (values: number[], n: number, radius = geom.RADAR_R): string =>
    values.map((v, i) => { const p = polarPoint(v, i, n, radius); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');

  const frameEdge   = isMvp ? 'rgba(54,231,161,0.55)' : 'rgba(167,139,250,0.55)';
  const frameSoft   = isMvp ? 'rgba(54,231,161,0.32)' : 'rgba(124,58,237,0.28)';
  const outerGlow   = isMvp ? 'rgba(54,231,161,0.38)' : 'rgba(167,139,250,0.36)';
  const bgGradient  = isMvp
    ? 'linear-gradient(180deg, rgba(6,28,18,0.5) 0%, rgba(13,17,23,0.32) 62%)'
    : 'linear-gradient(180deg, rgba(24,12,40,0.52) 0%, rgba(13,17,23,0.32) 62%)';

  const radarAccent    = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const deltaColor     = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const tfoAccentColor = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const posTint        = POS_BG_TINT[normalizedPos] ?? POS_BG_TINT.OTHER;
  const teamHex        = nflTeamPrimaryHex(team);
  const teamHalo       = `${teamHex}26`;
  const n              = radar.length;
  const rings          = [0.33, 0.66, 1];

  const deltaGlow = isMvp
    ? '0 0 14px rgba(54,231,161,0.55), 0 0 28px rgba(54,231,161,0.22)'
    : '0 0 14px rgba(167,139,250,0.5), 0 0 28px rgba(124,58,237,0.2)';

  const radarDropGlow = isMvp ? 'rgba(54,231,161,0.5)' : 'rgba(167,139,250,0.48)';

  return (
    <div
      className={`glass-panel relative flex w-full flex-col overflow-hidden rounded-xl transition-all duration-500 ${compact ? 'min-h-0 max-h-[320px]' : 'h-full min-h-0'} ${className}`}
      style={{
        background: bgGradient,
        boxShadow: `inset 0 0 16px rgba(255,255,255,0.04), 0 0 0 1px ${frameEdge}, 0 0 22px ${frameSoft}, 0 0 40px ${outerGlow}`,
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-35"
        style={{ background: `radial-gradient(120% 50% at 50% 0%, ${teamHex} 0%, transparent 65%)` }} />

      <div className={clsx('flex items-center justify-between relative z-10', compact ? 'px-2 pt-2 pb-0.5' : 'px-3 pt-3 pb-1')}>
        <span className={clsx('font-black uppercase tracking-[0.28em] text-slate-500', compact ? 'text-[7px]' : 'text-[9px]')}>PLAYER HUB</span>
        <div className="flex items-center gap-1.5">
          {typeof rotationIndex === 'number' && typeof rotationTotal === 'number' && rotationTotal > 1 && (
            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-wider">{rotationIndex + 1} / {rotationTotal}</span>
          )}
          <button type="button" className="p-0.5 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors" aria-label="Hub options">
            <MoreHorizontal className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </div>
      </div>

      <div className={clsx('flex items-start justify-between relative z-10 gap-1.5', compact ? 'px-2 pb-1' : 'px-4 pb-2')}>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span className={clsx('font-black px-1 py-0.5 rounded uppercase tracking-wider', compact ? 'text-[7px]' : 'text-[9px]')}
              style={{ background: posTint, color: positionAccent.hex }}>
              {normalizedPos === 'OTHER' ? position : normalizedPos}
            </span>
          </div>
          <h3 className={clsx('font-black uppercase tracking-tight text-white leading-tight truncate', compact ? 'text-xs' : 'text-sm')}>{name}</h3>
          <p className={clsx('font-bold text-slate-500 uppercase tracking-wider mt-0.5 font-mono truncate', compact ? 'text-[8px]' : 'text-[9px]')}>{team} • {normalizedPos === 'OTHER' ? position : normalizedPos}</p>
          {typeof tfoScore === 'number' && tfoGrade && (
            <>
              <p className="mt-1 text-[11px] leading-tight font-mono tracking-[0.04em]">
                <span style={{ color: tfoAccentColor }}>Rating {Math.round(tfoScore)}</span>
                <span style={{ color: '#64748B' }}> · </span>
                <span style={{ color: '#94A3B8' }}>{tfoGrade.replace(/_/g, ' ')}</span>
              </p>
              {tfoReasoning ? (
                <p className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[10px] leading-snug text-[#64748B]" title={tfoReasoning}>{tfoReasoning}</p>
              ) : null}
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className={clsx('font-black font-mono leading-none', compact ? 'text-lg' : 'text-2xl')}
            style={{ color: deltaColor, textShadow: deltaGlow }}>
            {projectedDelta > 0 ? '+' : ''}{Number.isFinite(projectedDelta) ? projectedDelta.toFixed(1) : '—'}
          </div>
          <div className={clsx('uppercase tracking-widest text-slate-500 mt-0.5 font-bold font-mono', compact ? 'text-[7px]' : 'text-[8px]')}>{projectedLabel}</div>
        </div>
      </div>

      {playerId ? (
        <div className={clsx('relative z-10', compact ? 'px-2 pb-1' : 'px-3 pb-2')}>
          <PlayerBhsActions tfoVerdict={tfoVerdict} playerId={playerId} playerName={name} leagueId={leagueId} compact={compact} />
        </div>
      ) : null}

      <div className={clsx('relative shrink-0 overflow-hidden z-10', compact ? 'h-14 -mt-0.5' : 'h-24 -mt-1')}>
        <div aria-hidden className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full pointer-events-none"
          style={{ width: compact ? '4.5rem' : '7.5rem', height: compact ? '4.5rem' : '7.5rem', background: `radial-gradient(circle, ${teamHalo} 0%, transparent 68%)` }} />
        <div aria-hidden className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{ height: compact ? '3.5rem' : '8rem', background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${frameSoft}, transparent 70%)` }} />
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
          <div style={{ filter: isMvp ? `drop-shadow(0 0 10px ${BOOM_EMERALD}66)` : `drop-shadow(0 0 10px ${BUST_PURPLE_DEEP}55)` }}>
            <PlayerAvatar playerId={playerId} playerName={name} position={position} size={geom.avatarSize} />
          </div>
        </div>
      </div>

      <div className={clsx('relative z-10 flex flex-col px-1.5 flex-1 min-h-0', compact ? 'pb-1.5 pt-0 max-h-[140px]' : 'px-3 pb-3 pt-1 min-h-[min(280px,42vh)]')}>
        <div aria-hidden className="absolute inset-2 rounded-lg pointer-events-none opacity-50"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
        <svg viewBox={`0 0 ${geom.RADAR_SVG_W} ${geom.RADAR_SVG_H}`} preserveAspectRatio="xMidYMid meet"
          className={clsx('relative w-full', compact ? 'h-[120px] max-h-[120px]' : 'h-full min-h-[200px] flex-1')}>
          <defs>
            <radialGradient id={`${id}-fill`} cx="50%" cy="50%" r="60%">
              <stop offset="0%"   stopColor={radarAccent} stopOpacity={0.42} />
              <stop offset="100%" stopColor={radarAccent} stopOpacity={0.12} />
            </radialGradient>
            <filter id={`${id}-rglow`} x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {rings.map((ratio) => (
            <polygon key={ratio} points={polygonPoints(Array(n).fill(ratio), n)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {radar.map((_, i) => {
            const outer = polarPoint(1, i, n);
            return <line key={i} x1={geom.RADAR_CX} y1={geom.RADAR_CY} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />;
          })}
          <polygon points={polygonPoints(radar.map((m) => m.value), n)} fill={`url(#${id}-fill)`} stroke={radarAccent} strokeWidth={compact ? 1.75 : 2.25}
            style={{ filter: `url(#${id}-rglow) drop-shadow(0 0 8px ${radarDropGlow})` }} />
          {radar.map((m, i) => {
            const p = polarPoint(m.value, i, n);
            return <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r={compact ? 1.6 : 2.2} fill={radarAccent} filter={`url(#${id}-rglow)`} />;
          })}
          {radar.map((m, i) => {
            const angle = legacyAxisAngle(i, n);
            const cos = Math.cos(angle); const sin = Math.sin(angle);
            const tx = geom.RADAR_CX + geom.AXIS_LABEL_RADIUS * cos;
            const ty = geom.RADAR_CY + geom.AXIS_LABEL_RADIUS * sin;
            let anchor: 'start' | 'end' | 'middle';
            if (Math.abs(cos) < 0.18) anchor = 'middle';
            else anchor = cos > 0 ? 'start' : 'end';
            return (
              <text key={`axis-${i}`} x={tx} y={ty} fill={positionAccent.hex} fillOpacity={0.92} fontSize={compact ? 7 : 8}
                fontWeight={600} textAnchor={anchor} dominantBaseline="middle"
                fontFamily="var(--font-mono), JetBrains Mono, ui-monospace, monospace">
                {m.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
