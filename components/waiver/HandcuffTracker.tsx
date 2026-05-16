'use client';

import { useEffect, useState } from 'react';
import type { HandcuffAnalysis } from '@/lib/handcuff/engine';

const REC_COLOR: Record<string, string> = {
  'MUST OWN':    '#EF4444',
  'WORTH OWNING': '#FBBF24',
  'STREAM ONLY': '#64748B',
  'DROP':        '#374151',
};

const REC_BG: Record<string, string> = {
  'MUST OWN':    'rgba(239,68,68,0.12)',
  'WORTH OWNING': 'rgba(251,191,36,0.10)',
  'STREAM ONLY': 'rgba(100,116,139,0.10)',
  'DROP':        'rgba(55,65,81,0.10)',
};

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? '#EF4444' : score >= 50 ? '#FBBF24' : '#64748B';
  return (
    <span
      className="text-[13px] font-bold tabular-nums"
      style={{ fontFamily: 'JetBrains Mono, monospace', color }}
    >
      {score}
    </span>
  );
}

function HandcuffRow({ item }: { item: HandcuffAnalysis }) {
  const owned = item.user_owns_handcuff;
  const color = REC_COLOR[item.recommendation] ?? '#64748B';
  const bg = REC_BG[item.recommendation] ?? 'transparent';

  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider"
              style={{ background: bg, color, border: `1px solid ${color}22` }}
            >
              {item.recommendation}
            </span>
            <span
              className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider"
            >
              {item.starter.team}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-white truncate">
              {item.starter.full_name}
            </span>
            <span className="text-[11px] text-slate-500">→</span>
            <span className="text-[13px] font-semibold text-slate-300 truncate">
              {item.handcuff?.full_name ?? 'No backup found'}
            </span>
          </div>
        </div>

        {/* Scores */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-slate-500 uppercase tracking-widest">HC</span>
            <ScoreBadge score={item.handcuff_score} />
          </div>
          {item.handcuff && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest">TFO</span>
              <span className="text-[11px] text-slate-400 tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                {Math.round(item.handcuff.tfo_score)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      {owned ? (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(54,231,161,0.08)', border: '1px solid rgba(54,231,161,0.2)' }}
        >
          <span style={{ color: '#36E7A1', fontSize: 12 }}>✓</span>
          <span className="text-[12px] font-semibold" style={{ color: '#36E7A1' }}>
            You own {item.handcuff?.full_name ?? 'the handcuff'}
          </span>
        </div>
      ) : item.handcuff ? (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
        >
          <span style={{ color: '#EF4444', fontSize: 12 }}>!</span>
          <span className="text-[12px] font-semibold" style={{ color: '#EF4444' }}>
            {item.handcuff.full_name} available — not on your roster
          </span>
        </div>
      ) : null}

      {/* Reasoning */}
      <p className="text-[12px] text-slate-400 leading-relaxed" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {item.reasoning}
      </p>
    </div>
  );
}

export default function HandcuffTracker({ leagueId }: { leagueId?: string | null }) {
  const [handcuffs, setHandcuffs] = useState<HandcuffAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (leagueId) params.set('leagueId', leagueId);
    fetch(`/api/players/handcuffs?${params.toString()}`)
      .then((r) => r.json())
      .then((body: { handcuffs?: HandcuffAnalysis[]; error?: string }) => {
        if (body.error) throw new Error(body.error);
        setHandcuffs(body.handcuffs ?? []);
      })
      .catch((e: unknown) => setError((e as Error).message ?? 'Failed to load'))
      .finally(() => setLoading(false));
  }, [leagueId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-xl px-4 py-6 text-center"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}
      >
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    );
  }

  if (handcuffs.length === 0) {
    return (
      <div
        className="rounded-xl px-4 py-10 text-center"
        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="text-[13px] text-slate-500">No elite RBs (TFO &gt; 70) found on your roster.</p>
        <p className="text-[12px] text-slate-600 mt-1">Sync your leagues and seed players first.</p>
      </div>
    );
  }

  const unowned = handcuffs.filter((h) => !h.user_owns_handcuff);
  const owned   = handcuffs.filter((h) => h.user_owns_handcuff);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-white tracking-wide">HANDCUFF TRACKER</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Your elite RBs and whether you own their insurance policy.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span>{unowned.length} unowned</span>
          <span className="text-slate-700">·</span>
          <span style={{ color: '#36E7A1' }}>{owned.length} covered</span>
        </div>
      </div>

      {/* Unowned handcuffs first */}
      {unowned.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">ACTION NEEDED</p>
          {unowned.map((item) => (
            <HandcuffRow key={item.starter.player_id} item={item} />
          ))}
        </div>
      )}

      {/* Owned handcuffs */}
      {owned.length > 0 && (
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#36E7A1' }}>
            COVERED
          </p>
          {owned.map((item) => (
            <HandcuffRow key={item.starter.player_id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
