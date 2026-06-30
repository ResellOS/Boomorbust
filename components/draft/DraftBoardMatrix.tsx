'use client';

import { useMemo } from 'react';
import type { DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { slotForOverall } from '@/lib/draft/engine';
import { abbrevName, safePickLabel, safeTeams, safeRounds } from '@/lib/draft/safeDisplay';
import PlayerAvatar from '@/components/players/PlayerAvatar';

const POS_COLOR: Record<string, string> = {
  QB: '#A78BFA',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#FBBF24',
};

interface DraftBoardMatrixProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
  currentOverall: number;
  onCellClick?: (pick: DraftPickRecord | null, overall: number) => void;
}

export default function DraftBoardMatrix({
  config,
  picks,
  currentOverall,
  onCellClick,
}: DraftBoardMatrixProps) {
  const teams = safeTeams(config);
  const rounds = safeRounds(config);
  const slotOpts = useMemo(
    () => ({
      thirdRoundReversal: config.thirdRoundReversal,
      linear: config.draftOrderType === 'linear',
    }),
    [config.thirdRoundReversal, config.draftOrderType],
  );

  const cellMap = useMemo(() => {
    const m = new Map<string, DraftPickRecord>();
    for (const p of picks) {
      m.set(`${p.round}-${p.slot}`, p);
    }
    return m;
  }, [picks]);

  const teamHeaders = useMemo(() => {
    return Array.from({ length: teams }, (_, i) => {
      const slot = i + 1;
      const t = config.teamOrder.find((x) => x.slot === slot);
      const isUser = slot === config.yourPick;
      return { slot, name: isUser ? 'You' : (t?.name?.slice(0, 14) ?? `T${slot}`), isUser };
    });
  }, [teams, config.teamOrder, config.yourPick]);

  return (
    <div className="flex min-h-[280px] shrink-0 flex-col border-b border-border bg-[#0a0d14]">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2">
        <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">Draft Board</div>
        <div className="font-mono text-[9px] text-muted">Mock · Snake · Scroll →</div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto [scrollbar-width:thin]">
        <div className="inline-block min-w-full p-2">
          {/* Team headers */}
          <div className="sticky top-0 z-10 flex gap-1 bg-[#0a0d14] pb-1">
            <div className="w-10 shrink-0" />
            {teamHeaders.map((h) => (
              <div
                key={h.slot}
                className={`flex h-8 w-[92px] shrink-0 items-center justify-center rounded border px-1 font-mono text-[8px] uppercase ${
                  h.isUser ? 'border-boom/40 bg-boom/10 text-boom' : 'border-border/60 bg-[#0f1420] text-muted'
                }`}
              >
                <span className="truncate">{h.name}</span>
              </div>
            ))}
          </div>

          {Array.from({ length: rounds }, (_, ri) => {
            const round = ri + 1;
            return (
              <div key={round} className="mb-1 flex gap-1">
                <div className="flex w-10 shrink-0 items-center justify-center font-mono text-[10px] text-boom">
                  R{round}
                </div>
                {teamHeaders.map(({ slot }) => {
                  const pk = cellMap.get(`${round}-${slot}`);
                  const overall =
                    pk?.overall ??
                    (() => {
                      for (let o = (round - 1) * teams + 1; o <= round * teams; o++) {
                        if (slotForOverall(o, teams, slotOpts).slot === slot) return o;
                      }
                      return 0;
                    })();
                  const onClock = overall === currentOverall;
                  const isUserSlot = slot === config.yourPick;
                  const pos = pk?.player.position ?? '';
                  const color = POS_COLOR[pos] ?? '#6b7a99';

                  if (pk) {
                    const userPick = pk.isUser || isUserSlot;
                    return (
                      <button
                        key={`${round}-${slot}`}
                        type="button"
                        onClick={() => onCellClick?.(pk, overall)}
                        className={`relative h-[76px] w-[92px] shrink-0 overflow-hidden rounded-[6px] border text-left transition-all hover:brightness-110 ${
                          userPick ? 'border-boom/45 bg-boom/[0.06]' : 'border-border bg-[#141929]'
                        }`}
                        style={{ boxShadow: userPick ? '0 0 10px rgba(54,231,161,0.15)' : undefined }}
                      >
                        <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
                        <div className="flex h-full flex-col p-1">
                          <div className="font-mono text-[7px] text-muted">
                            {safePickLabel(overall, teams)}
                          </div>
                          <div className="flex flex-1 items-center gap-0.5">
                            <PlayerAvatar playerId={pk.player.playerId} name={pk.player.name} size={22} />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-mono text-[9px] text-text">
                                {abbrevName(pk.player.name)}
                              </div>
                              <div className="font-mono text-[7px]" style={{ color }}>
                                {pos}
                              </div>
                            </div>
                          </div>
                          <div className="font-mono text-[9px] tabular-nums" style={{ color }}>
                            {Number.isFinite(pk.player.tfoScore) ? pk.player.tfoScore.toFixed(1) : '—'}
                          </div>
                        </div>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`${round}-${slot}`}
                      type="button"
                      onClick={() => onCellClick?.(null, overall)}
                      className={`flex h-[76px] w-[92px] shrink-0 flex-col items-center justify-center rounded-[6px] border border-dashed text-center transition-all ${
                        onClock
                          ? 'animate-[pulse_2.5s_ease-in-out_infinite] border-boom bg-boom/[0.08]'
                          : 'border-border/50 bg-[#0f1420]/80 hover:border-border'
                      }`}
                      style={onClock ? { boxShadow: '0 0 16px rgba(54,231,161,0.2)' } : undefined}
                    >
                      <div className="font-mono text-[9px] text-muted">{safePickLabel(overall, teams)}</div>
                      {onClock && (
                        <div className="mt-0.5 font-mono text-[8px] uppercase text-boom">On Clock</div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
