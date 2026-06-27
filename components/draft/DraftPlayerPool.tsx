'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import type { DraftablePlayer, TierBreak } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';
import { valueGap } from '@/lib/draft/safeDisplay';
import { tierForBobRank } from '@/lib/draft/tiers';
import DraftPlayerHoverCard from './DraftPlayerHoverCard';

interface DraftPlayerPoolProps {
  pool: DraftablePlayer[];
  taken: Set<string>;
  tierBreaks: TierBreak[];
  isUserTurn: boolean;
  currentOverall: number;
  bobTopId: string | null;
  onPick: (player: DraftablePlayer) => void;
  onQueue: (player: DraftablePlayer) => void;
  watchlist: Set<string>;
  selectedId?: string | null;
  onSelect?: (player: DraftablePlayer) => void;
}

const POS_TABS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DEF'] as const;
const HOVER_DELAY_MS = 150;

function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className="inline-flex h-[16px] min-w-[22px] items-center justify-center rounded-[3px] px-0.5 font-mono text-[8px]"
      style={{ color: positionColor(position), background: `${positionColor(position)}1a` }}
    >
      {position}
    </span>
  );
}

export default function DraftPlayerPool({
  pool,
  taken,
  tierBreaks,
  isUserTurn,
  currentOverall,
  bobTopId,
  onPick,
  onQueue,
  watchlist,
  selectedId,
  onSelect,
}: DraftPlayerPoolProps) {
  const [filter, setFilter] = useState<(typeof POS_TABS)[number]>('ALL');
  const [query, setQuery] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showDrafted, setShowDrafted] = useState(false);
  const [rookiesOnly, setRookiesOnly] = useState(false);
  const [hoverPlayer, setHoverPlayer] = useState<DraftablePlayer | null>(null);
  const [hoverPos, setHoverPos] = useState<{ top: number; left: number } | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: 0 };
    for (const p of pool) {
      if (taken.has(p.playerId) && !showDrafted) continue;
      c.ALL = (c.ALL ?? 0) + 1;
      const pos = p.position;
      c[pos] = (c[pos] ?? 0) + 1;
    }
    return c;
  }, [pool, taken, showDrafted]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((p) => showDrafted || !taken.has(p.playerId))
      .filter((p) => {
        if (filter === 'ALL') return true;
        if (filter === 'FLEX') return ['RB', 'WR', 'TE'].includes(p.position);
        return p.position === filter;
      })
      .filter((p) => (rookiesOnly ? p.isRookie : true))
      .filter((p) => (showWatchlist ? watchlist.has(p.playerId) : true))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 150);
  }, [pool, taken, filter, query, showDrafted, rookiesOnly, showWatchlist, watchlist]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const showHover = useCallback(
    (p: DraftablePlayer, el: HTMLElement) => {
      clearHoverTimer();
      hoverTimer.current = setTimeout(() => {
        const rect = el.getBoundingClientRect();
        const poolRect = el.closest('[data-pool-scroll]')?.getBoundingClientRect();
        const top = poolRect ? rect.top - poolRect.top : rect.top;
        setHoverPlayer(p);
        setHoverPos({ top, left: Math.min(rect.width + 8, 280) });
      }, HOVER_DELAY_MS);
    },
    [clearHoverTimer],
  );

  const hideHover = useCallback(() => {
    clearHoverTimer();
    if (!pinnedId) {
      setHoverPlayer(null);
      setHoverPos(null);
    }
  }, [clearHoverTimer, pinnedId]);

  const handleRowTap = useCallback(
    (p: DraftablePlayer, el: HTMLElement) => {
      if (pinnedId === p.playerId) {
        setPinnedId(null);
        setHoverPlayer(null);
        setHoverPos(null);
        return;
      }
      setPinnedId(p.playerId);
      const rect = el.getBoundingClientRect();
      const poolRect = el.closest('[data-pool-scroll]')?.getBoundingClientRect();
      const top = poolRect ? rect.top - poolRect.top : rect.top;
      setHoverPlayer(p);
      setHoverPos({ top, left: Math.min(rect.width + 8, 280) });
    },
    [pinnedId],
  );

  let lastTierShown = 1;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-1.5">
        <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">Big Board / Player Pool</div>
      </div>
      <div className="shrink-0 space-y-2 border-b border-border px-3 py-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find player  Ctrl+F"
          className="w-full rounded-[6px] border border-border bg-bg px-3 py-1.5 font-mono text-[11px] text-text outline-none placeholder:text-muted focus:border-boom/40"
        />
        <div className="flex flex-wrap gap-1">
          {POS_TABS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[4px] px-2 py-0.5 font-mono text-[9px] ${
                filter === f ? 'bg-boom/15 text-boom' : 'text-muted hover:text-text'
              }`}
            >
              {f}{' '}
              {counts[f] != null ? `(${counts[f]})` : f === 'ALL' ? `(${counts.ALL})` : ''}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'watch', label: 'WATCHLIST', on: showWatchlist, set: setShowWatchlist },
            { key: 'drafted', label: 'SHOW DRAFTED', on: showDrafted, set: setShowDrafted },
            { key: 'rookies', label: 'ROOKIES ONLY', on: rookiesOnly, set: setRookiesOnly },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => t.set(!t.on)}
              className={`rounded-[4px] border px-2 py-0.5 font-mono text-[8px] ${
                t.on ? 'border-boom/40 text-boom' : 'border-border text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]"
        data-pool-scroll
        onClick={() => {
          if (pinnedId) {
            setPinnedId(null);
            setHoverPlayer(null);
            setHoverPos(null);
          }
        }}
      >
        <div className="sticky top-0 z-[1] grid grid-cols-[36px_minmax(120px,1fr)_40px_44px_56px_44px_48px_36px_28px] gap-1 border-b border-border bg-bg px-2 py-1.5 font-mono text-[7px] uppercase tracking-wide text-muted">
          <span>Rank</span>
          <span>Player</span>
          <span>Pos</span>
          <span>Team</span>
          <span className="text-right">BOB</span>
          <span className="text-right">ADP</span>
          <span className="text-right">Value</span>
          <span className="text-center">Trend</span>
          <span />
        </div>

        {rows.map((p) => {
          const tier = tierForBobRank(p.bobRank, tierBreaks);
          const showBreak = tier > lastTierShown;
          if (showBreak) lastTierShown = tier;
          const drafted = taken.has(p.playerId);

          return (
            <div key={p.playerId}>
              {showBreak && (
                <div className="flex items-center gap-2 bg-surface2/80 px-3 py-1">
                  <div className="h-px flex-1 bg-border" />
                  <span className="font-mono text-[8px] uppercase tracking-[2px] text-boom">
                    Tier {tier}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
              )}
              <div
                className={`relative grid grid-cols-[36px_minmax(120px,1fr)_40px_44px_56px_44px_48px_36px_28px] items-center gap-1 border-b border-border/30 px-2 py-2 ${
                  drafted ? 'opacity-40' : isUserTurn ? 'hover:bg-boom/[0.05]' : ''
                } ${selectedId === p.playerId ? 'bg-[#7c3aed]/10 ring-1 ring-[#7c3aed]/30' : ''} ${
                  bobTopId === p.playerId && !drafted ? 'bg-boom/[0.04] shadow-[inset_0_0_0_1px_rgba(54,231,161,0.2)]' : ''
                }`}
                onMouseEnter={(e) => !drafted && showHover(p, e.currentTarget)}
                onMouseLeave={hideHover}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(p);
                  if (window.matchMedia('(max-width: 767px)').matches && !drafted) {
                    handleRowTap(p, e.currentTarget);
                  }
                }}
              >
                <span className="font-mono text-[10px] tabular-nums text-muted">{p.bobRank}</span>
                <button
                  type="button"
                  disabled={!isUserTurn || drafted}
                  onClick={() => onPick(p)}
                  className="flex min-w-0 items-center gap-1.5 text-left disabled:cursor-default"
                >
                  <span className="truncate font-mono text-[11px] text-text">{p.name}</span>
                </button>
                <PositionBadge position={p.position} />
                <span className="font-mono text-[10px] text-muted">{p.team}</span>
                <span className="text-right font-mono text-[11px] tabular-nums text-boom">
                  {p.tfoScore.toFixed(1)}
                </span>
                <span className="text-right font-mono text-[10px] tabular-nums text-muted">{p.adp}</span>
                <span className="text-right font-mono text-[10px] tabular-nums text-boom">
                  {valueGap(p.adp, currentOverall)}
                </span>
                <span className="text-center font-mono text-[10px] text-boom">
                  {p.adp < currentOverall ? '↑' : p.adp > currentOverall + 5 ? '↓' : '—'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQueue(p);
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded border border-border text-muted hover:border-boom/40 hover:text-boom"
                  aria-label="Add to queue"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {hoverPlayer && hoverPos && (
          <div
            className="absolute z-50 hidden md:block"
            style={{ top: hoverPos.top, left: hoverPos.left }}
          >
            <DraftPlayerHoverCard player={hoverPlayer} pool={pool} />
          </div>
        )}
      </div>

      {hoverPlayer && pinnedId && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-3 md:hidden">
          <DraftPlayerHoverCard player={hoverPlayer} pool={pool} />
        </div>
      )}
    </div>
  );
}
