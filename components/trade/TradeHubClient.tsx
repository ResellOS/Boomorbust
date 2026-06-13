'use client';

import { useMemo, useState } from 'react';
import type { TradeOffer, TradePageData } from '@/lib/trade/types';
import TradeOfferCard from '@/components/trade/TradeOfferCard';
import TradeSuggestions from '@/components/trade/TradeSuggestions';
import TradeHistoryBox from '@/components/trade/TradeHistoryBox';
import SmartCounterPanel from '@/components/trade/SmartCounterPanel';

type TabId = 'incoming' | 'outgoing' | 'completed' | 'waiver';

const TABS: { id: TabId; label: string }[] = [
  { id: 'incoming', label: 'Incoming' },
  { id: 'outgoing', label: 'Outgoing' },
  { id: 'completed', label: 'Completed' },
  { id: 'waiver', label: 'Waiver' },
];

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
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOfferId ??
      data.incomingOffers.find((o) =>
        initialTargetPlayerId
          ? o.offeredPlayerIds?.includes(initialTargetPlayerId)
          : false,
      )?.id ??
      data.incomingOffers[0]?.id ??
      null,
  );

  const tabOffers = useMemo((): TradeOffer[] => {
    switch (tab) {
      case 'incoming':
        return data.incomingOffers;
      case 'outgoing':
        return data.outgoingOffers;
      case 'completed':
        return data.completedOffers;
      case 'waiver':
        return [];
      default:
        return data.incomingOffers;
    }
  }, [tab, data]);

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
          <p className="mt-0.5 font-mono text-[9px] text-muted">
            All trades. All leagues. One hub.
          </p>
        </div>

        <div className="mb-3 flex border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`mb-[-1px] border-b-2 px-5 py-2 font-figtree text-[11px] font-semibold uppercase tracking-wide transition-colors ${
                tab === t.id
                  ? 'border-boom text-boom'
                  : 'border-transparent text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
              {tab === 'incoming' ? 'All Incoming Offers' : `${TABS.find((x) => x.id === tab)?.label} Trades`}
            </span>
            {tabOffers.length > 0 ? (
              <span className="font-mono text-[9px] text-boom">
                View All {tabOffers.length} →
              </span>
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
          <TradeSuggestions suggestions={data.suggestions} />
          <TradeHistoryBox history={data.history} />
        </div>
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
