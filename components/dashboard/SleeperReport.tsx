'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import type { TFOVerdict } from '@/lib/tfo/formula';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from '@/components/dashboard/PlayerBhsActions';
import type { WaiverTarget } from '@/components/dashboard/WaiverWatchlist';

export interface SleeperReportProps {
  waiverTargets: WaiverTarget[];
  ownedIds: Set<string> | null;
  leagueContextId?: string | null;
  verdictByPlayerId?: Record<string, string>;
  className?: string;
}

function parseAddRatePct(addValue: string | undefined): number | null {
  if (!addValue || typeof addValue !== 'string') return null;
  const m = addValue.match(/\+([\d.]+)\s*%/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function waiverTrendLabel(verdict: TFOVerdict | undefined): { text: string; className: string } {
  if (!verdict) return { text: '→ HOLD', className: 'text-[#94A3B8]' };
  if (verdict === 'BOOM' || verdict === 'LEAN_BOOM')
    return { text: '↗ BOOM', className: 'text-[#36E7A1]' };
  if (verdict === 'BUST' || verdict === 'LEAN_BUST')
    return { text: '↘ BUST', className: 'text-[#EF4444]' };
  return { text: '→ HOLD', className: 'text-[#94A3B8]' };
}

function toVerdict(raw: string | undefined): TFOVerdict | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toUpperCase().replace(/\s+/g, '_');
  if (
    v === 'BOOM' ||
    v === 'LEAN_BOOM' ||
    v === 'NEUTRAL' ||
    v === 'LEAN_BUST' ||
    v === 'BUST'
  ) {
    return v as TFOVerdict;
  }
  return undefined;
}

const POS_BADGE: Record<string, string> = {
  QB: 'bg-amber-500/18 text-amber-200 border-amber-400/35',
  RB: 'bg-emerald-500/18 text-emerald-200 border-emerald-400/35',
  WR: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/35',
  TE: 'bg-violet-500/18 text-violet-200 border-violet-400/35',
};

export default function SleeperReport({
  waiverTargets,
  ownedIds,
  leagueContextId = null,
  verdictByPlayerId = {},
  className = '',
}: SleeperReportProps) {
  const router = useRouter();

  const filtered = useMemo(() => {
    const out: WaiverTarget[] = [];
    for (const t of waiverTargets) {
      const id = String(t.player_id ?? '');
      if (id && ownedIds?.has(id)) continue;
      const pct = parseAddRatePct(t.addValue);
      if (pct === null || pct >= 70) continue;
      out.push(t);
    }
    out.sort((a, b) => {
      const ta = a.trending === true ? 1 : 0;
      const tb = b.trending === true ? 1 : 0;
      if (tb !== ta) return tb - ta;
      const pa = parseAddRatePct(a.addValue) ?? 999;
      const pb = parseAddRatePct(b.addValue) ?? 999;
      return pa - pb;
    });
    return out.slice(0, 6);
  }, [waiverTargets, ownedIds]);

  if (!waiverTargets?.length) return null;

  return (
    <div className={clsx('glass-panel p-3', className)}>
      <h3 className="text-white mb-1 leading-tight" style={{ fontFamily: 'var(--font-display)', fontSize: '16px' }}>
        OTA · SLEEPER REPORT
      </h3>
      <p
        className="font-mono mb-4 uppercase font-semibold"
        style={{ fontSize: '8px', color: '#22D3EE', letterSpacing: '0.2em' }}
      >
        LOW ROSTER · HIGH UPSIDE
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-[10px] border border-dashed border-white/[0.08] px-3 py-6 text-center">
          <p className="text-[11px] font-mono uppercase tracking-widest text-[#64748B]">
            No low-roster movers match this filter right now
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((t, i) => {
            const id = String(t.player_id ?? `row-${i}`);
            const name = String(t.name ?? 'Unknown');
            const position = String(t.position ?? '—').toUpperCase();
            const cacheOrFormula = verdictByPlayerId[id] ?? t.verdict;
            const verdict = toVerdict(cacheOrFormula);
            const trend = waiverTrendLabel(verdict);
            const rosterPct =
              typeof t.ownedPct === 'number' && Number.isFinite(t.ownedPct)
                ? Math.round(Math.max(0, Math.min(99, t.ownedPct)))
                : null;

            const showAddPill = verdict === 'BOOM' || verdict === 'LEAN_BOOM';

            return (
              <div
                key={`${id}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() =>
                  router.push(`/dashboard/scouting?player=${encodeURIComponent(name.trim())}`)
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/dashboard/scouting?player=${encodeURIComponent(name.trim())}`);
                  }
                }}
                className="glass-panel cursor-pointer text-left transition hover:border-white/[0.14] hover:bg-white/[0.03]"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                }}
              >
                <div className="flex items-start gap-2 mb-2">
                  <PlayerAvatar playerId={id} playerName={name} position={position} size={36} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-[12px] font-bold text-white truncate leading-tight">{name}</span>
                      <span
                        className={clsx(
                          'text-[9px] font-bold uppercase px-1 py-px rounded border shrink-0',
                          POS_BADGE[position] ?? 'bg-white/5 text-slate-300 border-white/10',
                        )}
                      >
                        {position}
                      </span>
                    </div>
                  </div>
                  <span
                    className="shrink-0 font-mono font-bold tabular-nums whitespace-nowrap px-1.5 py-0.5 rounded border"
                    style={{
                      fontSize: '8px',
                      background: 'rgba(34,211,238,0.1)',
                      borderColor: 'rgba(34,211,238,0.2)',
                      color: '#22D3EE',
                    }}
                  >
                    {rosterPct != null ? `${rosterPct}% rostered` : '—'}
                  </span>
                </div>

                <div className="mb-2">
                  <span className={clsx('text-[10px] font-black font-mono', trend.className)}>
                    {trend.text}
                  </span>
                </div>

                {showAddPill ? (
                  <div
                    className="inline-block font-mono font-bold uppercase rounded border px-2 py-0.5"
                    style={{
                      fontSize: '8px',
                      background: 'rgba(54,231,161,0.1)',
                      borderColor: 'rgba(54,231,161,0.2)',
                      color: '#36E7A1',
                    }}
                  >
                    ADD BEFORE MARKET
                  </div>
                ) : null}
                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                  <PlayerBhsActions
                    tfoVerdict={cacheOrFormula ?? null}
                    playerId={id}
                    playerName={name}
                    leagueId={leagueContextId}
                    allowSell={false}
                    compact
                    className="justify-center"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
