'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import CountUpDelta from '@/components/dashboard/CountUpDelta';
import MispricedAssetModal from './MispricedAssetModal';
import { formatStartSitConfidence } from '@/lib/ui/labels';
import type { LeagueBundle, RotationPlayer, TradeTargetItem } from '@/lib/dashboard/rotation';
import { sortByMarketSignal } from '@/lib/dashboard/sortPlayers';
import { computeAssetActionability } from '@/lib/dashboard/assetActionability';

function engineRank(ktcRank: number | null, rankDelta: number | null): number | null {
  if (ktcRank == null || rankDelta == null) return null;
  return Math.round(ktcRank - rankDelta);
}

function actionLabel(verdict: string): string {
  if (verdict === 'BUST' || verdict === 'SELL') return 'SELL HIGH';
  if (verdict === 'BOOM' || verdict === 'BUY') return 'BUY LOW';
  return 'HOLD';
}

function confidenceTier(rankDelta: number | null): string {
  const raw = rankDelta != null ? Math.min(85, 55 + Math.abs(rankDelta) / 8) : 55;
  return formatStartSitConfidence(raw);
}

function SignalRow({
  player,
  isAll,
  currentLeague,
  ownedInLeagueIds,
  tradeTargetIds,
  onSelect,
}: {
  player: RotationPlayer;
  isAll: boolean;
  currentLeague: LeagueBundle | null;
  ownedInLeagueIds: Set<string>;
  tradeTargetIds: Set<string>;
  onSelect: (player: RotationPlayer) => void;
}) {
  const mv = player.marketVerdict;
  if (!mv || mv.noMarketData) return null;

  const ktc = mv.ktcRank ?? null;
  const bob = engineRank(mv.ktcRank ?? null, mv.rankDelta);
  const delta = mv.rankDelta != null ? Math.round(mv.rankDelta) : null;
  const deltaColor = delta != null && delta < 0 ? '#A78BFA' : '#36E7A1';
  const isSell = mv.verdict === 'SELL' || mv.verdict === 'BUST';
  const isBuy = mv.verdict === 'BOOM' || mv.verdict === 'BUY';
  const glowClass = isBuy ? 'dash-boom-glow' : isSell ? 'dash-bust-glow' : '';
  const action = computeAssetActionability(player, {
    isAll,
    currentLeague,
    ownedInLeagueIds,
    tradeTargetIds,
  });

  return (
    <button
      type="button"
      onClick={() => onSelect(player)}
      className={`dash-clickable-row block w-full cursor-pointer border-b border-[#1e2640]/50 px-3 py-2 text-left transition-transform last:border-b-0 hover:scale-[1.01] ${glowClass}`}
    >
      <div className="flex items-center gap-2">
        <PlayerAvatar playerId={player.playerId} name={player.name} size={32} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate font-figtree text-[13px] font-medium text-[#e8ecf4]">{player.name}</p>
            <span className="shrink-0 font-mono text-[9px] uppercase" style={{ color: mv.color }}>
              {actionLabel(mv.verdict)}
            </span>
          </div>
          <p className="font-mono text-[9px] text-[#6b7a99]">
            {player.position} · {player.team}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[9px] tabular-nums text-[#8b9bb8]">
        <span>
          Market Rank <span className="text-[#e8ecf4]">#{ktc ?? '—'}</span>
        </span>
        <span>
          BOB Rank <span className="text-boom">#{bob ?? '—'}</span>
        </span>
        <span>
          Rank Delta{' '}
          {delta != null ? (
            <CountUpDelta value={delta} style={{ color: deltaColor }} />
          ) : (
            <span style={{ color: '#6b7a99' }}>—</span>
          )}
        </span>
        <span>
          Confidence: <span className="text-[#e8ecf4]">{confidenceTier(mv.rankDelta)}</span>
        </span>
      </div>
      <div className="mt-1 flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-wide">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: action.dotColor }} />
        <span style={{ color: action.dotColor }}>{action.key}</span>
        <span className="normal-case text-[#8b9bb8]">· {action.hint}</span>
      </div>
    </button>
  );
}

export default function MarketSignalsCompact({
  players,
  isAll,
  currentLeague,
  ownedInLeagueIds,
  tradeTargets,
}: {
  players: RotationPlayer[];
  leagueCounts?: Map<string, number>;
  isAll: boolean;
  currentLeague: LeagueBundle | null;
  ownedInLeagueIds: Set<string>;
  tradeTargets: TradeTargetItem[];
}) {
  const [selectedAsset, setSelectedAsset] = useState<RotationPlayer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const tradeTargetIds = useMemo(
    () => new Set(tradeTargets.map((t) => t.playerId)),
    [tradeTargets],
  );

  const sorted = sortByMarketSignal(players)
    .filter((p) => p.marketVerdict && !p.marketVerdict.noMarketData)
    .slice(0, 3);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="flex items-center justify-between border-b border-[#1e2640]/80 px-3.5 py-2.5">
        <div>
          <h3 className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">
            Mispriced Assets
          </h3>
          <p className="font-mono text-[9px] text-[#8b9bb8]">Buy low · sell high · hold</p>
        </div>
        <Link href="/players" className="dash-action-btn font-mono text-[9px] text-boom no-underline">
          View All →
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.length === 0 ? (
          <p className="px-4 py-5 font-mono text-[11px] text-[#6b7a99]">
            No mispriced assets yet — sync leagues to populate.
          </p>
        ) : (
          sorted.map((p) => (
            <SignalRow
              key={p.playerId}
              player={p}
              isAll={isAll}
              currentLeague={currentLeague}
              ownedInLeagueIds={ownedInLeagueIds}
              tradeTargetIds={tradeTargetIds}
              onSelect={(asset) => {
                setSelectedAsset(asset);
                setModalOpen(true);
              }}
            />
          ))
        )}
      </div>
      <MispricedAssetModal
        player={selectedAsset}
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedAsset(null);
        }}
      />
    </section>
  );
}
