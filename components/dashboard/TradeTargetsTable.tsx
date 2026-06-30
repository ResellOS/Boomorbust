'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { TradeTargetItem } from '@/lib/dashboard/rotation';

interface TradeTargetsTableProps {
  targets: TradeTargetItem[];
  leagueId?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

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
        <span className="relative z-[1] font-mono text-[9px] font-bold text-muted">
          {initials(playerName)}
        </span>
      )}
    </div>
  );
}

export default function TradeTargetsTable({ targets, leagueId }: TradeTargetsTableProps) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
        <span className="font-figtree text-[11px] font-bold uppercase tracking-[1.5px] text-text">
          Recommended Trade Targets
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[480px] border-collapse">
          <thead>
            <tr>
              {['Player', 'League', 'Why Target', 'Acquire Cost'].map((col, i) => (
                <th
                  key={col}
                  className="border-b border-border bg-bg px-3 py-1.5 text-left font-mono text-[11px] font-normal uppercase tracking-[1.5px] text-muted"
                  style={i === 0 ? { width: '30%' } : undefined}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr key={target.playerId} className="cursor-pointer hover:bg-white/[0.02]">
                <td className="border-b border-border/50 px-3 py-2 align-middle">
                  <Link
                    href={`/trade?target=${target.playerId}&league=${leagueId ?? target.leagueId}`}
                    className="flex items-center gap-[9px] text-inherit no-underline"
                  >
                    <TargetAvatar playerId={target.playerId} playerName={target.playerName} />
                    <div>
                      <div className="font-figtree text-[13px] font-semibold leading-tight text-text">
                        {target.playerName}
                      </div>
                      <div className="font-mono text-[11px] text-muted">
                        {target.position} · {target.team} · {target.tfoScore.toFixed(1)}
                      </div>
                    </div>
                  </Link>
                </td>
                <td className="border-b border-border/50 px-3 py-2 align-middle font-figtree text-[13px] text-text">
                  {target.leagueName}
                </td>
                <td className="border-b border-border/50 px-3 py-2 align-middle font-figtree text-[12px] leading-snug text-muted">
                  {target.reason}
                </td>
                <td className="border-b border-border/50 px-3 py-2 align-middle font-mono text-[12px] text-boom">
                  {target.acquireCost}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
