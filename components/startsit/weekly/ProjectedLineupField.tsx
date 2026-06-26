'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { LineupSlotView } from '@/lib/startsit/types';
import { slotBorder } from './decisionStyles';

interface ProjectedLineupFieldProps {
  starters: LineupSlotView[];
  bench: LineupSlotView[];
  selectedPlayerId: string | null;
  leagueName: string;
  onSelectPlayer: (playerId: string | null) => void;
  onApproveAll: () => void;
  notSyncedCount: number;
  isPreview: boolean;
}

function SlotTile({
  slot,
  selected,
  onSelect,
}: {
  slot: LineupSlotView;
  selected: boolean;
  onSelect: () => void;
}) {
  const border = slotBorder(slot.recommendation);
  const hasPlayer = slot.playerId != null;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!hasPlayer}
      className="flex flex-col items-center rounded-md border bg-[#0a120e]/80 p-1.5 transition-all disabled:cursor-default"
      style={{
        borderColor: border,
        boxShadow: selected ? `0 0 12px ${border}` : undefined,
        minHeight: 72,
      }}
    >
      <span className="font-mono text-[7px] uppercase tracking-wide text-muted">{slot.slot}</span>
      {hasPlayer ? (
        <>
          <PlayerAvatar
            playerId={slot.playerId!}
            name={slot.playerName}
            size={28}
            className="my-0.5"
          />
          <span className="max-w-full truncate font-mono text-[8px] uppercase text-text">
            {slot.playerName.split(' ').pop()}
          </span>
          <span className="font-mono text-[8px] text-muted">
            {slot.team} · {slot.opponent}
          </span>
          {slot.projectedPoints != null && (
            <span className="font-mono text-[9px] text-boom">
              {slot.projectedPoints.toFixed(1)} pts
            </span>
          )}
          <span className="font-mono text-[7px] text-muted">{slot.confidence}%</span>
        </>
      ) : (
        <span className="mt-2 font-mono text-[8px] text-muted">Empty</span>
      )}
    </button>
  );
}

export default function ProjectedLineupField({
  starters,
  bench,
  selectedPlayerId,
  leagueName,
  onSelectPlayer,
  onApproveAll,
  notSyncedCount,
  isPreview,
}: ProjectedLineupFieldProps) {
  const skillSlots = starters.filter((s) => !['DST', 'K'].includes(s.slot));
  const dstK = starters.filter((s) => ['DST', 'K'].includes(s.slot));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
            Your Projected Lineup
          </div>
          <div className="font-mono text-[10px] text-text">{leagueName}</div>
        </div>
        <Link
          href="/dashboard/lineup"
          className="font-mono text-[9px] text-boom hover:underline"
        >
          Full Lineup →
        </Link>
      </div>

      <div
        className="relative flex-1 rounded-md border border-[#1a3d2a]/60 p-2"
        style={{
          background:
            'linear-gradient(180deg, rgba(10,40,20,0.35) 0%, rgba(10,13,20,0.9) 100%)',
        }}
      >
        {isPreview && (
          <div className="mb-2 rounded border border-hold/30 bg-hold/5 px-2 py-1 font-mono text-[8px] text-hold">
            Preseason preview — lineup fills when scored roster data is available
          </div>
        )}
        <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
          {skillSlots.map((s) => (
            <SlotTile
              key={s.slot + (s.playerId ?? 'empty')}
              slot={s}
              selected={selectedPlayerId === s.playerId}
              onSelect={() => onSelectPlayer(s.playerId)}
            />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          {dstK.map((s) => (
            <SlotTile
              key={s.slot}
              slot={s}
              selected={false}
              onSelect={() => {}}
            />
          ))}
        </div>
      </div>

      {bench.length > 0 && (
        <div className="mt-2">
          <div className="mb-1 font-mono text-[8px] uppercase text-muted">Bench</div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {bench.map((b) => (
              <button
                key={b.playerId ?? b.playerName}
                type="button"
                onClick={() => onSelectPlayer(b.playerId)}
                className="flex shrink-0 flex-col items-center rounded border border-border bg-surface2 px-2 py-1.5"
                style={{ borderColor: slotBorder(b.recommendation) }}
              >
                <PlayerAvatar playerId={b.playerId ?? ''} name={b.playerName} size={24} />
                <span className="mt-0.5 max-w-[72px] truncate font-mono text-[7px] uppercase text-text">
                  {b.playerName.split(' ').pop()}
                </span>
                {b.projectedPoints != null && (
                  <span className="font-mono text-[8px] text-muted">
                    {b.projectedPoints.toFixed(1)} pts
                  </span>
                )}
                {b.recommendation === 'flex' && (
                  <span className="font-mono text-[7px] text-hold">Regret risk</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onApproveAll}
        className="mt-3 w-full rounded-md border-none py-2.5 font-mono text-[10px] uppercase tracking-wide text-bg"
        style={{ background: '#7c3aed', boxShadow: '0 0 16px rgba(124,58,237,0.25)' }}
      >
        Approve All Decisions
      </button>
      {notSyncedCount > 0 && (
        <p className="mt-1 text-center font-mono text-[9px] text-hold">
          {notSyncedCount} decision{notSyncedCount !== 1 ? 's' : ''} not synced
        </p>
      )}
    </div>
  );
}
