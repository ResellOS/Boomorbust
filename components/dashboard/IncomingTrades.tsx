'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getVerdict } from '@/lib/verdict';

export interface IncomingTrade {
  id: string;
  playerId: string;
  playerName: string;
  leagueName: string;
  managerHandle: string;
  dynastyEdge: number;
  status: 'NEW' | 'PENDING';
  tfoScore?: number;
}

interface IncomingTradesProps {
  trades: IncomingTrade[];
  viewAllCount?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

function TradeAvatar({
  playerId,
  playerName,
  borderColor,
  textColor,
}: {
  playerId: string;
  playerName: string;
  borderColor: string;
  textColor: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative flex h-[30px] w-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full border-2 bg-surface2"
      style={{ borderColor }}
    >
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={playerName}
          width={30}
          height={30}
          unoptimized
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1] font-mono text-[9px] font-bold" style={{ color: textColor }}>
          {initials(playerName)}
        </span>
      )}
    </div>
  );
}

export default function IncomingTrades({ trades, viewAllCount }: IncomingTradesProps) {
  const count = viewAllCount ?? trades.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
        <span className="font-figtree text-[9.5px] font-bold uppercase tracking-[1.5px] text-text">
          Incoming Trades
        </span>
        <Link href="/trade" className="font-mono text-[8px] text-boom no-underline">
          View All {count} →
        </Link>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {trades.map((trade) => {
          const verdict = getVerdict(trade.tfoScore ?? 75);
          return (
            <Link
              key={trade.id}
              href={`/trade?offer=${trade.id}`}
              className="flex items-center gap-2.5 border-b border-border/40 px-3 py-2 text-inherit no-underline transition-colors last:border-b-0 hover:bg-white/[0.015]"
            >
              <TradeAvatar
                playerId={trade.playerId}
                playerName={trade.playerName}
                borderColor={verdict.color}
                textColor={verdict.color}
              />
              <div className="min-w-0 flex-1">
                <div className="font-figtree text-[11px] font-semibold text-text">
                  {trade.playerName}
                </div>
                <div className="font-mono text-[8px] text-muted">
                  {trade.leagueName} · {trade.managerHandle}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-xs font-bold text-boom">
                  +{trade.dynastyEdge.toFixed(1)}
                </div>
                <span
                  className={`mt-0.5 inline-block rounded-[3px] px-[7px] py-0.5 font-figtree text-[8.5px] font-semibold ${
                    trade.status === 'NEW'
                      ? 'border border-boom/30 bg-boom/10 text-boom'
                      : 'border border-hold/20 bg-hold/[0.07] text-hold'
                  }`}
                >
                  {trade.status}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
