'use client';

import type { PositionConcentration } from '@/lib/exposure/types';

interface PositionConcentrationBarsProps {
  rows: PositionConcentration[];
  leaguesConnected: number;
}

export default function PositionConcentrationBars({
  rows,
  leaguesConnected,
}: PositionConcentrationBarsProps) {
  const maxSlots = Math.max(...rows.map((r) => r.leagueSlots), 1);

  return (
    <div className="mb-4 rounded-[7px] border border-border bg-surface px-3 py-3">
      <div className="mb-2.5 font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-muted">
        Position Concentration
      </div>
      <div className="space-y-2.5">
        {rows.map((row) => {
          const pct = row.leagueSlots > 0 ? (row.leagueSlots / maxSlots) * 100 : 0;
          return (
            <div key={row.position}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] text-text">
                  {row.position} exposure:{' '}
                  <span className="tabular-nums">{row.playerCount}</span> player
                  {row.playerCount === 1 ? '' : 's'} in{' '}
                  <span className="tabular-nums">{row.leagueSlots}</span> league
                  {row.leagueSlots === 1 ? '' : 's'}
                </span>
                {leaguesConnected > 0 && row.playerCount > 0 ? (
                  <span className="shrink-0 font-mono text-[8px] text-muted">
                    / {leaguesConnected} max
                  </span>
                ) : null}
              </div>
              <div className="h-[5px] overflow-hidden rounded-sm bg-border">
                <div
                  className="h-full rounded-sm transition-all duration-300"
                  style={{ width: `${pct}%`, background: row.color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
