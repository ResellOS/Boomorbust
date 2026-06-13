'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { deriveRadarVals, getCardBorderStyle, getTier, getVerdict } from '@/lib/verdict';

export interface PlayerCardProps {
  playerName: string;
  position: string;
  team: string;
  playerId: string;
  tfoScore: number;
  radarVals: number[];
  tier: string;
}

const POSITION_AXES: Record<string, readonly string[]> = {
  QB: ['PASS', 'RUSH', 'OLINE', 'WRQUAL', 'SCHEME'],
  RB: ['RUSH', 'TGTS', 'OLINE', 'EXPLOS', 'RZTCH'],
  WR: ['TGTS', 'AIRYDS', 'SEPAR', 'YAC', 'RZTGT'],
  TE: ['TGTS', 'AIRYDS', 'SEPAR', 'YAC', 'RZTGT'],
};
const DEFAULT_AXES = ['OPPORT', 'SITUAT', 'AGE', 'IQ', 'UPSIDE'] as const;

const POSITION_COLOR: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FBBF24',
  TE: '#A78BFA',
};

function axisLabelsFor(position: string): readonly string[] {
  return POSITION_AXES[(position ?? '').toUpperCase()] ?? DEFAULT_AXES;
}

function axisColorFor(position: string): string {
  return POSITION_COLOR[(position ?? '').toUpperCase()] ?? '#6b7a99';
}

const N = 5;
const CX = 98;
const CY = 96;
const MAX_R = 46;
const LABEL_R = 68;

function vertexPoint(i: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

const BADGE_CLASS: Record<string, string> = {
  'STRONG BOOM': 'bg-boom/10 border border-boom/30 text-boom',
  BOOM: 'bg-boom/[0.07] border border-boom/20 text-boom',
  HOLD: 'bg-hold/[0.08] border border-hold/[0.22] text-hold',
  BUST: 'bg-bust/[0.08] border border-bust/[0.22] text-bust',
  'STRONG BUST': 'bg-bust/[0.12] border border-bust/30 text-bust',
};

export default function PlayerCard({
  playerName,
  position,
  team,
  playerId,
  tfoScore,
  radarVals,
  tier,
}: PlayerCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const verdict = getVerdict(tfoScore);
  const displayTier = tier || getTier(tfoScore);
  const axisLabels = axisLabelsFor(position);
  const axisColor = axisColorFor(position);
  const borderStyle = getCardBorderStyle(verdict.label);

  const radar = useMemo(() => {
    const vals = radarVals.length === N ? radarVals : deriveRadarVals(playerId, tfoScore);
    const rings = [1, 0.75, 0.5, 0.25].map((scale) => {
      const pts = Array.from({ length: N }, (_, i) => {
        const p = vertexPoint(i, MAX_R * scale);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      });
      return pts.join(' ');
    });
    const dataPts = vals
      .map((v, i) => {
        const p = vertexPoint(i, MAX_R * v);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');
    const axisLines = Array.from({ length: N }, (_, i) => {
      const p = vertexPoint(i, MAX_R);
      return { x2: p.x, y2: p.y };
    });
    const labels = axisLabels.map((label, i) => {
      const p = vertexPoint(i, LABEL_R);
      return { label, x: p.x, y: p.y };
    });
    return { rings, dataPts, axisLines, labels, vals };
  }, [playerId, radarVals, tfoScore, axisLabels]);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[9px] bg-surface transition-transform duration-100 hover:-translate-y-px"
      style={borderStyle}
    >
      <div className="flex items-stretch px-2.5 pb-2 pt-2.5">
        <div
          className="relative w-[60px] shrink-0 overflow-hidden rounded-[7px] border border-border/60 bg-surface2"
          style={{ minHeight: 72 }}
        >
          {!imgFailed ? (
            <Image
              src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
              alt={playerName}
              width={60}
              height={72}
              unoptimized
              className="block h-full w-full object-cover object-top"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center font-figtree text-[15px] font-bold"
              style={{ color: verdict.color, background: '#141929' }}
            >
              {initials(playerName)}
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-[9px]">
          <div className="mb-0.5 font-figtree text-[13px] font-bold leading-tight text-text">
            {playerName}
          </div>
          <div className="mb-1.5 font-mono text-[12px] text-muted">
            {position} · {team}
          </div>
          <div
            className="font-figtree text-[32px] font-normal leading-none tracking-[-1.5px]"
            style={{ color: verdict.color }}
          >
            {tfoScore.toFixed(1)}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-muted">{displayTier}</div>
        </div>
      </div>
      <div
        className={`mx-2.5 mb-1.5 rounded-[5px] py-[5px] text-center font-figtree text-[11px] font-semibold tracking-wide ${BADGE_CLASS[verdict.label] ?? BADGE_CLASS.BOOM}`}
      >
        {verdict.label}
      </div>
      <div className="px-1 pb-2 pt-0.5">
        <svg viewBox="0 0 196 200" className="block w-full" xmlns="http://www.w3.org/2000/svg">
          <g transform={`translate(${CX},${CY})`}>
            {radar.rings.map((pts) => (
              <polygon key={pts} points={pts} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
            ))}
            {radar.axisLines.map((line, i) => (
              <line
                key={`axis-${i}`}
                x1={0}
                y1={0}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={1}
              />
            ))}
            <polygon
              points={radar.dataPts}
              fill={verdict.color}
              fillOpacity={0.18}
              stroke={verdict.color}
              strokeWidth={1.5}
              strokeOpacity={0.55}
            />
            {radar.labels.map((l) => (
              <text
                key={l.label}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono"
                fill={axisColor}
                fillOpacity={0.9}
                fontSize={8}
              >
                {l.label}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
