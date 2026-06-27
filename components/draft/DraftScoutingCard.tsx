'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { DraftablePlayer } from '@/lib/draft/types';
import { scoutingVerdict } from '@/lib/draft/warRoomUi';
import { bobReasoning, dynastyRankByPosition } from '@/lib/draft/analyst';
import { positionColor } from '@/lib/draft/engine';
import { valueGap } from '@/lib/draft/safeDisplay';

interface DraftScoutingCardProps {
  player: DraftablePlayer | null;
  pool: DraftablePlayer[];
  currentOverall: number;
  draftType: string;
  onDraft?: (player: DraftablePlayer) => void;
  onQueue?: (player: DraftablePlayer) => void;
  isUserTurn: boolean;
}

const VERDICT_COLOR: Record<string, string> = {
  'STRONG PICK': '#36E7A1',
  'VALUE PICK': '#22D3EE',
  REACH: '#FBBF24',
  AVOID: '#EF4444',
};

export default function DraftScoutingCard({
  player,
  pool,
  currentOverall,
  draftType,
  onDraft,
  onQueue,
  isUserTurn,
}: DraftScoutingCardProps) {
  if (!player) {
    return (
      <div className="rounded-md border border-border bg-[#0f1420] p-3">
        <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">Player Scouting</div>
        <p className="mt-2 font-mono text-[10px] text-muted">
          Select a player from the big board to view scouting intel.
        </p>
      </div>
    );
  }

  const verdict = scoutingVerdict(player, currentOverall);
  const vColor = VERDICT_COLOR[verdict] ?? '#8b9bb8';
  const posRank = dynastyRankByPosition(player, pool);
  const reasoning = bobReasoning(player);

  return (
    <div className="rounded-md border border-border bg-[#0f1420] p-3">
      <div className="flex items-start gap-3">
        <PlayerAvatar playerId={player.playerId} name={player.name} size={52} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[13px] uppercase text-text">{player.name}</div>
          <div className="font-mono text-[10px] text-muted">
            {player.position} · {player.team}
            {player.age != null && ` · Age ${player.age}`}
          </div>
          <div
            className="mt-1 inline-block rounded px-1.5 py-0.5 font-mono text-[8px] uppercase"
            style={{ color: vColor, border: `1px solid ${vColor}44` }}
          >
            {verdict}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[22px] tabular-nums text-boom">{player.tfoScore.toFixed(1)}</div>
          <div className="font-mono text-[8px] text-muted">BOB Score</div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[9px]">
        <div>
          <div className="text-muted">Pos Rank</div>
          <div className="text-text">{posRank}</div>
        </div>
        <div>
          <div className="text-muted">BPA Gap</div>
          <div className="text-boom">{valueGap(player.adp, currentOverall)}</div>
        </div>
        <div>
          <div className="text-muted">Mode</div>
          <div className="text-text capitalize">{draftType}</div>
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 font-mono text-[8px] uppercase text-muted">Strengths</div>
        <ul className="space-y-0.5">
          <li className="flex gap-1 font-mono text-[9px] text-text">
            <span style={{ color: positionColor(player.position) }}>✓</span>
            {reasoning}
          </li>
          {player.verdict && (
            <li className="flex gap-1 font-mono text-[9px] text-text">
              <span className="text-boom">✓</span>
              TFO verdict: {player.verdict}
            </li>
          )}
        </ul>
      </div>

      {player.isRookie && draftType === 'rookie' && (
        <p className="mt-2 font-mono text-[8px] text-hold">
          College scouting scores — BBB integration coming soon
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!isUserTurn}
          onClick={() => onDraft?.(player)}
          className="flex-1 rounded bg-boom py-2 font-mono text-[9px] uppercase text-bg disabled:opacity-40"
        >
          Draft Player
        </button>
        <button
          type="button"
          onClick={() => onQueue?.(player)}
          className="rounded border border-border px-3 py-2 font-mono text-[9px] uppercase text-muted hover:text-text"
        >
          + Queue
        </button>
        <Link
          href={`/players?player=${player.playerId}`}
          className="rounded border border-[#7c3aed]/40 px-3 py-2 font-mono text-[9px] uppercase text-[#A78BFA] hover:bg-[#7c3aed]/10"
        >
          Hub →
        </Link>
      </div>
    </div>
  );
}
