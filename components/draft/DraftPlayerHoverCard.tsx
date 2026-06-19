'use client';

import type { DraftablePlayer } from '@/lib/draft/types';
import {
  dynastyRankByPosition,
  peakYearsRemaining,
  projectedPpg,
} from '@/lib/draft/analyst';
import { ovrLabelTier } from '@/lib/players/hubUi';
import PlayerAvatar from '@/components/players/PlayerAvatar';

interface DraftPlayerHoverCardProps {
  player: DraftablePlayer;
  pool: DraftablePlayer[];
  style?: React.CSSProperties;
}

export default function DraftPlayerHoverCard({
  player,
  pool,
  style,
}: DraftPlayerHoverCardProps) {
  const tier = ovrLabelTier(player.tfoScore);
  const dynastyRank = dynastyRankByPosition(player, pool);
  const bobEdge = player.adp - player.bobRank;
  const ppg = projectedPpg(player);
  const peak = peakYearsRemaining(player.age);

  return (
    <div
      className="pointer-events-none z-50 w-[240px] rounded-md border border-border bg-surface p-3 shadow-[0_0_24px_rgba(54,231,161,0.12)]"
      style={style}
    >
      <div className="flex items-start gap-2.5">
        <PlayerAvatar playerId={player.playerId} name={player.name} size={44} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[12px] uppercase text-text">{player.name}</div>
          <div className="font-mono text-[10px] text-muted">
            {player.position} · {player.team}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <span className="font-mono text-[16px] text-text">OVR: {player.tfoScore.toFixed(1)}</span>
        <span className="font-mono text-[8px] uppercase tracking-wide" style={{ color: tier.color }}>
          {tier.label}
        </span>
      </div>

      <div className="mt-3 space-y-1 border-t border-[#1e2640] pt-2 font-mono text-[9px]">
        <div className="flex justify-between">
          <span className="text-muted">Dynasty Rank</span>
          <span className="text-text">{dynastyRank}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">ADP</span>
          <span className="text-text">{player.adp}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">BOB Edge</span>
          <span className={bobEdge > 0 ? 'text-boom' : 'text-muted'}>
            {bobEdge > 0 ? `+${Math.round(bobEdge)} spots` : '—'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Peak Years Remaining</span>
          <span className="text-text">{peak}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Projected PPG</span>
          <span className="text-boom">{ppg.toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
