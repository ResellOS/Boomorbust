'use client';

import { useId } from 'react';
import type { RotationPlayer } from '@/lib/dashboard/rotation';

interface PlayerTickerProps {
  players: RotationPlayer[];
  animated: boolean;
}

const VERDICT_COLOR: Record<string, string> = {
  boom: '#36E7A1',
  hold: '#FBBF24',
  bust: '#A78BFA',
};

function TickerItem({ p }: { p: RotationPlayer }) {
  const scoreColor = VERDICT_COLOR[p.verdictClass] ?? '#6b7a99';
  const score = p.tfoScore > 0 ? p.tfoScore.toFixed(1) : '—';
  // Guard against a blank name so the ticker never shows a leading bare score.
  const name = p.name?.trim() ? p.name : 'Unknown Player';

  return (
    <span className="mx-4 inline-flex shrink-0 items-center gap-1.5">
      <span className="font-figtree text-[12px] text-text">{name}</span>
      <span className="font-mono text-[11px] text-muted">≡</span>
      <span className="font-mono text-[12px] tabular-nums" style={{ color: scoreColor }}>
        {score}
      </span>
    </span>
  );
}

export default function PlayerTicker({ players, animated }: PlayerTickerProps) {
  const rawId = useId();
  const animName = `bobticker${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (players.length === 0) {
    return (
      <div className="flex h-[30px] items-center rounded-[7px] border border-border bg-surface px-3 font-mono text-[11px] text-muted">
        No rostered players in this league yet.
      </div>
    );
  }

  const durationS = Math.max(14, players.length * 2.6);

  return (
    <div className="relative overflow-hidden rounded-[7px] border border-border bg-surface py-1.5">
      <div
        className="flex w-max items-center"
        style={
          animated ? { animation: `${animName} ${durationS}s linear infinite` } : undefined
        }
      >
        {players.map((p) => (
          <TickerItem key={`a-${p.playerId}`} p={p} />
        ))}
        {animated &&
          players.map((p) => <TickerItem key={`b-${p.playerId}`} p={p} />)}
      </div>
      {animated && (
        <style>{`@keyframes ${animName} { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      )}
    </div>
  );
}
