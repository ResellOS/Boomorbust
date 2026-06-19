'use client';

import { useMemo, useState } from 'react';
import type { DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { slotOnClock, initPickOwnership } from '@/lib/draft/engine';
import { abbrevName, safeNum, safePickLabel, safeTeams } from '@/lib/draft/safeDisplay';
import PlayerAvatar from '@/components/players/PlayerAvatar';

const BOARD_POS_COLOR: Record<string, string> = {
  QB: '#A78BFA',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#FBBF24',
};

function boardPosColor(pos: string): string {
  return BOARD_POS_COLOR[pos?.toUpperCase()] ?? '#6b7a99';
}

interface DraftGridProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
  currentOverall: number;
}

function teamLabel(config: DraftConfig, slot: number): string {
  const t = config.teamOrder?.find((x) => x.slot === slot);
  if (t?.isUser) return 'You';
  return t?.name?.replace(/^Team /, 'T') ?? `T${slot}`;
}

export default function DraftGrid({ config, picks, currentOverall }: DraftGridProps) {
  const teams = safeTeams(config);
  const rounds = Math.max(1, safeNum(config.rounds, 15));
  const [viewRound, setViewRound] = useState(1);

  const pickByOverall = useMemo(() => {
    const m = new Map<number, DraftPickRecord>();
    for (const p of picks) {
      if (p.overall > 0) m.set(p.overall, p);
    }
    return m;
  }, [picks]);

  const ownership = useMemo(() => initPickOwnership(config), [config]);

  const slotOpts = useMemo(
    () => ({
      thirdRoundReversal: config.thirdRoundReversal,
      linear: config.draftOrderType === 'linear',
    }),
    [config.thirdRoundReversal, config.draftOrderType],
  );

  const renderRoundRow = (round: number, compact = false) => {
    const cells = Array.from({ length: teams }, (_, col) => {
      const overall = (round - 1) * teams + col + 1;
      const pk = pickByOverall.get(overall);
      const onClock = overall === currentOverall;
      const slot = pk?.slot ?? slotOnClock(overall, config, ownership);
      const isUserSlot = slot === config.yourPick;
      const pickNum = safePickLabel(overall, teams);
      const pos = pk?.player.position ?? '';
      const color = boardPosColor(pos);

      if (pk) {
        return (
          <div
            key={overall}
            className={`relative shrink-0 overflow-hidden rounded-[8px] border border-border bg-[#141929] ${
              compact ? 'h-[72px] w-[88px]' : 'h-[108px] w-[100px]'
            }`}
            style={{ boxShadow: `0 0 12px ${color}22` }}
          >
            <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: color }} />
            <div className="flex h-full flex-col p-1.5">
              <div className="font-mono text-[7px] text-muted">{pickNum}</div>
              <div className="flex flex-1 items-center gap-1">
                <PlayerAvatar playerId={pk.player.playerId} name={pk.player.name} size={compact ? 24 : 32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-mono text-[9px] font-medium text-text">
                    {abbrevName(pk.player.name)}
                  </div>
                  <div className="font-mono text-[7px]" style={{ color }}>
                    {pos} · {pk.player.team}
                  </div>
                </div>
              </div>
              <div className="font-mono text-[10px] tabular-nums" style={{ color }}>
                {Number.isFinite(pk.player.tfoScore) ? pk.player.tfoScore.toFixed(1) : '—'}
              </div>
            </div>
          </div>
        );
      }

      if (onClock && isUserSlot) {
        return (
          <div
            key={overall}
            className={`relative shrink-0 animate-[pulse_2.5s_ease-in-out_infinite] rounded-[8px] border-2 border-boom bg-boom/[0.08] ${
              compact ? 'h-[72px] w-[88px]' : 'h-[108px] w-[100px]'
            }`}
            style={{ boxShadow: '0 0 20px rgba(54,231,161,0.25)' }}
          >
            <div className="flex h-full flex-col items-center justify-center p-2 text-center">
              <div className="font-mono text-[8px] text-boom">{pickNum}</div>
              <div className="mt-1 font-mono text-[9px] uppercase tracking-wide text-boom">
                You On The Clock
              </div>
            </div>
          </div>
        );
      }

      return (
        <div
          key={overall}
          className={`relative shrink-0 rounded-[8px] border border-border/70 bg-[#0f1420] ${
            compact ? 'h-[72px] w-[88px]' : 'h-[108px] w-[100px]'
          } ${onClock ? 'border-boom/30' : ''}`}
        >
          <div className="flex h-full flex-col items-center justify-center p-2 text-center">
            <div className="font-mono text-[9px] text-muted">{pickNum}</div>
            <div className="mt-1 font-mono text-[8px] text-muted/60">
              {teamLabel(config, slot)}
            </div>
            <div className="mt-2 font-mono text-[10px] text-muted/30">—</div>
          </div>
        </div>
      );
    });

    return (
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">{cells}</div>
    );
  };

  const previewRound2 = Math.min(2, rounds);

  return (
    <div className="flex shrink-0 flex-col border-b border-border bg-[#0a0d14]" style={{ minHeight: 240, maxHeight: 280 }}>
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
        <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">Draft Board</div>
        <div className="flex gap-1">
          {[1, 2, 3].filter((r) => r <= rounds).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setViewRound(r)}
              className={`cursor-pointer rounded px-2 py-0.5 font-mono text-[8px] uppercase ${
                viewRound === r ? 'bg-boom/15 text-boom' : 'text-muted hover:text-text'
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-3 py-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="w-14 shrink-0 font-mono text-[9px] uppercase text-boom">Round {viewRound}</span>
          {renderRoundRow(viewRound)}
        </div>

        {viewRound === 1 && rounds >= 2 && (
          <div className="mt-2 border-t border-border/50 pt-2 opacity-70">
            <div className="mb-1 flex items-center gap-2">
              <span className="w-14 shrink-0 font-mono text-[8px] uppercase text-muted">Round 2</span>
              {renderRoundRow(previewRound2, true)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
