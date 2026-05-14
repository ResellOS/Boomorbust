'use client';

import { TrendingUp } from 'lucide-react';
import type { HiddenGemRow } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

interface Props {
  rows: HiddenGemRow[];
  loading: boolean;
}

export default function HiddenGemsPanel({ rows, loading }: Props) {
  return (
    <div className={`${GLASS} overflow-hidden mt-4`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <p className="text-[12px] uppercase tracking-widest text-[#64748B] font-semibold">HIDDEN GEMS</p>
        <a href="/waiver-wire" className="text-[12px] text-[#22D3EE] hover:underline">
          View All Gems →
        </a>
      </div>

      {loading ? (
        <div className="p-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-white/[0.05] rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="text-left py-2 px-3 w-8 text-[10px] uppercase text-[#64748B] font-semibold" />
                <th className="text-left py-2 px-3 text-[10px] uppercase text-[#64748B] font-semibold">PLAYER</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-[#64748B] font-semibold">% ROSTERED</th>
                <th className="text-left py-2 px-3 text-[10px] uppercase text-[#64748B] font-semibold">TREND (7D)</th>
                <th className="text-right py-2 px-3 text-[10px] uppercase text-[#64748B] font-semibold">OPPORTUNITY SCORE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.rank} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer">
                  <td className="py-2.5 px-3 text-[13px] font-mono text-[#64748B]">{r.rank}</td>
                  <td className="py-2.5 px-3">
                    <p className="text-[13px] font-medium text-white">{r.playerName}</p>
                    <p className="text-[11px] text-[#64748B]">
                      {r.position}·{r.team}
                    </p>
                  </td>
                  <td className="py-2.5 px-3 text-[13px] font-mono text-white tabular-nums">{r.pctRostered}%</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1 text-[13px] font-mono tabular-nums" style={{ color: '#36E7A1' }}>
                      {r.trend7d}
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-[14px] font-bold font-mono tabular-nums" style={{ color: '#36E7A1' }}>
                      {r.opportunityScore}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
