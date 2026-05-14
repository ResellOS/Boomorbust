'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type TradeOfferSelectionValue = {
  selectedOfferId: string | null;
  setSelectedOfferId: (id: string | null) => void;
};

const TradeOfferSelectionContext = createContext<TradeOfferSelectionValue | null>(null);

export function TradeOfferSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedOfferId, setSelectedOfferIdState] = useState<string | null>(null);

  const setSelectedOfferId = useCallback((id: string | null) => {
    setSelectedOfferIdState(id);
  }, []);

  const value = useMemo(
    () => ({ selectedOfferId, setSelectedOfferId }),
    [selectedOfferId, setSelectedOfferId],
  );

  return <TradeOfferSelectionContext.Provider value={value}>{children}</TradeOfferSelectionContext.Provider>;
}

export function useTradeOfferSelection(): TradeOfferSelectionValue {
  const ctx = useContext(TradeOfferSelectionContext);
  if (!ctx) {
    return {
      selectedOfferId: null,
      setSelectedOfferId: () => {},
    };
  }
  return ctx;
}
