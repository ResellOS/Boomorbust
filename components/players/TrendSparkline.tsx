'use client';

import type { TrendDirection } from '@/lib/players/types';

interface TrendSparklineProps {
  history: number[];
  trend: TrendDirection;
}

function strokeColor(trend: TrendDirection): string {
  if (trend === 'up') return '#36E7A1';
  if (trend === 'down') return '#A78BFA';
  return '#FBBF24';
}

export default function TrendSparkline({ history, trend }: TrendSparklineProps) {
  const pts = history.length >= 2 ? history : [50, 50, 50, 50, 50, 50, 50];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const step = w / Math.max(pts.length - 1, 1);

  const poly = pts
    .map((v, i) => {
      const x = i * step;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={80} height={28} aria-hidden>
      <polyline
        points={poly}
        fill="none"
        stroke={strokeColor(trend)}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </svg>
  );
}
