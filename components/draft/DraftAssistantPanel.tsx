'use client';

import { useMemo } from 'react';
import type { DraftablePlayer, DraftConfig, DraftPickRecord, TierBreak } from '@/lib/draft/types';
import {
  alternativesByTfo,
  buildFitScore,
  tierBreakStatus,
  whyPickReasons,
} from '@/lib/draft/analyst';
import { bestAvailable, positionalNeed, positionColor } from '@/lib/draft/engine';
import { valueGap } from '@/lib/draft/safeDisplay';
import { tierForBobRank } from '@/lib/draft/tiers';
import PlayerAvatar from '@/components/players/PlayerAvatar';

interface DraftAssistantPanelProps {
  pool: DraftablePlayer[];
  picks: DraftPickRecord[];
  config: DraftConfig;
  tierBreaks: TierBreak[];
  currentOverall: number;
  isUserTurn: boolean;
  onDraft: (player: DraftablePlayer) => void;
}

export default function DraftAssistantPanel({
  pool,
  picks,
  config,
  tierBreaks,
  currentOverall,
  isUserTurn,
  onDraft,
}: DraftAssistantPanelProps) {
  const taken = useMemo(() => new Set(picks.map((p) => p.player.playerId)), [picks]);
  const userRoster = useMemo(
    () => picks.filter((p) => p.isUser).map((p) => p.player),
    [picks],
  );
  const bobPick = useMemo(() => bestAvailable(pool, taken), [pool, taken]);

  const alternatives = useMemo(
    () => (bobPick ? alternativesByTfo(pool, taken, bobPick.playerId, 3) : []),
    [pool, taken, bobPick],
  );

  const need = useMemo(
    () => positionalNeed(userRoster, config.superflex),
    [userRoster, config.superflex],
  );

  const tierStatus = useMemo(
    () => tierBreakStatus(pool, taken, tierBreaks),
    [pool, taken, tierBreaks],
  );

  const recentPicks = picks.slice(-5).reverse();
  const focusPlayer = bobPick;
  const tier = focusPlayer ? tierForBobRank(focusPlayer.bobRank, tierBreaks) : 1;
  const reasons = focusPlayer
    ? whyPickReasons(focusPlayer, tierStatus, true)
    : [];

  const nextInTier = useMemo(() => {
    if (!focusPlayer) return null;
    const avail = pool
      .filter((p) => !taken.has(p.playerId) && p.playerId !== focusPlayer.playerId)
      .sort((a, b) => a.bobRank - b.bobRank);
    return avail[0] ?? null;
  }, [focusPlayer, pool, taken]);

  return (
    <aside className="flex min-h-0 w-full flex-col overflow-hidden border-l border-border bg-[#0f1420] md:w-[300px]">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[2px] text-boom">
          BOB Draft Assistant
        </div>
        <div className="font-mono text-[8px] text-muted">Beta</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {focusPlayer ? (
          <>
            <section className="border-b border-border px-3 py-3">
              <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
                Best Pick
              </div>
              <div className="flex items-start gap-3">
                <PlayerAvatar playerId={focusPlayer.playerId} name={focusPlayer.name} size={56} />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[14px] uppercase text-text">{focusPlayer.name}</div>
                  <div className="font-mono text-[10px] text-muted">
                    {focusPlayer.position} · {focusPlayer.team}
                  </div>
                  <div className="mt-1 font-mono text-[24px] tabular-nums text-boom">
                    {focusPlayer.tfoScore.toFixed(1)}
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px]">
                <div>
                  <div className="text-muted">Value Gain</div>
                  <div className="text-boom">{valueGap(focusPlayer.adp, currentOverall)}</div>
                </div>
                <div>
                  <div className="text-muted">Build Fit</div>
                  <div className="text-text">{buildFitScore(focusPlayer, need)}%</div>
                </div>
                <div>
                  <div className="text-muted">Tier</div>
                  <div className="text-text">Tier {tier}</div>
                </div>
              </div>

              <div className="mt-3">
                <div className="mb-1 font-mono text-[8px] uppercase text-muted">Why this pick?</div>
                {reasons.map((r) => (
                  <div key={r} className="mb-1 flex gap-1.5 font-mono text-[9px] text-muted">
                    <span className="text-boom">✓</span>
                    {r}
                  </div>
                ))}
              </div>

              <button
                type="button"
                disabled={!isUserTurn}
                onClick={() => onDraft(focusPlayer)}
                className="mt-3 w-full cursor-pointer rounded-md bg-boom py-3 font-mono text-[10px] uppercase tracking-wide text-bg disabled:cursor-not-allowed disabled:opacity-40"
              >
                Draft {focusPlayer.name.split(' ').pop()}
              </button>
            </section>

            {alternatives.length > 0 && (
              <section className="border-b border-border px-3 py-3">
                <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
                  Top Alternatives
                </div>
                {alternatives.map((p) => (
                  <div
                    key={p.playerId}
                    className="mb-1.5 flex items-center justify-between rounded border border-border/60 bg-[#141929] px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <PlayerAvatar playerId={p.playerId} name={p.name} size={24} />
                      <span className="truncate font-mono text-[10px] text-text">{p.name}</span>
                    </div>
                    <span className="font-mono text-[10px] tabular-nums text-boom">
                      {p.tfoScore.toFixed(1)} · {valueGap(p.adp, currentOverall)}
                    </span>
                  </div>
                ))}
              </section>
            )}

            {(tierStatus.kind === 'last' || tierStatus.kind === 'warning') && (
              <section className="mx-3 my-3 rounded border border-[#FBBF24]/30 bg-[#FBBF24]/[0.06] px-3 py-2.5">
                <div className="font-mono text-[9px] uppercase tracking-wide text-[#FBBF24]">
                  Tier Break Alert
                </div>
                <p className="mt-1 font-mono text-[9px] leading-relaxed text-muted">
                  After {focusPlayer.name.split(' ').pop()}, big drop at {focusPlayer.position}.
                  {nextInTier
                    ? ` Next ${focusPlayer.position}: ${nextInTier.name.split(' ').pop()} (${nextInTier.tfoScore.toFixed(1)}).`
                    : ''}
                </p>
              </section>
            )}
          </>
        ) : (
          <div className="px-3 py-6 font-mono text-[11px] text-muted">Board exhausted.</div>
        )}

        <section className="px-3 py-3">
          <div className="mb-2 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
            Recent Picks
          </div>
          {recentPicks.length === 0 ? (
            <div className="font-mono text-[9px] text-muted">No picks yet.</div>
          ) : (
            recentPicks.map((pk) => (
              <div key={pk.overall} className="mb-1 flex items-center gap-2">
                <span
                  className="font-mono text-[8px]"
                  style={{ color: positionColor(pk.player.position) }}
                >
                  {pk.player.position}
                </span>
                <span className="truncate font-mono text-[9px] text-text">{pk.player.name}</span>
                <span className="ml-auto font-mono text-[8px] text-muted">{pk.overall}</span>
              </div>
            ))
          )}
        </section>
      </div>
    </aside>
  );
}
