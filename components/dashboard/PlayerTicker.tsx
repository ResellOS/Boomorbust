'use client';

import { useId } from 'react';
import type { RotationPlayer } from '@/lib/dashboard/rotation';

interface PlayerTickerProps {
  players: RotationPlayer[];
  animated: boolean; // false in ALL mode (static, avoids 22-league animation cost)
}

const VERDICT_COLOR: Record<string, string> = {
  boom: '#36E7A1',
  hold: '#FBBF24',
  bust: '#EF4444',
};

function TickerItem({ p }: { p: RotationPlayer }) {
  const color = VERDICT_COLOR[p.verdictClass] ?? '#6b7a99';
  return (
    <span className="mx-4 inline-flex shrink-0 items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      <span className="font-figtree text-[11px] text-text">{p.name}</span>
      <span className="font-mono text-[8px] text-muted">{p.position}</span>
      <span className="font-mono text-[11px]" style={{ color }}>
        {p.tfoScore > 0 ? p.tfoScore.toFixed(1) : '—'}
      </span>
    </span>
  );
}

export default function PlayerTicker({ players, animated }: PlayerTickerProps) {
  const rawId = useId();
  const animName = `bobticker${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;

  if (players.length === 0) {
    return (
      <div className="flex h-[30px] items-center rounded-[7px] border border-border bg-surface px-3 font-mono text-[10px] text-muted">
        No rostered players in this league yet.
      </div>
    );
  }

  // Duration scales with roster size so speed feels consistent across leagues.
  const durationS = Math.max(14, players.length * 2.6);

  return (
    <div className="relative overflow-hidden rounded-[7px] border border-border bg-surface py-1.5">
      <div
        className="flex w-max items-center"
        style={
          animated
            ? { animation: `${animName} ${durationS}s linear infinite` }
            : undefined
        }
      >
        {players.map((p) => (
          <TickerItem key={`a-${p.playerId}`} p={p} />
        ))}
        {/* duplicate run for a seamless loop when animated */}
        {animated &&
          players.map((p) => <TickerItem key={`b-${p.playerId}`} p={p} />)}
      </div>
      {animated && (
        <style>{`@keyframes ${animName} { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      )}
    </div>
  );
}
