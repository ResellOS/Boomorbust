'use client';

import { useCallback, useMemo, useState } from 'react';
import type { WRMatrixPoint, WRMatrixResponse } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

interface Props {
  data: WRMatrixResponse | null;
  loading: boolean;
}

const W = 320;
const H = 200;
const PAD_L = 36;
const PAD_R = 12;
const PAD_T = 16;
const PAD_B = 28;
const PX0 = PAD_L;
const PX1 = W - PAD_R;
const PY0 = PAD_T;
const PY1 = H - PAD_B;

function toPlot(xPct: number, yPct: number): { x: number; y: number } {
  return {
    x: PX0 + (xPct / 100) * (PX1 - PX0),
    y: PY0 + (1 - yPct / 100) * (PY1 - PY0),
  };
}

export default function WREfficiencyMatrix({ data, loading }: Props) {
  const [tip, setTip] = useState<{ x: number; y: number; p: WRMatrixPoint } | null>(null);

  const dots = useMemo(() => {
    const points = data?.points ?? [];
    return points.map((p) => {
      const { x, y } = toPlot(p.xPct, p.yPct);
      return { ...p, cx: x, cy: y };
    });
  }, [data?.points]);

  const midX = (PX0 + PX1) / 2;
  const midY = (PY0 + PY1) / 2;

  const onLeave = useCallback(() => setTip(null), []);

  if (loading) {
    return (
      <div className={`${GLASS} mt-4 p-4 animate-pulse`}>
        <div className="h-4 w-40 bg-white/[0.06] rounded mb-3" />
        <div className="h-[200px] bg-white/[0.05] rounded-lg" />
      </div>
    );
  }

  return (
    <div className={`${GLASS} mt-4 overflow-hidden relative`} onMouseLeave={onLeave}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[13px] uppercase tracking-widest text-[#64748B] font-semibold">WR EFFICIENCY MATRIX</p>
        <button type="button" className="text-[13px] text-[#22D3EE] hover:underline bg-transparent border-0 cursor-pointer">
          View Full Matrix →
        </button>
      </div>

      <div className="p-3 relative w-full max-w-[360px] mx-auto md:max-w-none">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto max-h-[220px]"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="WR efficiency scatter plot"
        >
          <defs>
            <pattern id="wrGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x={PX0} y={PY0} width={PX1 - PX0} height={PY1 - PY0} fill="url(#wrGrid)" />

          <line x1={midX} y1={PY0} x2={midX} y2={PY1} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1={PX0} y1={midY} x2={PX1} y2={midY} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          <text x={PX0 + 4} y={PY0 + 12} fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
            ELITE INDEPENDENT
          </text>
          <text x={PX1 - 4} y={PY0 + 12} fill="#36E7A1" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">
            VOLUME PRISM STARS
          </text>
          <text x={PX0 + 4} y={PY1 - 6} fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
            TOUCHDOWN DEPENDENT
          </text>
          <text x={PX1 - 4} y={PY1 - 6} fill="#EF4444" fontSize="10" fontFamily="Inter, sans-serif" textAnchor="end">
            VOLUME TRAP
          </text>

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const x = PX0 + t * (PX1 - PX0);
            const lab = `${Math.round(t * 100)}%`;
            return (
              <text key={t} x={x} y={H - 6} textAnchor="middle" fill="#475569" fontSize="9" fontFamily="JetBrains Mono, monospace">
                {lab}
              </text>
            );
          })}

          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PY0 + t * (PY1 - PY0);
            const lab = `${Math.round((1 - t) * 40)}%`;
            return (
              <text key={t} x={PAD_L - 6} y={y + 3} textAnchor="end" fill="#475569" fontSize="9" fontFamily="JetBrains Mono, monospace">
                {lab}
              </text>
            );
          })}

          <text
            x={8}
            y={H / 2}
            fill="#64748B"
            fontSize="10"
            fontFamily="Inter, sans-serif"
            transform={`rotate(-90 8 ${H / 2})`}
            textAnchor="middle"
          >
            ELITE EFFICIENCY
          </text>
          <text x={W / 2} y={H - 2} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
            VOLUME DEPENDENCY
          </text>

          {dots.map((d) => (
            <g key={d.id}>
              <circle
                cx={d.cx}
                cy={d.cy}
                r={4}
                fill={d.color}
                stroke="#ffffff"
                strokeWidth={1}
                className="cursor-pointer"
                onMouseEnter={() => setTip({ x: d.cx, y: d.cy, p: d })}
              />
              <text
                x={d.cx + (d.xPct > 50 ? -6 : 8)}
                y={d.cy - 8}
                fill="#ffffff"
                fontSize="9"
                fontFamily="Inter, sans-serif"
                textAnchor={d.xPct > 50 ? 'end' : 'start'}
              >
                {d.name}
              </text>
            </g>
          ))}
        </svg>

        {tip ? (
          <div
            className="absolute z-20 rounded-lg border border-white/[0.12] bg-[#0a0d14]/95 px-2 py-1.5 text-[12px] pointer-events-none"
            style={{
              left: `min(calc(100% - 8rem), ${(tip.x / W) * 100}%)`,
              top: `${(tip.y / H) * 100}%`,
              transform: 'translate(-10%, -120%)',
              boxShadow: '0 0 20px rgba(34,211,238,0.2)',
            }}
          >
            <p className="font-semibold text-white">{tip.p.name}</p>
            <p className="text-[#94a3b8] font-mono tabular-nums mt-0.5">
              Vol {tip.p.metricX} · Eff {tip.p.metricY}
            </p>
          </div>
        ) : null}
      </div>

      <p className="px-4 pb-3 text-[11px] text-[#475569]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
        Minimum 20% Route Share
      </p>
    </div>
  );
}
