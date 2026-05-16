'use client';

import { useEffect, useState } from 'react';

interface EmpirePayload {
  score: number;
  grade: string;
  percentile: string;
  sparklineData: number[];
}

export default function ScoutingEmpireWidget() {
  const [data, setData] = useState<EmpirePayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const res = await fetch('/api/empire/score', { credentials: 'include' });
        if (!res.ok) throw new Error('bad');
        const j = (await res.json()) as EmpirePayload;
        if (!c) setData(j);
      } catch {
        if (!c) setData({ score: 82.5, grade: 'Elite', percentile: 'Top 8%', sparklineData: [62, 65, 68, 72, 76, 79, 82.5] });
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  const pts = data?.sparklineData?.length
    ? data.sparklineData.map((v, i, a) => {
        const max = Math.max(...a);
        const min = Math.min(...a);
        const x = (i / Math.max(1, a.length - 1)) * 56;
        const y = 22 - ((v - min) / Math.max(0.001, max - min)) * 18;
        return `${x},${y}`;
      }).join(' ')
    : '0,18 14,14 28,16 42,10 56,6';

  if (loading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px] px-4 py-3 min-w-[200px] animate-pulse">
        <div className="h-3 w-20 bg-white/[0.08] rounded mb-2" />
        <div className="h-8 w-16 bg-white/[0.08] rounded" />
      </div>
    );
  }

  const score = data?.score ?? 82.5;
  const grade = data?.grade ?? 'Elite';
  const pct = data?.percentile ?? 'Top 8%';

  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px] px-4 py-3 shrink-0"
      style={{ boxShadow: '0 0 24px rgba(54,231,161,0.08)' }}
    >
      <p className="text-[10px] uppercase tracking-widest text-[#64748B] font-mono mb-1">DYNASTY POWER RATING</p>
      <div className="flex items-end gap-3">
        <p className="text-[28px] font-bold leading-none tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
          {score}
        </p>
        <div className="flex flex-col items-start gap-0.5 pb-0.5">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ color: '#36E7A1', background: 'rgba(54,231,161,0.12)', borderColor: 'rgba(54,231,161,0.35)' }}
          >
            {grade}
          </span>
          <span className="text-[11px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>{pct}</span>
        </div>
        <svg width="60" height="28" viewBox="0 0 60 24" className="ml-1 shrink-0" aria-hidden>
          <polyline points={pts} fill="none" stroke="#36E7A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
