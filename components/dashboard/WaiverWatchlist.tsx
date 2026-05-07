'use client';

import { useState } from 'react';
import type { TFOVerdict } from '@/lib/tfo/formula';

export interface WaiverTarget {
  name: string;
  position: string;
  team: string;
  /** Display value, e.g. "+85% AI Add Score". */
  addValue: string;
  ownedPct?: number;
  trending?: boolean;
  photoUrl?: string;
}

function PlayerAvatar({
  name,
  photoUrl,
  posColor,
  initials,
}: {
  name: string;
  photoUrl: string | undefined;
  posColor: string;
  initials: string;
}) {
  const [errored, setErrored] = useState(false);
  if (photoUrl && !errored) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <span
      className="text-[14px] font-black font-mono-tactical"
      style={{ color: posColor }}
    >
      {initials}
    </span>
  );
}

interface Props {
  targets: WaiverTarget[];
  /** Optional league context label, e.g. "Lg 2". */
  leagueName?: string;
  /** Lowercase player name → dynasty enriched verdict. */
  verdictByPlayerName?: Record<string, TFOVerdict>;
  /** Limit the count displayed (default 6 → 3x2 grid). */
  limit?: number;
  className?: string;
}

function waiverTrendLabel(verdict: TFOVerdict | undefined): { text: string; className: string } {
  if (!verdict) return { text: '→ HOLD', className: 'text-[#94A3B8]' };
  if (verdict === 'BOOM' || verdict === 'LEAN_BOOM')
    return { text: '↗ BOOM', className: 'text-[#36E7A1]' };
  if (verdict === 'BUST' || verdict === 'LEAN_BUST')
    return { text: '↘ BUST', className: 'text-[#EF4444]' };
  return { text: '→ HOLD', className: 'text-[#94A3B8]' };
}

const POS_COLORS: Record<string, string> = {
  WR: '#22D3EE',
  RB: '#36E7A1',
  QB: '#FEBC2E',
  TE: '#A78BFA',
  K: '#94A3B8',
  DEF: '#94A3B8',
};

export default function WaiverWatchlist({
  targets,
  leagueName = 'Lg 2',
  verdictByPlayerName,
  limit = 12,
  className = '',
}: Props) {
  const visible = targets.slice(0, limit);
  const order = ['QB', 'RB', 'WR', 'TE', 'OTHER'] as const;
  const grouped: Record<(typeof order)[number], WaiverTarget[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    OTHER: [],
  };
  for (const t of visible) {
    const p = (t.position ?? '').toUpperCase();
    if (p === 'QB' || p === 'RB' || p === 'WR' || p === 'TE') {
      grouped[p].push(t);
    } else {
      grouped.OTHER.push(t);
    }
  }

  const renderCard = (target: WaiverTarget, i: number) => {
    const posColor = POS_COLORS[target.position] ?? '#94A3B8';
    const initials = target.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
    const pctMatch = target.addValue.match(/(\d+)/);
    const pct = pctMatch ? pctMatch[1] : '—';
    const verdict = verdictByPlayerName?.[target.name.trim().toLowerCase()];
    const trend = waiverTrendLabel(verdict);
    return (
      <div
        key={`${target.name}-${i}`}
        className="flex items-stretch gap-3 min-w-[220px] max-w-[300px] flex-1 rounded-xl border border-white/[0.1] bg-white/[0.06] backdrop-blur-md px-3 py-2.5 transition-colors hover:bg-white/[0.08]"
        style={{
          boxShadow: `inset 0 0 0 1px ${posColor}22, inset 0 1px 0 rgba(255,255,255,0.06), 0 8px 28px rgba(0,0,0,0.4)`,
        }}
      >
        <div
          className="relative w-[4.75rem] shrink-0 self-stretch min-h-[5.25rem] rounded-lg overflow-hidden border"
          style={{ borderColor: `${posColor}50` }}
        >
          <PlayerAvatar
            name={target.name}
            photoUrl={target.photoUrl}
            posColor={posColor}
            initials={initials}
          />
          {target.trending && (
            <span
              className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#EF4444] border border-[#0D1117]"
              aria-label="Trending"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <div className="text-[11px] font-black text-white truncate font-mono-tactical leading-tight">
            {target.name}
          </div>
          <div className="text-[10px] text-slate-500 font-mono-tactical truncate">
            {target.position} · {target.team}
          </div>
        </div>
        <div className="shrink-0 flex flex-row items-center justify-end gap-2">
          <div className="text-right">
            <div className="text-[8px] font-black uppercase tracking-wider text-slate-500 font-mono-tactical">
              AI Add
            </div>
            <div
              className="text-[13px] font-black font-mono-tactical text-[#36E7A1] leading-none"
              style={{
                textShadow: '0 0 12px rgba(54,231,161,0.55), 0 0 24px rgba(54,231,161,0.25)',
              }}
            >
              +{pct}%
            </div>
          </div>
          <span className={`text-[9px] font-black font-mono-tactical whitespace-nowrap ${trend.className}`}>
            {trend.text}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={`glass-panel p-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <span className="w-1 h-3 bg-[#A78BFA] inline-block shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
          Waiver Wire Watchlist
          <span className="text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/20 rounded px-1.5 py-0.5 text-[9px] font-black font-mono-tactical">
            {leagueName}
          </span>
        </h3>
        <span
          className="text-[9px] font-black font-mono-tactical uppercase tracking-[0.2em] px-2 py-1 rounded border"
          style={{
            color: '#36E7A1',
            background: 'rgba(54,231,161,0.08)',
            borderColor: 'rgba(54,231,161,0.25)',
            textShadow: '0 0 8px rgba(54,231,161,0.45)',
          }}
        >
          High-Value Adds →
        </span>
      </div>

      {visible.length === 0 && (
        <div className="border border-dashed border-white/[0.06] rounded-lg py-6 text-center">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 font-mono-tactical">
            No trending adds available right now
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-stretch">
        {order.map((pos) => {
          const list = grouped[pos];
          if (!list.length) return null;
          const stripe = POS_COLORS[pos] ?? '#94A3B8';
          return (
            <div
              key={pos}
              className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm overflow-hidden p-2.5 w-full min-w-0"
            >
              <div className="flex items-center gap-2 px-0.5">
                <span
                  className="text-[9px] font-black text-black uppercase tracking-widest font-mono-tactical px-2 py-0.5 rounded"
                  style={{ background: `linear-gradient(90deg, ${stripe}, ${stripe}cc)` }}
                >
                  {pos === 'OTHER' ? 'OTHER' : pos}
                </span>
                <span className="text-[9px] text-slate-600 font-mono-tactical uppercase tracking-wider">Targets</span>
              </div>
              <div className="flex flex-wrap gap-2">{list.map((t, i) => renderCard(t, i))}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
