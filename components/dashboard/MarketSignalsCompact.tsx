'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import { formatStartSitConfidence } from '@/lib/ui/labels';
import type { RotationPlayer } from '@/lib/dashboard/rotation';
import { sortByMarketSignal } from '@/lib/dashboard/sortPlayers';

function engineRank(ktcRank: number | null, rankDelta: number | null): number | null {
  if (ktcRank == null || rankDelta == null) return null;
  return Math.round(ktcRank - rankDelta);
}

function actionLabel(verdict: string): string {
  if (verdict === 'BUST' || verdict === 'SELL') return 'Sell Now';
  if (verdict === 'BOOM' || verdict === 'BUY') return 'Buy Low';
  return 'Monitor';
}

function confidenceTier(rankDelta: number | null): string {
  const raw = rankDelta != null ? Math.min(85, 55 + Math.abs(rankDelta) / 8) : 55;
  return formatStartSitConfidence(raw);
}

function SignalRow({ player }: { player: RotationPlayer }) {
  const mv = player.marketVerdict;
  if (!mv || mv.noMarketData) return null;

  const ktc = mv.ktcRank ?? null;
  const bob = engineRank(mv.ktcRank ?? null, mv.rankDelta);
  const delta = mv.rankDelta != null ? Math.round(mv.rankDelta) : null;
  const deltaColor = delta != null && delta < 0 ? '#A78BFA' : '#36E7A1';

  return (
    <div className="border-b border-[#1e2640]/50 px-3 py-2 last:border-b-0 hover:bg-white/[0.02]">
      <div className="flex items-center gap-2">
        <PlayerAvatar playerId={player.playerId} name={player.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-figtree text-[12px] font-medium text-[#e8ecf4]">
              {player.name}
            </p>
            <span className="shrink-0 font-mono text-[8px] uppercase text-[#6b7a99]">
              Action:{' '}
              <span style={{ color: mv.color }}>{actionLabel(mv.verdict)}</span>
            </span>
          </div>
          <p className="font-mono text-[8px] text-[#6b7a99]">
            {player.position} · {player.team}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[8px] tabular-nums text-[#6b7a99]">
        <span>
          Market: <span className="text-[#e8ecf4]">{ktc ?? '—'}</span>
        </span>
        <span>
          BOB: <span className="text-boom">{bob ?? '—'}</span>
        </span>
        <span>
          Delta:{' '}
          <span style={{ color: delta != null ? deltaColor : '#6b7a99' }}>
            {delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
          </span>
        </span>
        <span>
          Conf: <span className="text-[#e8ecf4]">{confidenceTier(mv.rankDelta)}</span>
        </span>
      </div>
    </div>
  );
}

export default function MarketSignalsCompact({
  players,
}: {
  players: RotationPlayer[];
  leagueCounts?: Map<string, number>;
}) {
  const sorted = sortByMarketSignal(players)
    .filter((p) => p.marketVerdict && !p.marketVerdict.noMarketData)
    .slice(0, 5);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3.5 py-2.5">
        <div>
          <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
            Market Signals
          </h3>
          <p className="font-mono text-[8px] text-[#6b7a99]">Mispricing · action rows</p>
        </div>
        <Link href="/players" className="font-mono text-[8px] text-boom no-underline hover:underline">
          View All →
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.length === 0 ? (
          <p className="px-4 py-5 font-mono text-[10px] text-[#6b7a99]">
            No market signals yet — sync leagues to populate.
          </p>
        ) : (
          sorted.map((p) => <SignalRow key={p.playerId} player={p} />)
        )}
      </div>
    </section>
  );
}
