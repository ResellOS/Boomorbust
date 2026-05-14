'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { TradeAnalysisData, TradeAsset } from './types';

interface Props {
  data: TradeAnalysisData;
}

const VERDICT_STYLES = {
  'DO IT':  { color: '#36E7A1', bg: 'rgba(54,231,161,0.1)', border: 'rgba(54,231,161,0.25)' },
  'PASS':   { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.25)' },
  'COUNTER':{ color: '#FBBF24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.25)' },
  'HOLD':   { color: '#9ca3af', bg: 'rgba(156,163,175,0.1)', border: 'rgba(156,163,175,0.25)' },
};

function AssetChip({ asset }: { asset: TradeAsset }) {
  const [err, setErr] = useState(false);
  const pos = asset.position.toUpperCase();
  const posColor: Record<string, string> = { QB: '#FBBF24', RB: '#36E7A1', WR: '#22D3EE', TE: '#A78BFA' };
  const color = posColor[pos] ?? '#64748B';

  if (asset.isPick) {
    return (
      <div
        className="flex items-center gap-2.5 rounded-xl p-3"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center flex-shrink-0">
          <span className="text-[11px] font-bold text-slate-300">PK</span>
        </div>
        <div>
          <p className="text-[13px] font-semibold text-white">{asset.name}</p>
          <p className="text-[10px] text-slate-400">{asset.detail}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2.5 rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-white/[0.06]">
        {!err ? (
          <Image
            src={`https://sleepercdn.com/content/nfl/players/thumb/${asset.name.toLowerCase().replace(/\s+/g, '-')}.jpg`}
            alt={asset.name}
            width={40}
            height={40}
            className="object-cover"
            onError={() => setErr(true)}
            unoptimized
          />
        ) : (
          <div className="w-10 h-10 flex items-center justify-center" style={{ background: `${color}20` }}>
            <span className="text-[11px] font-bold" style={{ color }}>
              {asset.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
            </span>
          </div>
        )}
      </div>
      <div>
        <p className="text-[13px] font-semibold text-white">{asset.name}</p>
        <p className="text-[11px]" style={{ color }}>{pos} · {asset.team}</p>
        <p className="text-[10px] text-slate-400">{asset.detail}</p>
      </div>
    </div>
  );
}

function DeltaBadge({ value, label }: { value: number; label: string }) {
  const isPos = value >= 0;
  const color = isPos ? '#36E7A1' : '#EF4444';
  return (
    <div className="text-center">
      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-[14px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
        {isPos ? '+' : ''}{value}%
      </p>
    </div>
  );
}

export default function TradeAnalysisCard({ data }: Props) {
  const vstyle = VERDICT_STYLES[data.verdict];
  const edgePos = data.valueEdge >= 0;

  return (
    <div
      className="mt-3 rounded-xl overflow-hidden space-y-3"
      style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Player + Verdict row */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 p-4 pb-0">
        {/* Receive assets preview */}
        <div className="space-y-2">
          {data.receive.slice(0, 1).map((a, i) => <AssetChip key={i} asset={a} />)}
        </div>

        {/* Verdict */}
        <div
          className="rounded-xl px-5 py-4 flex flex-col items-center justify-center"
          style={{ background: vstyle.bg, border: `1px solid ${vstyle.border}`, minWidth: 140 }}
        >
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">BOOM COACH VERDICT</p>
          <div className="flex items-center gap-2 mb-1">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill={vstyle.color} opacity="0.2"/>
              <path d="M5 8l2 2 4-4" stroke={vstyle.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[20px] font-bold" style={{ color: vstyle.color, fontFamily: 'JetBrains Mono, monospace' }}>
              {data.verdict}
            </p>
          </div>
          <p className="text-[11px] text-slate-400">Confidence: <span style={{ color: vstyle.color }}>{data.confidence}%</span></p>
        </div>
      </div>

      {/* Value Analysis */}
      <div className="px-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">VALUE ANALYSIS</p>
        <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-3 items-center">
          {/* You Give */}
          <div>
            <p className="text-[10px] text-slate-500 mb-2 uppercase">YOU GIVE</p>
            <div className="space-y-2">
              {data.give.map((a, i) => <AssetChip key={i} asset={a} />)}
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">TOTAL VALUE</p>
              <p className="text-[16px] font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {data.totalGive.toLocaleString()}
              </p>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex flex-col items-center gap-1.5 px-2">
            <div className="w-px h-16 bg-white/[0.1]" />
            <span className="text-[10px] font-bold text-slate-600">VS</span>
            <div className="w-px h-16 bg-white/[0.1]" />
          </div>

          {/* You Get */}
          <div>
            <p className="text-[10px] text-slate-500 mb-2 uppercase">YOU GET</p>
            <div className="space-y-2">
              {data.receive.map((a, i) => <AssetChip key={i} asset={a} />)}
            </div>
            <div className="mt-2">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">TOTAL VALUE</p>
              <p className="text-[16px] font-bold text-white font-mono" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {data.totalReceive.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Value Edge */}
          <div
            className="rounded-xl p-4 flex flex-col items-center"
            style={{ background: edgePos ? 'rgba(54,231,161,0.06)' : 'rgba(239,68,68,0.06)', border: edgePos ? '1px solid rgba(54,231,161,0.2)' : '1px solid rgba(239,68,68,0.2)', minWidth: 110 }}
          >
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">VALUE EDGE</p>
            <p
              className="text-[22px] font-bold"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: edgePos ? '#36E7A1' : '#EF4444' }}
            >
              {edgePos ? '+' : ''}{data.valueEdge.toFixed(1)}%
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">{edgePos ? 'In Your Favor' : 'Against You'}</p>
          </div>
        </div>
      </div>

      {/* Key Reasons + Team Impact */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 px-4 pb-4">
        {/* Key Reasons */}
        <div
          className="rounded-xl p-3"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">KEY REASONS</p>
          <ul className="space-y-2">
            {data.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                  <circle cx="7" cy="7" r="6" fill="rgba(54,231,161,0.15)"/>
                  <path d="M4.5 7l2 2 3-3" stroke="#36E7A1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[11px] text-slate-300 leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Team Impact */}
        <div
          className="rounded-xl p-3 min-w-[160px]"
          style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">TEAM IMPACT</p>
          <div className="grid grid-cols-2 gap-3">
            <DeltaBadge value={data.teamImpact.winNow} label="WIN NOW" />
            <DeltaBadge value={data.teamImpact.futureValue} label="FUTURE VALUE" />
            <DeltaBadge value={data.teamImpact.depthHit} label="DEPTH HIT" />
            <div className="text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">FLEXIBILITY</p>
              <p className="text-[13px] font-semibold text-slate-300">{data.teamImpact.flexibility}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
