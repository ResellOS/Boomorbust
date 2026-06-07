'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getTradeVerdictLabel, getVerdict, placeholderAcquireCost } from '@/lib/verdict';

export interface TradeTarget {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  leagueName: string;
  tfoScore: number;
  acquireCost?: string;
}

interface TradeTargetsTableProps {
  targets: TradeTarget[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

const VERDICT_PILL: Record<string, string> = {
  BOOM: 'bg-boom/[0.08] border border-boom/35 text-boom',
  HOLD: 'bg-hold/[0.07] border border-hold/30 text-hold',
  BUST: 'bg-bust/[0.08] border border-bust/35 text-bust',
};

function TargetAvatar({ playerId, playerName }: { playerId: string; playerName: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface2">
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={playerName}
          width={28}
          height={28}
          unoptimized
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1] font-mono text-[8px] font-bold text-muted">
          {initials(playerName)}
        </span>
      )}
    </div>
  );
}

export default function TradeTargetsTable({ targets }: TradeTargetsTableProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
        <span className="font-figtree text-[9.5px] font-bold uppercase tracking-[1.5px] text-text">
          Recommended Trade Targets
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {['Player', 'League', 'Rating', 'Acquire Cost', 'Verdict'].map((col, i) => (
                <th
                  key={col}
                  className="border-b border-border bg-bg px-3 py-1.5 text-left font-mono text-[7.5px] font-normal uppercase tracking-[1.5px] text-muted"
                  style={i === 0 ? { width: '34%' } : undefined}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => {
              const verdictLabel = getTradeVerdictLabel(target.tfoScore);
              const verdict = getVerdict(target.tfoScore);
              const cost = target.acquireCost ?? placeholderAcquireCost(target.tfoScore);
              return (
                <tr key={target.playerId} className="hover:bg-white/[0.01]">
                  <td className="border-b border-border/50 px-3 py-1.5 align-middle">
                    <div className="flex items-center gap-[9px]">
                      <TargetAvatar playerId={target.playerId} playerName={target.playerName} />
                      <div>
                        <div className="font-figtree text-[11px] font-semibold leading-tight text-text">
                          {target.playerName}
                        </div>
                        <div className="font-mono text-[9px] text-muted">
                          {target.position} · {target.team}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-border/50 px-3 py-1.5 align-middle font-figtree text-[11px] text-text">
                    {target.leagueName}
                  </td>
                  <td className="border-b border-border/50 px-3 py-1.5 align-middle">
                    <span className="font-mono text-xs" style={{ color: verdict.color }}>
                      {target.tfoScore.toFixed(1)}
                    </span>
                  </td>
                  <td className="border-b border-border/50 px-3 py-1.5 align-middle font-figtree text-[11px] text-muted">
                    {cost}
                  </td>
                  <td className="border-b border-border/50 px-3 py-1.5 align-middle">
                    <span
                      className={`inline-block min-w-[44px] rounded px-[9px] py-[3px] text-center font-figtree text-[9.5px] font-semibold ${VERDICT_PILL[verdictLabel]}`}
                    >
                      {verdictLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
