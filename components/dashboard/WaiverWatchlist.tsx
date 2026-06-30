'use client';

import type { TFOVerdict } from '@/lib/tfo/formula';
import PlayerAvatar from '@/components/PlayerAvatar';
import PlayerBhsActions from './PlayerBhsActions';

export interface WaiverTarget {
  /** Sleeper player id for CDN headshots. */
  player_id: string;
  name: string;
  position: string;
  team: string;
  /** Display value, e.g. "+85% Add Score". */
  addValue: string;
  ownedPct?: number;
  trending?: boolean;
  photoUrl?: string;
  /** Optional TFO verdict from snapshot (e.g. LEAN_BOOM). */
  verdict?: string;
}

interface Props {
  targets: WaiverTarget[];
  /** Optional league context label, e.g. "Lg 2". */
  leagueName?: string;
  /** Sleeper league id for trade finder links. */
  leagueContextId?: string | null;
  /** `tfo_cache.verdict` keyed by Sleeper player id (from snapshot). */
  verdictByPlayerId?: Record<string, string>;
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
  QB: '#FBBF24',
  TE: '#A78BFA',
  K: '#94A3B8',
  DEF: '#94A3B8',
};

export default function WaiverWatchlist({
  targets,
  leagueName = 'Lg 2',
  leagueContextId = null,
  verdictByPlayerId,
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
    const pctMatch = target.addValue.match(/(\d+)/);
    const pct = pctMatch ? pctMatch[1] : '—';
    const verdict = verdictByPlayerName?.[target.name.trim().toLowerCase()];
    const trend = waiverTrendLabel(verdict);
    const cacheOrFormulaVerdict =
      verdictByPlayerId?.[target.player_id] ?? target.verdict ?? null;
    return (
      <div
        key={`${target.player_id}-${i}`}
        className="glass-panel flex min-w-[220px] max-w-[300px] flex-1 flex-col gap-2 !rounded-xl px-3 py-2.5 transition-colors hover:border-white/[0.14]"
        style={{
          boxShadow: `inset 0 0 0 1px ${posColor}33, inset 0 1px 0 rgba(255,255,255,0.06), 0 0 22px ${posColor}28`,
        }}
      >
        <div className="flex items-stretch gap-3">
        <div
          className="relative w-[4.75rem] shrink-0 self-stretch min-h-[5.25rem] rounded-lg overflow-hidden border flex items-center justify-center bg-black/20"
          style={{ borderColor: `${posColor}50` }}
        >
          <PlayerAvatar
            playerId={target.player_id}
            playerName={target.name}
            position={target.position}
            size={72}
          />
          {target.trending && (
            <span
              className="absolute top-0 right-0 w-2 h-2 rounded-full bg-[#EF4444] border border-[#0D1117]"
              aria-label="Trending"
            />
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <div className="text-[12px] font-black text-white truncate font-mono leading-tight">
            {target.name}
          </div>
          <div className="text-[11px] text-slate-500 font-mono truncate">
            {target.position} · {target.team}
          </div>
        </div>
        <div className="shrink-0 flex flex-row items-center justify-end gap-2">
          <div className="text-right">
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-500 font-mono">
              Add
            </div>
            <div
              className="text-[14px] font-black font-mono text-[#36E7A1] leading-none"
              style={{
                textShadow: '0 0 12px rgba(54,231,161,0.55), 0 0 24px rgba(54,231,161,0.25)',
              }}
            >
              +{pct}%
            </div>
          </div>
          <span className={`text-[10px] font-black font-mono whitespace-nowrap ${trend.className}`}>
            {trend.text}
          </span>
        </div>
        </div>
        <PlayerBhsActions
          tfoVerdict={cacheOrFormulaVerdict}
          playerId={target.player_id}
          playerName={target.name}
          leagueId={leagueContextId}
          allowSell={false}
          compact
          className="justify-center"
        />
      </div>
    );
  };

  return (
    <div className={`glass-panel p-3 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-300 flex items-center gap-2">
          <span className="w-1 h-3 bg-[#A78BFA] inline-block shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
          Waiver Wire Watchlist
          <span className="text-[#A78BFA] bg-[#A78BFA]/10 border border-[#A78BFA]/20 rounded px-1.5 py-0.5 text-[10px] font-black font-mono">
            {leagueName}
          </span>
        </h3>
        <span
          className="text-[10px] font-black font-mono uppercase tracking-[0.2em] px-2 py-1 rounded border"
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
          <p className="text-[11px] uppercase tracking-widest text-slate-600 font-mono">
            No trending adds available right now
          </p>
        </div>
      )}

      {visible.length > 0 ? (
        <div className="slim-scroll max-h-[min(520px,58vh)] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-2 items-stretch">
            {order.map((pos) => {
              const list = grouped[pos];
              if (!list.length) return null;
              const stripe = POS_COLORS[pos] ?? '#94A3B8';
              return (
                <div
                  key={pos}
                  className="flex flex-col gap-2 glass-panel !rounded-xl overflow-hidden p-2.5 w-full min-w-0"
                >
                  <div className="flex items-center gap-2 px-0.5">
                    <span
                      className="text-[10px] font-black text-black uppercase tracking-widest font-mono px-2 py-0.5 rounded"
                      style={{ background: `linear-gradient(90deg, ${stripe}, ${stripe}cc)` }}
                    >
                      {pos === 'OTHER' ? 'OTHER' : pos}
                    </span>
                    <span className="text-[10px] text-slate-600 font-mono uppercase tracking-wider">
                      Targets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">{list.map((t, i) => renderCard(t, i))}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
