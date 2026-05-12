'use client';

import { useId, useMemo } from 'react';
import { clsx } from 'clsx';
import { MoreHorizontal } from 'lucide-react';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from './PlayerBhsActions';
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
  /** Sleeper player id — used for headshot CDN + avatar fallback. */
  playerId: string;
  name: string;
  position: string;
  team: string;
  /** @deprecated Avatar uses Sleeper CDN via playerId; kept for API compatibility. */
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
  /** TFO line — from `tfo_cache` on dashboard + narrative from formula on server. */
  tfoScore?: number;
  tfoGrade?: string;
  tfoReasoning?: string;
  /** `tfo_cache.verdict` for Buy/Hold/Sell strip (normalized server-side). */
  tfoVerdict?: string | null;
  /** Active league for trade finder deep links. */
  leagueId?: string | null;
  className?: string;
  /** Compact hub tile: smaller avatar + radar, no vertical bleed. */
  compact?: boolean;
}

const POS_BG_TINT: Record<string, string> = {
  QB: 'rgba(251,191,36,0.20)',
  RB: 'rgba(54,231,161,0.20)',
  WR: 'rgba(34,211,238,0.20)',
  TE: 'rgba(167,139,250,0.20)',
  OTHER: 'rgba(148,163,184,0.20)',
};

const BOOM_EMERALD = '#36E7A1';
const BUST_PURPLE = '#A78BFA';
const BUST_PURPLE_DEEP = '#7c3aed';

type RadarGeom = {
  RADAR_CX: number;
  RADAR_CY: number;
  RADAR_R: number;
  AXIS_LABEL_RADIUS: number;
  RADAR_SVG_W: number;
  RADAR_SVG_H: number;
  avatarSize: number;
};

const RADAR_FULL: RadarGeom = {
  RADAR_CX: 118,
  RADAR_CY: 124,
  RADAR_R: 94,
  AXIS_LABEL_RADIUS: 112,
  RADAR_SVG_W: 244,
  RADAR_SVG_H: 256,
  avatarSize: 104,
};

const RADAR_COMPACT: RadarGeom = {
  RADAR_CX: 54,
  RADAR_CY: 58,
  RADAR_R: 42,
  AXIS_LABEL_RADIUS: 52,
  RADAR_SVG_W: 112,
  RADAR_SVG_H: 120,
  avatarSize: 56,
};

function axisAngle(i: number, n: number): number {
  return (2 * Math.PI * i) / n - Math.PI / 2;
}

export default function PlayerHubCard({
  variant,
  playerId,
  name,
  position,
  team,
  photoUrl: _photoUrl, // eslint-disable-line @typescript-eslint/no-unused-vars
  projectedDelta,
  projectedLabel = 'pts project',
  radar,
  rotationIndex,
  rotationTotal,
  tfoScore,
  tfoGrade,
  tfoReasoning,
  tfoVerdict,
  leagueId = null,
  className = '',
  compact = false,
}: PlayerHubCardProps) {
  const id = useId();
  const isMvp = variant === 'mvp';
  const normalizedPos = normalizePosition(position);
  const positionAccent = getPositionAccent(position);
  const geom = useMemo(() => (compact ? RADAR_COMPACT : RADAR_FULL), [compact]);

  const polarPoint = (value: number, i: number, n: number, radius = geom.RADAR_R) => {
    const angle = axisAngle(i, n);
    return {
      x: geom.RADAR_CX + value * radius * Math.cos(angle),
      y: geom.RADAR_CY + value * radius * Math.sin(angle),
    };
  };

  const polygonPoints = (values: number[], n: number, radius = geom.RADAR_R): string =>
    values
      .map((v, i) => {
        const p = polarPoint(v, i, n, radius);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

  /** Emerald BOOM vs purple BUST — neon only, no black drop shadow. */
  const frameEdge = isMvp ? 'rgba(54,231,161,0.55)' : 'rgba(167,139,250,0.55)';
  const frameSoft = isMvp ? 'rgba(54,231,161,0.32)' : 'rgba(124,58,237,0.28)';
  const outerGlow = isMvp ? 'rgba(54,231,161,0.38)' : 'rgba(167,139,250,0.36)';
  const bgGradient = isMvp
    ? 'linear-gradient(180deg, rgba(6,28,18,0.5) 0%, rgba(13,17,23,0.32) 62%)'
    : 'linear-gradient(180deg, rgba(24,12,40,0.52) 0%, rgba(13,17,23,0.32) 62%)';

  const radarAccent = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const deltaColor = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const tfoAccentColor = isMvp ? BOOM_EMERALD : BUST_PURPLE;
  const posTint = POS_BG_TINT[normalizedPos] ?? POS_BG_TINT.OTHER;
  const teamHex = nflTeamPrimaryHex(team);

  const n = radar.length;
  const rings = [0.33, 0.66, 1];

  const teamHalo = `${teamHex}26`;

  const deltaGlow = isMvp
    ? '0 0 14px rgba(54,231,161,0.55), 0 0 28px rgba(54,231,161,0.22)'
    : '0 0 14px rgba(167,139,250,0.5), 0 0 28px rgba(124,58,237,0.2)';

  const radarDropGlow = isMvp ? 'rgba(54,231,161,0.5)' : 'rgba(167,139,250,0.48)';

  return (
    <div
      className={`glass-panel relative flex w-full flex-col overflow-hidden rounded-xl transition-all duration-500 ${
        compact ? 'min-h-0 max-h-[320px]' : 'h-full min-h-0'
      } ${className}`}
      style={{
        background: bgGradient,
        boxShadow: `
          inset 0 0 16px rgba(255,255,255,0.04),
          0 0 0 1px ${frameEdge},
          0 0 22px ${frameSoft},
          0 0 40px ${outerGlow}
        `,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(120% 50% at 50% 0%, ${teamHex} 0%, transparent 65%)`,
        }}
      />
      <div
        className={clsx(
          'flex items-center justify-between relative z-10',
          compact ? 'px-2 pt-2 pb-0.5' : 'px-3 pt-3 pb-1',
        )}
      >
        <span
          className={clsx(
            'font-black uppercase tracking-[0.28em] text-slate-500',
            compact ? 'text-[7px]' : 'text-[9px]',
          )}
        >
          PLAYER HUB
        </span>
        <div className="flex items-center gap-1.5">
          {typeof rotationIndex === 'number' && typeof rotationTotal === 'number' && rotationTotal > 1 && (
            <span className="text-[8px] font-mono-tactical text-slate-600 uppercase tracking-wider">
              {rotationIndex + 1} / {rotationTotal}
            </span>
          )}
          <button
            type="button"
            className="p-0.5 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
            aria-label="Hub options"
          >
            <MoreHorizontal className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
          </button>
        </div>
      </div>

      <div
        className={clsx(
          'flex items-start justify-between relative z-10 gap-1.5',
          compact ? 'px-2 pb-1' : 'px-4 pb-2',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 mb-0.5">
            <span
              className={clsx(
                'font-black px-1 py-0.5 rounded uppercase tracking-wider',
                compact ? 'text-[7px]' : 'text-[9px]',
              )}
              style={{ background: posTint, color: positionAccent.hex }}
            >
              {normalizedPos === 'OTHER' ? position : normalizedPos}
            </span>
          </div>
          <h3
            className={clsx(
              'font-black uppercase tracking-tight text-white leading-tight truncate',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {name}
          </h3>
          <p
            className={clsx(
              'font-bold text-slate-500 uppercase tracking-wider mt-0.5 font-mono-tactical truncate',
              compact ? 'text-[8px]' : 'text-[9px]',
            )}
          >
            {team} • {normalizedPos === 'OTHER' ? position : normalizedPos}
          </p>
          {typeof tfoScore === 'number' && tfoGrade && (
            <>
              <p className="mt-1 text-[11px] leading-tight font-mono-tactical tracking-[0.04em]">
                <span style={{ color: tfoAccentColor }}>TFO {Math.round(tfoScore)}</span>
                <span style={{ color: '#64748B' }}> · </span>
                <span style={{ color: '#94A3B8' }}>{tfoGrade.replace(/_/g, ' ')}</span>
              </p>
              {tfoReasoning ? (
                <p
                  className="mt-0.5 max-w-full overflow-hidden text-ellipsis whitespace-nowrap font-mono-tactical text-[10px] leading-snug text-[#64748B]"
                  title={tfoReasoning}
                >
                  {tfoReasoning}
                </p>
              ) : null}
            </>
          )}
        </div>
        <div className="text-right shrink-0">
          <div
            className={clsx('font-black font-mono-tactical leading-none', compact ? 'text-lg' : 'text-2xl')}
            style={{
              color: deltaColor,
              textShadow: deltaGlow,
            }}
          >
            {projectedDelta > 0 ? '+' : ''}
            {Number.isFinite(projectedDelta) ? projectedDelta.toFixed(1) : '—'}
          </div>
          <div
            className={clsx(
              'uppercase tracking-widest text-slate-500 mt-0.5 font-bold font-mono-tactical',
              compact ? 'text-[7px]' : 'text-[8px]',
            )}
          >
            {projectedLabel}
          </div>
        </div>
      </div>

      {playerId ? (
        <div className={clsx('relative z-10', compact ? 'px-2 pb-1' : 'px-3 pb-2')}>
          <PlayerBhsActions
            tfoVerdict={tfoVerdict}
            playerId={playerId}
            playerName={name}
            leagueId={leagueId}
            compact={compact}
          />
        </div>
      ) : null}

      <div className={clsx('relative shrink-0 overflow-hidden z-10', compact ? 'h-14 -mt-0.5' : 'h-24 -mt-1')}>
        <div
          aria-hidden
          className="absolute left-1/2 bottom-0 -translate-x-1/2 rounded-full pointer-events-none"
          style={{
            width: compact ? '4.5rem' : '7.5rem',
            height: compact ? '4.5rem' : '7.5rem',
            background: `radial-gradient(circle, ${teamHalo} 0%, transparent 68%)`,
          }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: compact ? '3.5rem' : '8rem',
            background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${frameSoft}, transparent 70%)`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center">
          <div
            style={{
              filter: isMvp
                ? `drop-shadow(0 0 10px ${BOOM_EMERALD}66)`
                : `drop-shadow(0 0 10px ${BUST_PURPLE_DEEP}55)`,
            }}
          >
            <PlayerAvatar
              playerId={playerId}
              playerName={name}
              position={position}
              size={geom.avatarSize}
            />
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'relative z-10 flex flex-col px-1.5 flex-1 min-h-0',
          compact ? 'pb-1.5 pt-0 max-h-[140px]' : 'px-3 pb-3 pt-1 min-h-[min(280px,42vh)]',
        )}
      >
        <div
          aria-hidden
          className="absolute inset-2 rounded-lg pointer-events-none opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '10px 10px',
          }}
        />
        <svg
          viewBox={`0 0 ${geom.RADAR_SVG_W} ${geom.RADAR_SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className={clsx('relative w-full', compact ? 'h-[120px] max-h-[120px]' : 'h-full min-h-[200px] flex-1')}
        >
          <defs>
            <radialGradient id={`${id}-fill`} cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={radarAccent} stopOpacity={0.42} />
              <stop offset="100%" stopColor={radarAccent} stopOpacity={0.12} />
            </radialGradient>
            <filter id={`${id}-rglow`} x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="3" result="blur" />
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
                x1={geom.RADAR_CX}
                y1={geom.RADAR_CY}
                x2={outer.x.toFixed(1)}
                y2={outer.y.toFixed(1)}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={polygonPoints(radar.map((m) => m.value), n)}
            fill={`url(#${id}-fill)`}
            stroke={radarAccent}
            strokeWidth={compact ? 1.75 : 2.25}
            style={{
              filter: `url(#${id}-rglow) drop-shadow(0 0 8px ${radarDropGlow})`,
            }}
          />

          {radar.map((m, i) => {
            const p = polarPoint(m.value, i, n);
            return (
              <circle
                key={i}
                cx={p.x.toFixed(1)}
                cy={p.y.toFixed(1)}
                r={compact ? 1.6 : 2.2}
                fill={radarAccent}
                filter={`url(#${id}-rglow)`}
              />
            );
          })}

          {radar.map((m, i) => {
            const angle = axisAngle(i, n);
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const tx = geom.RADAR_CX + geom.AXIS_LABEL_RADIUS * cos;
            const ty = geom.RADAR_CY + geom.AXIS_LABEL_RADIUS * sin;
            let anchor: 'start' | 'end' | 'middle';
            if (Math.abs(cos) < 0.18) anchor = 'middle';
            else anchor = cos > 0 ? 'start' : 'end';
            return (
              <text
                key={`axis-${i}`}
                x={tx}
                y={ty}
                fill={positionAccent.hex}
                fillOpacity={0.92}
                fontSize={compact ? 7 : 8}
                fontWeight={600}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontFamily="var(--font-mono-tactical), JetBrains Mono, ui-monospace, monospace"
              >
                {m.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
