'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { getTier, getVerdict } from '@/lib/verdict';

export interface PlayerCardProps {
  playerName: string;
  position: string;
  team: string;
  playerId: string;
  tfoScore: number;
  radarVals: number[];
  tier: string;
}

const AXIS_LABELS = ['OPPORTUNITY', 'SITUATION', 'AGE CURVE', 'IQ', 'UPSIDE'] as const;
const N = 5;
const CX = 98;
const CY = 93;
const MAX_R = 50;
const LABEL_R = 62;

function seededUnit(seed: string, salt: number): number {
  let h = 0x811c9dc5;
  const s = `${seed}:${salt}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return 0.35 + (((h >>> 0) % 6001) / 10000);
}

export function deriveRadarVals(playerId: string, tfoScore: number): number[] {
  const base = tfoScore / 100;
  return Array.from({ length: N }, (_, i) =>
    Math.min(0.98, Math.max(0.15, base * seededUnit(playerId, i))),
  );
}

function vertexPoint(i: number, radius: number): { x: number; y: number } {
  const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / N;
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

const BORDER_CLASS = {
  boom: 'border-boom/25',
  hold: 'border-hold/20',
  bust: 'border-bust/25',
} as const;

const AVATAR_BORDER = {
  boom: 'border-boom',
  hold: 'border-hold',
  bust: 'border-bust',
} as const;

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
    const labels = AXIS_LABELS.map((label, i) => {
      const p = vertexPoint(i, LABEL_R);
      return { label, x: p.x, y: p.y };
    });
    const valueLabels = vals.map((v, i) => {
      const p = vertexPoint(i, MAX_R * v + 6);
      return { x: p.x, y: p.y, value: Math.round(v * 100) };
    });
    return { rings, dataPts, axisLines, labels, valueLabels, vals };
  }, [playerId, radarVals, tfoScore]);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[9px] bg-surface transition-transform duration-100 hover:-translate-y-px border ${BORDER_CLASS[verdict.class]}`}
    >
      <div className="flex items-stretch px-2.5 pb-2 pt-2.5">
        <div
          className={`relative w-[60px] shrink-0 overflow-hidden rounded-[7px] border-2 bg-surface2 ${AVATAR_BORDER[verdict.class]}`}
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
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0"
            style={{
              height: '28%',
              background: 'linear-gradient(to bottom, transparent, #0f1420)',
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center pl-[9px]">
          <div className="mb-0.5 font-figtree text-xs font-bold leading-tight text-text">
            {playerName}
          </div>
          <div className="mb-1.5 font-mono text-[10px] text-muted">
            {position} · {team}
          </div>
          <div
            className="font-figtree text-[32px] font-normal leading-none tracking-[-1.5px]"
            style={{ color: verdict.color }}
          >
            {tfoScore.toFixed(1)}
          </div>
          <div className="mt-0.5 font-mono text-[8px] text-muted">{displayTier}</div>
        </div>
      </div>
      <div
        className={`mx-2.5 mb-1.5 rounded-[5px] py-[5px] text-center font-figtree text-[11px] font-semibold tracking-wide ${BADGE_CLASS[verdict.label] ?? BADGE_CLASS.BOOM}`}
      >
        {verdict.label}
      </div>
      <div className="px-1 pb-[7px]">
        <svg viewBox="0 0 196 186" className="block w-full" xmlns="http://www.w3.org/2000/svg">
          <g transform={`translate(${CX},${CY})`}>
            {radar.rings.map((pts) => (
              <polygon
                key={pts}
                points={pts}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth={1}
              />
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
            {radar.vals.map((v, i) => {
              const p = vertexPoint(i, MAX_R * v);
              return (
                <circle
                  key={`dot-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={2.5}
                  fill={verdict.color}
                />
              );
            })}
            {radar.labels.map((l) => (
              <text
                key={l.label}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono"
                fill="#6b7a99"
                fontSize={7}
              >
                {l.label.length > 10 ? `${l.label.slice(0, 9)}…` : l.label}
              </text>
            ))}
            {radar.valueLabels.map((vl, i) => (
              <text
                key={`val-${i}`}
                x={vl.x}
                y={vl.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono"
                fill={verdict.color}
                fontSize={7.5}
                fontWeight={700}
              >
                {vl.value}
              </text>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
