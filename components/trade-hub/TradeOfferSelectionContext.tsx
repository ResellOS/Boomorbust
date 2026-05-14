'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { IncomingOfferApi } from './types';

export type TradeOfferSelectionValue = {
  selectedOffer: IncomingOfferApi | null;
  setSelectedOffer: (offer: IncomingOfferApi | null) => void;
  /** Convenience for keyed rendering / logs. */
  selectedOfferId: string | null;
};

const TradeOfferSelectionContext = createContext<TradeOfferSelectionValue | null>(null);

export function TradeOfferSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedOffer, setSelectedOfferState] = useState<IncomingOfferApi | null>(null);

  const setSelectedOffer = useCallback((offer: IncomingOfferApi | null) => {
    setSelectedOfferState(offer);
  }, []);

  const value = useMemo(
    () => ({
      selectedOffer,
      setSelectedOffer,
      selectedOfferId: selectedOffer?.id ?? null,
    }),
    [selectedOffer, setSelectedOffer],
  );

  return <TradeOfferSelectionContext.Provider value={value}>{children}</TradeOfferSelectionContext.Provider>;
}

export function useTradeOfferSelection(): TradeOfferSelectionValue {
  const ctx = useContext(TradeOfferSelectionContext);
  if (!ctx) {
    return {
      selectedOffer: null,
      setSelectedOffer: () => {},
      selectedOfferId: null,
    };
  }
  return ctx;
}
