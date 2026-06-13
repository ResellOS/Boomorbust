'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getVerdict } from '@/lib/verdict';
import type { DashboardIncomingTrade } from '@/lib/dashboard/rotation';

interface IncomingTradesProps {
  trades: DashboardIncomingTrade[];
}

const VISIBLE = 3;
const ROTATE_MS = 5000;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

function TradeAvatar({
  playerId,
  playerName,
  borderColor,
}: {
  playerId: string;
  playerName: string;
  borderColor: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!playerId || playerId === '0') {
    return (
      <div
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 bg-surface2 font-mono text-[9px]"
        style={{ borderColor, color: borderColor }}
      >
        PK
      </div>
    );
  }
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
        <span className="relative z-[1] font-mono text-[9px] font-bold" style={{ color: borderColor }}>
          {initials(playerName)}
        </span>
      )}
    </div>
  );
}

export default function IncomingTrades({ trades }: IncomingTradesProps) {
  const [offset, setOffset] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (trades.length <= VISIBLE) return;
    const iv = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setOffset((o) => (o + VISIBLE) % trades.length);
        setFade(false);
      }, 300);
    }, ROTATE_MS);
    return () => clearInterval(iv);
  }, [trades.length]);

  if (trades.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
        <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
          <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
            Incoming Trades
          </span>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 text-center">
          <p className="font-figtree text-[12px] text-muted">
            No pending offers —{' '}
            <Link href="/trade" className="text-boom no-underline hover:underline">
              View trade targets to make a move →
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const visible =
    trades.length <= VISIBLE
      ? trades
      : Array.from({ length: VISIBLE }, (_, i) => trades[(offset + i) % trades.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[7px] border border-border bg-surface">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-bg px-3 py-[7px]">
        <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
          Incoming Trades
        </span>
        <Link href="/trade" className="font-mono text-[10px] text-boom no-underline">
          View All {trades.length} →
        </Link>
      </div>
      <div
        className="min-h-0 flex-1 overflow-hidden transition-opacity duration-300"
        style={{ opacity: fade ? 0.4 : 1 }}
      >
        {visible.map((trade) => {
          const verdict = getVerdict(trade.tfoScore ?? 75);
          return (
            <Link
              key={trade.id}
              href={`/trade?offer=${trade.id}&league=${trade.leagueId}`}
              className="flex items-start gap-2.5 border-b border-border/40 px-3 py-2.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-white/[0.015]"
            >
              <TradeAvatar
                playerId={trade.playerId}
                playerName={trade.playerName}
                borderColor={verdict.color}
              />
              <div className="min-w-0 flex-1">
                <div className="font-figtree text-[12px] font-semibold text-text">
                  {trade.playerName}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted">
                  Wants: {trade.askingFor}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted">
                  {trade.leagueName} · {trade.managerName}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-[12px] font-bold text-boom">
                  +{trade.dynastyEdge.toFixed(1)}
                </div>
                <span
                  className={`mt-0.5 inline-block rounded-[3px] px-[7px] py-0.5 font-figtree text-[10px] font-semibold ${
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
