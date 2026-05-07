'use client';

import { Sparkles, ArrowLeftRight } from 'lucide-react';
import type { TradeScenario } from '@/app/api/dashboard/snapshot/route';

interface Props {
  /** Body copy when no structured scenario. */
  body: string;
  /** Optional badge value, e.g. "BOOM 73%". */
  verdict?: string;
  verdictTone?: 'green' | 'red' | 'amber';
  /** Rich sell/buy layout when present. */
  tradeScenario?: TradeScenario | null;
  className?: string;
}

const VERDICT_COLORS: Record<NonNullable<Props['verdictTone']>, string> = {
  green: '#36E7A1',
  red: '#FF5757',
  amber: '#FBBF24',
};

export default function TradeAnalyzerNote({
  body,
  verdict,
  verdictTone = 'green',
  tradeScenario,
  className = '',
}: Props) {
  const verdictColor = VERDICT_COLORS[verdictTone];

  if (tradeScenario) {
    const { sell, buy, gainPct, summaryLine } = tradeScenario;
    return (
      <div className={`glass-panel p-4 flex flex-col ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-[#22D3EE]" />
            Trade Analyzer
          </h3>
          <span
            className="text-[10px] font-black font-mono-tactical px-2 py-0.5 rounded border"
            style={{
              color: '#36E7A1',
              borderColor: 'rgba(54,231,161,0.35)',
              background: 'rgba(54,231,161,0.08)',
            }}
          >
            BOOM +{gainPct}%
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-snug font-mono-tactical mb-3">{summaryLine}</p>

        <div className="flex items-center justify-center gap-2 py-2">
          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <img
              src={sell.photoUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-[#FF5757]/50"
              style={{
                boxShadow: '0 0 16px rgba(255,87,87,0.45), 0 0 32px rgba(239,68,68,0.2)',
              }}
            />
            <span className="text-[8px] font-black uppercase text-[#FF5757] px-2 py-0.5 rounded border border-[#FF5757]/30 bg-[#FF5757]/10">
              Selling
            </span>
            <span className="text-[10px] font-bold text-white truncate w-full text-center">
              {sell.name.split(' ').slice(-1)[0]}
            </span>
          </div>

          <ArrowLeftRight className="w-5 h-5 text-slate-600 shrink-0" aria-hidden />

          <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
            <img
              src={buy.photoUrl}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-[#36E7A1]/55"
              style={{
                boxShadow: '0 0 16px rgba(54,231,161,0.45), 0 0 32px rgba(54,231,161,0.22)',
              }}
            />
            <span className="text-[8px] font-black uppercase text-[#36E7A1] px-2 py-0.5 rounded border border-[#36E7A1]/30 bg-[#36E7A1]/10">
              Buying
            </span>
            <span className="text-[10px] font-bold text-white truncate w-full text-center">
              {buy.name.split(' ').slice(-1)[0]}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-600 font-mono-tactical mt-2 border-t border-white/[0.04] pt-2">
          {body}
        </p>
      </div>
    );
  }

  return (
    <div className={`glass-panel p-4 flex flex-col ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#22D3EE]" />
          Trade Analyzer
        </h3>
        {verdict && (
          <span
            className="text-[10px] font-black font-mono-tactical px-2 py-0.5 rounded border"
            style={{
              color: verdictColor,
              borderColor: `${verdictColor}40`,
              background: `${verdictColor}10`,
            }}
          >
            {verdict}
          </span>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed font-mono-tactical">{body}</p>
    </div>
  );
}
