'use client';

import { useMemo, useState } from 'react';
import type { ManagerTradeCard, TradeOffer, TradeOpportunity, TradePageData } from '@/lib/trade/types';
import { calculatorAssetsFromOpportunity } from '@/lib/trade/tradeHubUi';
import BestTradeHero from '@/components/trade/BestTradeHero';
import LeagueWinningMoves from '@/components/trade/LeagueWinningMoves';
import SuggestedTradesTable from '@/components/trade/SuggestedTradesTable';
import TradeHubRightSidebar from '@/components/trade/TradeHubRightSidebar';
import TradeOfferCard from '@/components/trade/TradeOfferCard';
import TradeHistoryBox from '@/components/trade/TradeHistoryBox';
import TradeCalculator from '@/components/trade/TradeCalculator';
import { TradeHubInsightCards } from '@/components/trade/TradeHubInsightCards';
import TradePreviewModal from '@/components/trade/TradePreviewModal';
import { opportunityToSuggestion } from '@/lib/trade/tradeHubUi';
import AdSlot from '@/components/ads/AdSlot';

type TabId = 'overview' | 'suggested' | 'blocks' | 'incoming' | 'outgoing' | 'completed' | 'calculator';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'suggested', label: 'Suggested Trades' },
  { id: 'blocks', label: 'Trade Blocks' },
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'calculator', label: 'Calculator' },
];

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
  initialOfferId,
}: TradeHubClientProps) {
  const [tab, setTab] = useState<TabId>('overview');
  const [league, setLeague] = useState<string>(initialLeagueId ?? ALL);
  const [activeOpp, setActiveOpp] = useState<TradeOpportunity | null>(
    data.opportunities[0] ?? null,
  );
  const [previewSuggestion, setPreviewSuggestion] = useState<ReturnType<
    typeof opportunityToSuggestion
  > | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOfferId ??
      data.incomingOffers.find((o) =>
        initialTargetPlayerId ? o.offeredPlayerIds?.includes(initialTargetPlayerId) : false,
      )?.id ??
      data.incomingOffers[0]?.id ??
      null,
  );

  const inLeague = <T extends { leagueId?: string }>(items: T[]): T[] =>
    league === ALL ? items : items.filter((i) => i.leagueId === league);

  const filteredOpportunities = useMemo(() => {
    if (league === ALL) return data.opportunities;
    return data.opportunities.filter((o) => o.leagueId === league);
  }, [data.opportunities, league]);

  const heroOpp = filteredOpportunities[0] ?? null;

  const tabOffers = useMemo((): TradeOffer[] => {
    const base =
      tab === 'incoming'
        ? data.incomingOffers
        : tab === 'outgoing'
          ? data.outgoingOffers
          : tab === 'completed'
            ? data.completedOffers
            : [];
    return inLeague(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, data, league]);

  const givePicks = useMemo(() => {
    const byLeague = data.ownedPicksByLeague ?? {};
    const lid = activeOpp?.leagueId ?? (league === ALL ? Object.keys(byLeague)[0] : league);
    if (!lid) return Object.values(byLeague).flat();
    return byLeague[lid] ?? [];
  }, [data.ownedPicksByLeague, activeOpp, league]);

  const calcAssets = useMemo(() => {
    if (!activeOpp) return { give: [], get: [], leagueId: '' };
    return calculatorAssetsFromOpportunity(activeOpp);
  }, [activeOpp]);

  const history = useMemo(() => inLeague(data.history), [data.history, league]);

  const handleViewTrade = (opp: TradeOpportunity) => {
    setActiveOpp(opp);
    setPreviewSuggestion(opportunityToSuggestion(opp));
  };

  return (
    <div className="col-start-1 md:col-start-2 row-start-2 flex min-h-0 flex-col overflow-hidden md:grid md:grid-cols-[1fr_310px]">
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-0.5">
          <h1 className="font-figtree text-2xl leading-none tracking-[-1px] text-text md:text-4xl">
            TRADE HUB
          </h1>
          <p className="mt-0.5 font-mono text-[9px] text-muted">
            Find edges. Win trades. Win leagues.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          <button
            type="button"
            onClick={() => setLeague(ALL)}
            className={`shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] ${
              league === ALL
                ? 'border-boom bg-boom/15 text-boom'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            ALL LEAGUES
          </button>
          {data.leagues.map((lg) => (
            <button
              key={lg.id}
              type="button"
              onClick={() => setLeague(lg.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] ${
                league === lg.id
                  ? 'border-boom bg-boom/15 text-boom'
                  : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: lg.dotColor }} />
              <span className="max-w-[120px] truncate">{lg.name}</span>
            </button>
          ))}
        </div>

        <div className="flex overflow-x-auto border-b border-border scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`mb-[-1px] shrink-0 border-b-2 px-4 py-2 font-figtree text-[10px] uppercase tracking-wide ${
                tab === t.id ? 'border-boom text-boom' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === 'overview' || tab === 'suggested') && (
          <>
            {tab === 'overview' ? (
              <>
                <BestTradeHero
                  opportunity={heroOpp}
                  onViewTrade={handleViewTrade}
                  onSendCalculator={(o) => {
                    setActiveOpp(o);
                    setTab('calculator');
                  }}
                />
                <LeagueWinningMoves opportunities={filteredOpportunities} onSelect={handleViewTrade} />
              </>
            ) : null}
            <TradeHubInsightCards
              marketTemperature={data.marketTemperature}
              managerCards={data.managerCards}
            />
            <SuggestedTradesTable
              opportunities={filteredOpportunities}
              leagues={data.leagues}
              onViewTrade={handleViewTrade}
            />
          </>
        )}

        {tab === 'blocks' && (
          <div className="rounded-[10px] border border-border bg-[#0f1420] p-4">
            <div className="mb-3 font-figtree text-[10px] uppercase tracking-[1.5px] text-text">
              Trade Blocks
            </div>
            {data.blockPlayers.length === 0 ? (
              <p className="font-figtree text-[12px] text-muted">No players flagged on the block yet.</p>
            ) : (
              data.blockPlayers.map((p) => (
                <div
                  key={p.playerId}
                  className="flex items-center justify-between border-b border-border/40 py-2 last:border-b-0"
                >
                  <div>
                    <div className="font-figtree text-[12px] text-text">{p.playerName}</div>
                    <div className="font-mono text-[9px] text-muted">
                      {p.position} · {p.ownerName} · {p.leagueName}
                    </div>
                  </div>
                  <span className="rounded bg-bust/15 px-1.5 py-0.5 font-mono text-[8px] uppercase text-bust">
                    {p.verdictLabel}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {(tab === 'incoming' || tab === 'outgoing' || tab === 'completed') && (
          <>
            {tabOffers.length === 0 ? (
              <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center font-figtree text-[11px] text-muted">
                No trades in this category yet.
              </div>
            ) : (
              tabOffers.map((offer) => (
                <TradeOfferCard
                  key={offer.id}
                  offer={offer}
                  active={selectedId === offer.id}
                  onSelect={() => setSelectedId(offer.id)}
                />
              ))
            )}
            <TradeHistoryBox history={history} />
          </>
        )}

        {tab === 'calculator' && (
        <TradeCalculator
          key={activeOpp?.id ?? 'calc'}
          givePicks={givePicks}
          initialGive={calcAssets.give}
          initialGet={calcAssets.get}
        />
        )}

        {tab === 'overview' ? <AdSlot placement="trade-history" showAds={showAds} /> : null}
      </div>

      {previewSuggestion && (
        <TradePreviewModal
          suggestion={previewSuggestion}
          givePicks={givePicks}
          onClose={() => setPreviewSuggestion(null)}
        />
      )}

      <TradeHubRightSidebar
        managerCards={data.managerCards}
        blockPlayers={data.blockPlayers}
        givePicks={givePicks}
        activeOpportunity={activeOpp}
        baseChampionshipOdds={data.stats.championshipOdds}
        onSelectManager={(_m: ManagerTradeCard) => undefined}
      />
    </div>
  );
}
