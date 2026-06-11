'use client';

import { useMemo } from 'react';
import type { PlayerSubScores } from '@/lib/players/types';

const AXES = ['OPPORTUNITY', 'SITUATION', 'AGE CURVE', 'IQ', 'UPSIDE'] as const;
const N = 5;
const CX = 95;
const CY = 95;
const MAX_R = 58;

function vertexPoint(i: number, radius: number): { x: number; y: number } {
  const angle = -Math.PI / 2 + (i * 2 * Math.PI) / N;
  return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
}

interface PlayerRadarProps {
  subScores: PlayerSubScores;
  color?: string;
}

export default function PlayerRadar({ subScores, color = '#36E7A1' }: PlayerRadarProps) {
  const radar = useMemo(() => {
    const vals = [
      subScores.opportunity / 100,
      subScores.situation / 100,
      subScores.ageCurve / 100,
      subScores.iq / 100,
      subScores.upside / 100,
    ];

    const rings = [1, 0.75, 0.5, 0.25].map((scale) =>
      Array.from({ length: N }, (_, i) => {
        const p = vertexPoint(i, MAX_R * scale);
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      }).join(' '),
    );

    const dataPts = vals
      .map((v, i) => {
        const p = vertexPoint(i, MAX_R * Math.min(0.98, Math.max(0.1, v)));
        return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      })
      .join(' ');

    const labels = AXES.map((label, i) => {
      const p = vertexPoint(i, MAX_R + 14);
      return { label, x: p.x, y: p.y };
    });

    return { rings, dataPts, labels, vals };
  }, [subScores]);

  return (
    <svg viewBox="0 0 190 190" className="mx-auto block w-full max-w-[190px]" aria-hidden>
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
        {Array.from({ length: N }, (_, i) => {
          const p = vertexPoint(i, MAX_R);
          return (
            <line
              key={`axis-${i}`}
              x1={0}
              y1={0}
              x2={p.x}
              y2={p.y}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={radar.dataPts}
          fill={color}
          fillOpacity={0.18}
          stroke={color}
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
            fill="#6b7a99"
            fontSize={7}
          >
            {l.label.length > 10 ? l.label.slice(0, 9) : l.label}
          </text>
        ))}
      </g>
    </svg>
  );
}
