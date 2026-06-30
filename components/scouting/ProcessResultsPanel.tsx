'use client';

import type { ProcessEdgeResponse } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

interface Props {
  data: ProcessEdgeResponse | null;
  loading: boolean;
}

export default function ProcessResultsPanel({ data, loading }: Props) {
  const R = 52;
  const cx = 60;
  const cy = 60;
  const circ = 2 * Math.PI * R;
  const arcPct = 0.72;
  const dash = arcPct * circ;

  if (loading) {
    return (
      <div className={`${GLASS} p-4 animate-pulse`}>
        <div className="h-4 w-48 bg-white/[0.06] rounded mb-4" />
        <div className="h-32 bg-white/[0.05] rounded-xl" />
      </div>
    );
  }

  const d = data!;
  return (
    <div className={`${GLASS} overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[13px] uppercase tracking-widest text-[#64748B] font-semibold">PROCESS VS RESULTS ENGINE</p>
        <button type="button" className="text-[13px] text-[#22D3EE] hover:underline bg-transparent border-0 cursor-pointer">
          View Full Analysis →
        </button>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <div className="flex flex-col items-center justify-center">
          <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
            <defs>
              <linearGradient id="procRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#36E7A1" />
              </linearGradient>
            </defs>
            <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
            <circle
              cx={cx}
              cy={cy}
              r={R}
              fill="none"
              stroke="url(#procRingGrad)"
              strokeWidth={8}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#36E7A1" fontSize="28" fontWeight="bold" fontFamily="JetBrains Mono, monospace">
              +{d.processEdge}
            </text>
            <text x={cx} y={cy + 18} textAnchor="middle" fill="#64748B" fontSize="10" fontFamily="Inter, sans-serif">
              {d.processLabel}
            </text>
            <text x={cx} y={cy + 34} textAnchor="middle" fill="#36E7A1" fontSize="11" fontFamily="Inter, sans-serif">
              {d.processPct}
            </text>
          </svg>
        </div>

        <div>
          <p className="text-[15px] text-white font-medium" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {d.narrativeTitle}
          </p>
          <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            {d.narrativeBody}
          </p>
        </div>
      </div>

      <div className="px-4 grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-3 mt-1">
        <div>
          <p className="text-[11px] uppercase text-[#64748B] mb-0.5">EXPECTED WINS</p>
          <p className="text-[20px] tabular-nums text-white font-mono">{d.expectedWins}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-[#64748B] mb-0.5">ACTUAL WINS</p>
          <p className="text-[20px] tabular-nums text-white font-mono">{d.actualWins}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase text-[#64748B] mb-0.5">WIN DIFFERENCE</p>
          <p className="text-[20px] tabular-nums font-mono" style={{ color: '#36E7A1' }}>
            +{d.winDifference}
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 border-t border-white/[0.06] pt-3 mt-3">
        <p className="text-[12px] uppercase text-[#64748B]">{d.takeawayTitle}</p>
        <p className="text-[14px] text-white mt-1" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
          {d.takeawayBody}
        </p>
        <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${d.progressPct}%`,
              background: 'linear-gradient(90deg, #7c3aed, #36E7A1)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
