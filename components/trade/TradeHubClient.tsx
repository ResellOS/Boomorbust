'use client';

import { useMemo, useState } from 'react';
import type { TradeOffer, TradePageData } from '@/lib/trade/types';
import TradeOfferCard from '@/components/trade/TradeOfferCard';
import TradeSuggestions from '@/components/trade/TradeSuggestions';
import TradeHistoryBox from '@/components/trade/TradeHistoryBox';
import TradeCalculator from '@/components/trade/TradeCalculator';
import SmartCounterPanel from '@/components/trade/SmartCounterPanel';

type TabId = 'incoming' | 'outgoing' | 'completed' | 'waiver' | 'calculator';

const TABS: { id: TabId; label: string }[] = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'waiver', label: 'Waiver' },
  { id: 'calculator', label: 'Calculator' },
];

const ALL = 'all';

interface TradeHubClientProps {
  data: TradePageData;
  initialTargetPlayerId?: string;
  initialLeagueId?: string;
  initialOfferId?: string;
}

export default function TradeHubClient({
  data,
  initialTargetPlayerId,
  initialLeagueId,
  initialOfferId,
}: TradeHubClientProps) {
  const [tab, setTab] = useState<TabId>('incoming');
  const [league, setLeague] = useState<string>(initialLeagueId ?? ALL);
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const suggestions = useMemo(() => inLeague(data.suggestions).slice(0, 6), [data.suggestions, league]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => inLeague(data.history), [data.history, league]);

  // Give-side picks: the selected league's owned picks, or all leagues combined.
  const givePicks = useMemo(() => {
    const byLeague = data.ownedPicksByLeague ?? {};
    if (league === ALL) return Object.values(byLeague).flat();
    return byLeague[league] ?? [];
  }, [data.ownedPicksByLeague, league]);

  const selected = useMemo(() => {
    const list = data.incomingOffers.length ? data.incomingOffers : tabOffers;
    return list.find((o) => o.id === selectedId) ?? list[0] ?? null;
  }, [data.incomingOffers, tabOffers, selectedId]);

  return (
    <div
      className="row-start-2 min-h-0 overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: '1fr 310px' }}
    >
      <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-4 py-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="mb-0.5">
          <h1 className="font-figtree text-4xl font-extrabold leading-none tracking-[-1px] text-text">
            TRADE HUB
          </h1>
          <p className="mt-0.5 font-mono text-[9px] text-muted">All trades. All leagues. One hub.</p>
        </div>

        {/* League selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setLeague(ALL)}
            className={`shrink-0 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] transition-colors ${
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
              title={lg.name}
              className={`flex shrink-0 items-center gap-1.5 rounded-[6px] border px-3 py-1.5 font-figtree text-[11px] transition-colors ${
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

        {/* Tabs */}
        <div className="mb-1 flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`mb-[-1px] border-b-2 px-5 py-2 font-figtree text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                tab === t.id ? 'border-boom text-boom' : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calculator' ? (
          <TradeCalculator givePicks={givePicks} />
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
                  {tab === 'incoming'
                    ? 'All Incoming Offers'
                    : `${TABS.find((x) => x.id === tab)?.label} Trades`}
                </span>
                {tabOffers.length > 0 ? (
                  <span className="font-mono text-[9px] text-boom">View All {tabOffers.length} →</span>
                ) : null}
              </div>
              {tabOffers.length === 0 ? (
                <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center font-figtree text-[11px] text-muted">
                  {tab === 'waiver'
                    ? 'Waiver wire trade activity will appear here.'
                    : 'No trades in this category yet.'}
                </div>
              ) : (
                tabOffers.map((offer) => (
                  <TradeOfferCard
                    key={offer.id}
                    offer={offer}
                    active={selected?.id === offer.id}
                    onSelect={() => setSelectedId(offer.id)}
                  />
                ))
              )}
            </div>

            <div className="grid min-h-0 flex-1 gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <TradeSuggestions suggestions={suggestions} />
              <TradeHistoryBox history={history} />
            </div>
          </>
        )}
      </div>

      <SmartCounterPanel
        offeredPlayerIds={
          initialTargetPlayerId
            ? [initialTargetPlayerId]
            : selected?.offeredPlayerIds ?? data.selectedOfferDefaults?.offeredPlayerIds ?? []
        }
        yourPlayerIds={selected?.yourPlayerIds ?? data.selectedOfferDefaults?.yourPlayerIds ?? []}
        leagueId={initialLeagueId ?? selected?.leagueId ?? data.selectedOfferDefaults?.leagueId ?? ''}
        offerId={selected?.id ?? null}
      />
    </div>
  );
}
