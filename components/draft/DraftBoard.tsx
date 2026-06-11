'use client';

import { useMemo, useState } from 'react';
import type { DraftablePlayer, DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';

interface DraftBoardProps {
  pool: DraftablePlayer[];
  picks: DraftPickRecord[];
  config: DraftConfig;
  currentOverall: number;
  totalPicks: number;
  isUserTurn: boolean;
  clock: number;
  onPick: (player: DraftablePlayer) => void;
}

const POS_FILTERS = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const;

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className="inline-flex h-[18px] min-w-[26px] items-center justify-center rounded-[4px] px-1 font-mono text-[9px] font-bold"
      style={{ color: positionColor(position), background: `${positionColor(position)}1a` }}
    >
      {position}
    </span>
  );
}

export default function DraftBoard({
  pool,
  picks,
  config,
  currentOverall,
  totalPicks,
  isUserTurn,
  clock,
  onPick,
}: DraftBoardProps) {
  const [filter, setFilter] = useState<(typeof POS_FILTERS)[number]>('ALL');
  const [query, setQuery] = useState('');

  const taken = useMemo(() => new Set(picks.map((p) => p.player.playerId)), [picks]);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool
      .filter((p) => !taken.has(p.playerId))
      .filter((p) => (filter === 'ALL' ? true : p.position === filter))
      .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
      .slice(0, 120);
  }, [pool, taken, filter, query]);

  const recent = useMemo(() => picks.slice(-6).reverse(), [picks]);
  const round = Math.floor((currentOverall - 1) / config.teams) + 1;
  const lowClock = clock <= 10;

  return (
    <main
      className="row-start-2 flex min-h-0 flex-col overflow-hidden"
      style={{ gridColumn: 2 }}
    >
      {/* ON THE CLOCK banner */}
      <div
        className={`flex items-center justify-between border-b border-border px-5 py-3 ${
          isUserTurn ? 'animate-pulse' : ''
        }`}
        style={{
          background: isUserTurn
            ? 'linear-gradient(90deg, rgba(54,231,161,0.16), rgba(54,231,161,0.02))'
            : 'transparent',
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${isUserTurn ? 'bg-boom' : 'bg-muted'}`}
            style={isUserTurn ? { boxShadow: '0 0 10px #36E7A1' } : undefined}
          />
          <div>
            <div
              className={`font-figtree text-[13px] font-extrabold uppercase tracking-[1.5px] ${
                isUserTurn ? 'text-boom' : 'text-muted'
              }`}
            >
              {isUserTurn ? 'On the Clock — You' : `On the Clock — Team ${slotLabel(currentOverall, config.teams)}`}
            </div>
            <div className="font-mono text-[10px] text-muted">
              Pick {currentOverall} of {totalPicks} · Round {round}
            </div>
          </div>
        </div>
        {isUserTurn && (
          <div
            className={`font-mono text-[22px] font-bold tabular-nums ${
              lowClock ? 'text-bust' : 'text-text'
            }`}
          >
            {fmtClock(clock)}
          </div>
        )}
      </div>

      {/* Recent picks */}
      {recent.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-border px-5 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {recent.map((pk) => (
            <div
              key={pk.overall}
              className="flex shrink-0 items-center gap-1.5 rounded-[6px] border border-border/60 bg-surface px-2 py-1"
            >
              <span className="font-mono text-[8px] text-muted">{pk.overall}</span>
              <PositionBadge position={pk.player.position} />
              <span className="font-figtree text-[10.5px] text-text">{pk.player.name}</span>
              {pk.isUser && (
                <span className="font-mono text-[7px] uppercase tracking-wide text-boom">you</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex shrink-0 items-center gap-2 px-5 py-2.5">
        <div className="flex gap-1">
          {POS_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[5px] px-2.5 py-1 font-mono text-[10px] transition-colors ${
                filter === f ? 'bg-boom/15 text-boom' : 'text-muted hover:text-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players…"
          className="ml-auto w-48 rounded-[6px] border border-border bg-bg px-2.5 py-1.5 font-figtree text-[11px] text-text outline-none placeholder:text-muted focus:border-boom/50"
        />
      </div>

      {/* Available board */}
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="grid grid-cols-[36px_1fr_56px_56px_52px] items-center gap-2 border-b border-border px-2 py-1.5 font-mono text-[8px] uppercase tracking-wide text-muted">
          <span>BOB</span>
          <span>Player</span>
          <span className="text-right">ADP</span>
          <span className="text-right">Age</span>
          <span className="text-right">TFO</span>
        </div>
        {available.map((p) => (
          <button
            key={p.playerId}
            type="button"
            disabled={!isUserTurn}
            onClick={() => onPick(p)}
            className={`grid w-full grid-cols-[36px_1fr_56px_56px_52px] items-center gap-2 border-b border-border/40 px-2 py-2 text-left transition-colors ${
              isUserTurn ? 'cursor-pointer hover:bg-boom/[0.06]' : 'cursor-default'
            }`}
          >
            <span className="font-mono text-[11px] text-muted">{p.bobRank}</span>
            <span className="flex min-w-0 items-center gap-2">
              <PositionBadge position={p.position} />
              <span className="truncate font-figtree text-[12.5px] font-medium text-text">
                {p.name}
              </span>
              <span className="font-mono text-[8px] text-muted">{p.team}</span>
            </span>
            <span className="text-right font-mono text-[11px] text-muted">{p.adp}</span>
            <span className="text-right font-mono text-[11px] text-muted">
              {p.age ?? '—'}
            </span>
            <span className="text-right font-mono text-[12px] font-bold text-boom">
              {p.tfoScore.toFixed(1)}
            </span>
          </button>
        ))}
        {available.length === 0 && (
          <div className="px-2 py-6 text-center font-figtree text-[12px] text-muted">
            No players match this filter.
          </div>
        )}
      </div>
    </main>
  );
}

// Team label for a CPU slot at the given overall pick (snake-aware).
function slotLabel(overall: number, teams: number): number {
  const idx = overall - 1;
  const round = Math.floor(idx / teams) + 1;
  const posInRound = idx % teams;
  return round % 2 === 1 ? posInRound + 1 : teams - posInRound;
}
