'use client';

import { useMemo } from 'react';
import type { DraftablePlayer, DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import {
  bestAvailable,
  positionalNeed,
  positionColor,
  sleeperPick,
} from '@/lib/draft/engine';

interface DraftAssistantPanelProps {
  pool: DraftablePlayer[];
  picks: DraftPickRecord[];
  config: DraftConfig;
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

function bobReasoning(p: DraftablePlayer): string {
  const ageNote =
    p.age != null && p.age <= 24
      ? 'Elite age curve — long dynasty runway.'
      : p.age != null && p.age >= 29
        ? 'Win-now production; watch the age curve.'
        : 'Strong age-curve and situation score.';
  return `Best available dynasty value. ${ageNote}`;
}

export default function DraftAssistantPanel({
  pool,
  picks,
  config,
}: DraftAssistantPanelProps) {
  const taken = useMemo(
    () => new Set(picks.map((p) => p.player.playerId)),
    [picks],
  );

  const userRoster = useMemo(
    () => picks.filter((p) => p.isUser).map((p) => p.player),
    [picks],
  );

  const bobPick = useMemo(() => bestAvailable(pool, taken), [pool, taken]);
  const sleeper = useMemo(() => sleeperPick(pool, taken), [pool, taken]);
  const need = useMemo(
    () => positionalNeed(userRoster, config.superflex),
    [userRoster, config.superflex],
  );

  return (
    <aside
      className="row-start-2 flex min-h-0 flex-col overflow-y-auto border-l border-border bg-surface [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ gridColumn: 3 }}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-boom">
          BOB Draft Assistant
        </div>
      </div>

      {/* BOB's Pick */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="mb-2 font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
          BOB&apos;s Pick
        </div>
        {bobPick ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <PositionBadge position={bobPick.position} />
                <span className="truncate font-figtree text-[13px] font-bold text-text">
                  {bobPick.name}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[13px] font-bold text-boom">
                {bobPick.tfoScore.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 font-mono text-[9px] text-muted">
              {bobPick.team} · BOB #{bobPick.bobRank} · ADP {bobPick.adp}
            </div>
            <p className="mt-2 font-figtree text-[11px] leading-snug text-muted">
              {bobReasoning(bobPick)}
            </p>
          </>
        ) : (
          <div className="font-figtree text-[11px] text-muted">Board exhausted.</div>
        )}
      </div>

      {/* Sleeper Pick */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="mb-2 font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
          Sleeper Pick
        </div>
        {sleeper ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <PositionBadge position={sleeper.position} />
                <span className="truncate font-figtree text-[13px] font-bold text-text">
                  {sleeper.name}
                </span>
              </div>
              <span className="shrink-0 font-mono text-[13px] font-bold text-hold">
                {sleeper.tfoScore.toFixed(1)}
              </span>
            </div>
            <div className="mt-1 font-mono text-[9px] text-muted">
              {sleeper.team} · BOB #{sleeper.bobRank} vs ADP {sleeper.adp}
            </div>
            <p className="mt-2 font-figtree text-[11px] leading-snug text-muted">
              Market is sleeping — BOB ranks {sleeper.marketRank - sleeper.bobRank} spots
              higher than ADP.
            </p>
          </>
        ) : (
          <div className="font-figtree text-[11px] text-muted">No clear market gap.</div>
        )}
      </div>

      {/* Positional Need */}
      <div className="border-b border-border px-4 py-3.5">
        <div className="mb-2 font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
          Positional Need
        </div>
        <div className="flex items-center gap-2">
          <PositionBadge position={need} />
          <span className="font-figtree text-[12px] text-text">
            Thinnest spot on your roster
          </span>
        </div>
      </div>

      {/* My Roster so far */}
      <div className="px-4 py-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
            My Roster
          </span>
          <span className="font-mono text-[9px] text-muted">{userRoster.length} picks</span>
        </div>
        {userRoster.length === 0 ? (
          <div className="font-figtree text-[11px] text-muted">
            No picks yet — your selections appear here.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {userRoster.map((p) => (
              <div
                key={p.playerId}
                className="flex items-center justify-between gap-2 rounded-[6px] border border-border/60 bg-bg/40 px-2.5 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <PositionBadge position={p.position} />
                  <span className="truncate font-figtree text-[11.5px] text-text">
                    {p.name}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-boom">
                  {p.tfoScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
