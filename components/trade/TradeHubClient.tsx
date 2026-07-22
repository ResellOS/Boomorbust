'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BlockPlayer, ManagerTradeCard, TradeOpportunity, TradePageData } from '@/lib/trade/types';
import { opportunityToSuggestion } from '@/lib/trade/tradeHubUi';
import { findManagerForOpportunity, resolveTradePartners } from '@/lib/trade/resolvePartners';
import { playerHubHref } from '@/lib/dashboard/dashboardRoutes';
import TradeHubHeader, { type TradeViewMode } from '@/components/trade/TradeHubHeader';
import TradeOfTheDayHero from '@/components/trade/TradeOfTheDayHero';
import BestTradePartners from '@/components/trade/BestTradePartners';
import TradeStagingArea from '@/components/trade/TradeStagingArea';
import LeagueWinningMoves from '@/components/trade/LeagueWinningMoves';
import PositionalMarketReport from '@/components/trade/PositionalMarketReport';
import TradeDatabase, { type TradeTypeFilter } from '@/components/trade/TradeDatabase';
import TradeHubRightSidebar from '@/components/trade/TradeHubRightSidebar';
import AiTradeAssistant, { type TradeQuickAction } from '@/components/trade/AiTradeAssistant';
import TradePreviewModal from '@/components/trade/TradePreviewModal';
import TradeHistory from '@/components/trade/TradeHistory';
import AdSlot from '@/components/ads/AdSlot';

const ALL = 'all';

interface TradeHubClientProps {
  data: TradePageData;
  showAds?: boolean;
  initialTargetPlayerId?: string;
  initialLeagueId?: string;
  initialOfferId?: string;
}

export default function TradeHubClient({
  data,
  showAds = false,
  initialTargetPlayerId,
  initialLeagueId,
}: TradeHubClientProps) {
  const router = useRouter();
  const initialView: TradeViewMode = initialLeagueId ? 'league' : 'global';
  const [viewMode, setViewMode] = useState<TradeViewMode>(initialView);
  const [leagueId, setLeagueId] = useState(
    initialLeagueId ?? data.leagues[0]?.id ?? ALL,
  );
  const [positionFilter, setPositionFilter] = useState<string | undefined>();
  const [dbTier, setDbTier] = useState<'all' | 'smash' | 'high' | 'speculative' | 'long'>('all');
  const [tradeTypeFilter, setTradeTypeFilter] = useState<TradeTypeFilter>('all');
  const [previewSuggestion, setPreviewSuggestion] = useState<ReturnType<
    typeof opportunityToSuggestion
  > | null>(null);
  const [mainTab, setMainTab] = useState<'hub' | 'history'>('hub');

  const effectiveLeagueId = viewMode === 'global' ? ALL : leagueId;

  const filteredOpportunities = useMemo(() => {
    if (effectiveLeagueId === ALL) return data.opportunities;
    return data.opportunities.filter((o) => o.leagueId === effectiveLeagueId);
  }, [data.opportunities, effectiveLeagueId]);

  const filteredManagers = useMemo(() => {
    if (effectiveLeagueId === ALL) return data.managerCards;
    return data.managerCards.filter((m) => m.leagueId === effectiveLeagueId);
  }, [data.managerCards, effectiveLeagueId]);

  const resolvedPartners = useMemo(
    () => resolveTradePartners(filteredManagers, filteredOpportunities, 3),
    [filteredManagers, filteredOpportunities],
  );

  const [selectedManager, setSelectedManager] = useState<ManagerTradeCard | null>(
    resolvedPartners.find((p) => !p.isSkeleton)?.manager ?? null,
  );

  const filteredBlocks = useMemo(() => {
    if (effectiveLeagueId === ALL) return data.blockPlayers;
    return data.blockPlayers.filter((p) => p.leagueId === effectiveLeagueId);
  }, [data.blockPlayers, effectiveLeagueId]);

  const filteredHistory = useMemo(() => {
    if (effectiveLeagueId === ALL) return data.history;
    return data.history.filter((h) => h.leagueId === effectiveLeagueId);
  }, [data.history, effectiveLeagueId]);

  const initialOpp = useMemo(() => {
    if (initialTargetPlayerId) {
      return (
        filteredOpportunities.find((o) => o.playerId === initialTargetPlayerId) ??
        data.opportunities.find((o) => o.playerId === initialTargetPlayerId) ??
        null
      );
    }
    return filteredOpportunities[0] ?? null;
  }, [initialTargetPlayerId, filteredOpportunities, data.opportunities]);

  const [activeOpp, setActiveOpp] = useState<TradeOpportunity | null>(initialOpp);

  useEffect(() => {
    setActiveOpp((prev) => {
      if (prev && filteredOpportunities.some((o) => o.id === prev.id)) return prev;
      return filteredOpportunities[0] ?? null;
    });
  }, [filteredOpportunities, effectiveLeagueId]);

  useEffect(() => {
    setSelectedManager((prev) => {
      if (
        prev &&
        resolvedPartners.some(
          (p) =>
            !p.isSkeleton &&
            p.manager.leagueId === prev.leagueId &&
            p.manager.displayName === prev.displayName,
        )
      ) {
        return prev;
      }
      return resolvedPartners.find((p) => !p.isSkeleton)?.manager ?? null;
    });
  }, [resolvedPartners, effectiveLeagueId]);

  const givePicks = useMemo(() => {
    const byLeague = data.ownedPicksByLeague ?? {};
    const lid = activeOpp?.leagueId ?? (effectiveLeagueId === ALL ? Object.keys(byLeague)[0] : effectiveLeagueId);
    if (!lid || lid === ALL) return Object.values(byLeague).flat();
    return byLeague[lid] ?? [];
  }, [data.ownedPicksByLeague, activeOpp, effectiveLeagueId]);

  const selectTrade = useCallback(
    (opp: TradeOpportunity) => {
      setActiveOpp(opp);
      const mgr =
        findManagerForOpportunity(opp, data.managerCards, data.opportunities) ??
        resolvedPartners.find(
          (p) =>
            !p.isSkeleton &&
            p.manager.leagueId === opp.leagueId &&
            p.manager.displayName === opp.managerName,
        )?.manager ??
        null;
      if (mgr) setSelectedManager(mgr);
    },
    [data.managerCards, data.opportunities, resolvedPartners],
  );

  const handleViewTrade = useCallback(
    (opp: TradeOpportunity) => {
      selectTrade(opp);
      setPreviewSuggestion(opportunityToSuggestion(opp));
    },
    [selectTrade],
  );

  const handleStageOffer = useCallback(
    (opp: TradeOpportunity) => selectTrade(opp),
    [selectTrade],
  );

  const handleBlockClick = useCallback(
    (p: BlockPlayer) => {
      const match = filteredOpportunities.find(
        (o) => o.playerId === p.playerId && o.leagueId === p.leagueId,
      );
      if (match) {
        selectTrade(match);
        return;
      }
      router.push(playerHubHref(p.playerId));
    },
    [filteredOpportunities, selectTrade, router],
  );

  const handleViewMode = (mode: TradeViewMode) => {
    setViewMode(mode);
    if (mode === 'league' && leagueId === ALL && data.leagues[0]) {
      setLeagueId(data.leagues[0].id);
    }
  };

  const scrollToDatabase = () => {
    document.getElementById('trade-database')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleQuickAction = useCallback(
    (action: TradeQuickAction) => {
      scrollToDatabase();
      switch (action) {
        case 'buy_low':
          setTradeTypeFilter('buy');
          setDbTier('all');
          setPositionFilter(undefined);
          break;
        case 'sell_high':
          setTradeTypeFilter('sell');
          setDbTier('all');
          setPositionFilter(undefined);
          break;
        case 'contender': {
          setTradeTypeFilter('all');
          setDbTier('high');
          setPositionFilter(undefined);
          const top = [...filteredOpportunities].sort(
            (a, b) => b.championshipImpact - a.championshipImpact,
          )[0];
          if (top) selectTrade(top);
          break;
        }
        case 'rebuild': {
          setTradeTypeFilter('buy');
          setDbTier('speculative');
          setPositionFilter(undefined);
          const pick = filteredOpportunities.find((o) => o.suggestedPrice?.includes('1st')) ?? filteredOpportunities[0];
          if (pick) selectTrade(pick);
          break;
        }
        case 'target_wr':
          setPositionFilter('WR');
          setTradeTypeFilter('all');
          break;
        case 'target_rb':
          setPositionFilter('RB');
          setTradeTypeFilter('all');
          break;
        default:
          break;
      }
    },
    [filteredOpportunities, selectTrade],
  );

  return (
    <div className="col-start-1 row-start-2 flex min-h-0 min-w-0 flex-col overflow-hidden md:col-start-2 md:grid md:grid-cols-[1fr_280px]">
      <div className="flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto px-4 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TradeHubHeader
          viewMode={viewMode}
          onViewModeChange={handleViewMode}
          leagues={data.leagues}
          selectedLeagueId={leagueId === ALL ? (data.leagues[0]?.id ?? '') : leagueId}
          onLeagueChange={setLeagueId}
        />

        <div className="flex items-center gap-1 border-b border-border">
          {(['hub', 'history'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setMainTab(tab)}
              className={`-mb-px border-b-2 px-3 py-2 font-figtree text-[12px] font-bold transition-colors ${
                mainTab === tab ? 'border-boom text-boom' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {tab === 'hub' ? 'Hub' : 'History'}
            </button>
          ))}
        </div>

        {mainTab === 'history' ? (
          <TradeHistory leagues={data.leagues} />
        ) : (
        <>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.2fr_1fr_300px]">
          <TradeOfTheDayHero
            opportunities={filteredOpportunities}
            onStageOffer={handleStageOffer}
            onViewTrade={handleViewTrade}
            onSendCalculator={handleStageOffer}
          />
          <BestTradePartners
            managers={filteredManagers}
            opportunities={filteredOpportunities}
            onSelectManager={setSelectedManager}
          />
          <div className="xl:sticky xl:top-0 xl:self-start">
            <TradeStagingArea
              activeOpportunity={activeOpp}
              givePicks={givePicks}
              selectedManager={selectedManager}
            />
          </div>
        </div>

        <LeagueWinningMoves opportunities={filteredOpportunities} onSelect={selectTrade} />

        <PositionalMarketReport
          rows={data.marketTemperature}
          onPositionClick={(pos) => {
            setPositionFilter(pos);
            scrollToDatabase();
          }}
        />

        <TradeDatabase
          opportunities={filteredOpportunities}
          leagues={data.leagues}
          positionFilter={positionFilter}
          tier={dbTier}
          onTierChange={setDbTier}
          tradeTypeFilter={tradeTypeFilter}
          onRowClick={selectTrade}
        />

        <AiTradeAssistant onQuickAction={handleQuickAction} />

        {showAds ? <AdSlot placement="trade-history" showAds={showAds} /> : null}
        </>
        )}
      </div>

      <TradeHubRightSidebar
        selectedManager={selectedManager}
        blockPlayers={filteredBlocks}
        history={filteredHistory}
        onSelectBlock={handleBlockClick}
      />

      {previewSuggestion ? (
        <TradePreviewModal
          suggestion={previewSuggestion}
          givePicks={data.ownedPicksByLeague?.[previewSuggestion.leagueId] ?? givePicks}
          myAssets={data.myTradeAssetsByLeague?.[previewSuggestion.leagueId] ?? []}
          onClose={() => setPreviewSuggestion(null)}
        />
      ) : null}
    </div>
  );
}
