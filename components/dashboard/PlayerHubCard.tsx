'use client';

import { useId } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { getPositionAccent, normalizePosition } from './radarMetrics';
import { nflTeamPrimaryHex } from '@/lib/nfl/teamPrimaryHex';

export type HubVariant = 'mvp' | 'threat';

export interface RadarMetric {
  /** Short label, e.g. "Air Yards Share". */
  label: string;
  /** Normalized value 0..1. */
  value: number;
}

export interface PlayerHubCardProps {
  variant: HubVariant;
  name: string;
  position: string;
  team: string;
  /** Optional photo URL — pass a transparent cutout for the "floating" look. */
  photoUrl?: string;
  /** Live projected delta (e.g. +8.1). */
  projectedDelta: number;
  /** Tagline beneath delta, e.g. "pts project". */
  projectedLabel?: string;
  /** @deprecated Optional band title; radar-only mock layout omits the band. */
  hubBandTitle?: string;
  /** Per-axis radar values for the player's position. */
  radar: RadarMetric[];
  /** Optional rotation index/total for "1 / 10" indicator in the header. */
  rotationIndex?: number;
  rotationTotal?: number;
  /** TFO formula outputs (when hub-derived). */
  tfoScore?: number;
  tfoGrade?: string;
  tfoReasoning?: string;
  className?: string;
}

const POS_BG_TINT: Record<string, string> = {
  QB: 'rgba(251,191,36,0.20)',
  RB: 'rgba(54,231,161,0.20)',
  WR: 'rgba(34,211,238,0.20)',
  TE: 'rgba(167,139,250,0.20)',
  OTHER: 'rgba(148,163,184,0.20)',
};

const BOOM_EMERALD = '#36E7A1';
const BUST_BLOOD = '#EF4444';
const RADAR_CX = 110;
const RADAR_CY = 100;
const RADAR_R = 70;

function axisAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

function polarPoint(value: number, i: number, n: number, radius = RADAR_R) {
  const angle = axisAngle(i, n);
  return {
    x: RADAR_CX + value * radius * Math.cos(angle),
    y: RADAR_CY + value * radius * Math.sin(angle),
  };
}

function polygonPoints(values: number[], n: number, radius = RADAR_R): string {
  return values
    .map((v, i) => {
      const p = polarPoint(v, i, n, radius);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

export default function PlayerHubCard({
  variant,
  name,
  position,
  team,
  photoUrl,
  projectedDelta,
  projectedLabel = 'pts project',
  radar,
  rotationIndex,
  rotationTotal,
  tfoScore,
  tfoGrade,
  tfoReasoning,
  className = '',
}: PlayerHubCardProps) {
  const id = useId();
  const isMvp = variant === 'mvp';
  const normalizedPos = normalizePosition(position);
  const positionAccent = getPositionAccent(position);

  // Boom / bust HUD — emerald vs blood red (not position tint on bust radar).
  const frameAccent = isMvp ? BOOM_EMERALD : BUST_BLOOD;
  const frameSoft = isMvp ? 'rgba(54,231,161,0.32)' : 'rgba(239,68,68,0.28)';
  const frameEdge = isMvp ? 'rgba(54,231,161,0.55)' : 'rgba(239,68,68,0.55)';
  const bgGradient = isMvp
    ? 'linear-gradient(180deg, rgba(6,28,18,0.55) 0%, rgba(13,17,23,0.35) 62%)'
    : 'linear-gradient(180deg, rgba(28,6,10,0.55) 0%, rgba(13,17,23,0.35) 62%)';

  const radarAccent = isMvp ? BOOM_EMERALD : BUST_BLOOD;
  const posTint = POS_BG_TINT[normalizedPos] ?? POS_BG_TINT.OTHER;
  const teamHex = nflTeamPrimaryHex(team);

  const n = radar.length;
  const rings = [0.33, 0.66, 1];

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  /** Team primary at ~15% for headshot halo (hex + alpha). */
  const teamHalo = `${teamHex}26`;

  return (
    <div
      className={`glass-panel relative flex flex-col overflow-hidden rounded-xl transition-all duration-500 ${className}`}
      style={{
        background: bgGradient,
        boxShadow: `
          inset 0 0 20px rgba(255,255,255,0.04),
          0 0 0 1px ${frameEdge},
          0 0 28px ${frameSoft},
          0 12px 40px rgba(0,0,0,0.35)
        `,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(120% 50% at 50% 0%, ${teamHex} 0%, transparent 65%)`,
        }}
      />
      {/* Card chrome — mock "PLAYER HUB" + menu */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1 relative z-10">
        <span className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">
          PLAYER HUB
        </span>
        <div className="flex items-center gap-2">
          {typeof rotationIndex === 'number' && typeof rotationTotal === 'number' && rotationTotal > 1 && (
            <span className="text-[8px] font-mono-tactical text-slate-600 uppercase tracking-wider">
              {rotationIndex + 1} / {rotationTotal}
            </span>
          )}
          <button
            type="button"
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Hub options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header — position chip + delta */}
      <div className="flex items-start justify-between px-4 pb-2 relative z-10">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider"
              style={{ background: posTint, color: positionAccent.hex }}
            >
              {normalizedPos === 'OTHER' ? position : normalizedPos}
            </span>
          </div>
          <h3 className="text-sm font-black uppercase tracking-tight text-white leading-tight">
            {name}
          </h3>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 font-mono-tactical">
            {team} • {normalizedPos === 'OTHER' ? position : normalizedPos}
          </p>
          {typeof tfoScore === 'number' && tfoGrade && (
            <>
              <p className="mt-1 text-[11px] font-mono-tactical tracking-[0.04em]">
                <span style={{ color: positionAccent.hex }}>TFO {Math.round(tfoScore)}</span>
                <span style={{ color: '#64748B' }}> · </span>
                <span style={{ color: '#94A3B8' }}>{tfoGrade.replace(/_/g, ' ')}</span>
              </p>
              {tfoReasoning ? (
                <p
                  className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono-tactical text-[10px] text-[#64748B]"
                  title={tfoReasoning}
                >
                  {tfoReasoning}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="text-right">
          <div
            className={`text-2xl font-black font-mono-tactical leading-none ${
              isMvp ? 'text-[#36E7A1]' : 'text-[#EF4444]'
            }`}
            style={{
              textShadow: isMvp
                ? '0 0 18px rgba(54,231,161,0.65), 0 0 36px rgba(54,231,161,0.28)'
                : '0 0 18px rgba(239,68,68,0.5), 0 0 32px rgba(239,68,68,0.18)',
            }}
          >
            {projectedDelta > 0 ? '+' : ''}
            {projectedDelta.toFixed(1)}
          </div>
          <div className="text-[8px] uppercase tracking-widest text-slate-500 mt-1 font-bold">
            {projectedLabel}
          </div>
        </div>
      </div>

      {/* Player photo / cutout layer */}
      <div className="relative h-28 -mt-1 overflow-hidden z-10">
        <div
          aria-hidden
          className="absolute left-1/2 bottom-1 -translate-x-1/2 w-[7.5rem] h-[7.5rem] rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${teamHalo} 0%, transparent 68%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-32 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${frameSoft}, transparent 70%)`,
          }}
        />
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="absolute inset-x-0 bottom-0 mx-auto h-[7.25rem] w-auto max-w-[min(100%,200px)] object-contain object-bottom drop-shadow-[0_10px_24px_rgba(0,0,0,0.65)]"
            style={{
              filter: isMvp
                ? `drop-shadow(0 0 14px ${BOOM_EMERALD}55)`
                : `drop-shadow(0 0 14px ${BUST_BLOOD}55)`,
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            aria-hidden
            className="absolute left-1/2 bottom-2 -translate-x-1/2 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black font-mono-tactical"
            style={{
              color: frameAccent,
              border: `1.5px solid ${frameEdge}`,
              background: 'rgba(13,17,23,0.6)',
              boxShadow: `0 0 20px ${frameSoft}`,
            }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Radar chart with position-colored fill on a targeting grid */}
      <div className="relative px-3 pb-3 z-10">
        <div
          aria-hidden
          className="absolute inset-3 rounded-lg pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '12px 12px',
          }}
        />
        <svg
          viewBox={`0 0 ${RADAR_CX * 2} ${RADAR_CY * 2 + 20}`}
          className="w-full h-auto relative"
        >
          <defs>
            <radialGradient id={`${id}-fill`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={radarAccent} stopOpacity={0.4} />
              <stop offset="100%" stopColor={radarAccent} stopOpacity={0.14} />
            </radialGradient>
            <filter id={`${id}-rglow`} x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {rings.map((ratio) => (
            <polygon
              key={ratio}
              points={polygonPoints(Array(n).fill(ratio), n)}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
            />
          ))}

          {radar.map((_, i) => {
            const outer = polarPoint(1, i, n);
            return (
              <line
                key={i}
                x1={RADAR_CX}
                y1={RADAR_CY}
                x2={outer.x.toFixed(1)}
                y2={outer.y.toFixed(1)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}

          {/* Position-colored filled polygon */}
          <polygon
            points={polygonPoints(radar.map((m) => m.value), n)}
            fill={`url(#${id}-fill)`}
            stroke={radarAccent}
            strokeWidth={2.25}
            style={{
              filter: `url(#${id}-rglow) drop-shadow(0 0 10px ${isMvp ? 'rgba(54,231,161,0.55)' : 'rgba(239,68,68,0.5)'})`,
            }}
          />

          {radar.map((m, i) => {
            const p = polarPoint(m.value, i, n);
            return (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r={2.2}
                fill={radarAccent}
                filter={`url(#${id}-rglow)`}
              />
            );
          })}

          {/* Axis labels at pentagon vertices */}
          {radar.map((m, i) => {
            const angle = axisAngle(i, n);
            const vx = RADAR_CX + RADAR_R * Math.cos(angle);
            const vy = RADAR_CY + RADAR_R * Math.sin(angle);
            let anchor: 'start' | 'end' | 'middle';
            if (Math.abs(vx - RADAR_CX) < 5) anchor = 'middle';
            else anchor = vx > RADAR_CX ? 'start' : 'end';
            const tx = vx + (anchor === 'start' ? 6 : anchor === 'end' ? -6 : 0);
            const ty = vy + (vy > RADAR_CY ? 10 : -4);
            const shortLabel = m.label.length > 6 ? m.label.slice(0, 6) : m.label;
            return (
              <text
                key={`axis-${i}`}
                x={tx}
                y={ty}
                fill={positionAccent.hex}
                fillOpacity={0.7}
                fontSize={7}
                fontWeight={600}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="var(--font-mono-tactical), JetBrains Mono, ui-monospace, monospace"
              >
                {shortLabel}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
