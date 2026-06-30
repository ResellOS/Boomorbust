'use client';

import Link from 'next/link';
import IncomingOffersPanel from '@/components/trade-hub/IncomingOffersPanel';
import { TradeOfferSelectionProvider } from '@/components/trade-hub/TradeOfferSelectionContext';

export default function TradeHubOffersPage() {
  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col bg-[#0a0d14]">
      <div className="mx-auto flex w-full max-w-[960px] flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/trade-hub"
            className="text-[14px] text-[#22D3EE] hover:underline"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            ← Trade Hub
          </Link>
        </div>
        <header className="mb-1">
          <h1
            className="text-[22px] font-bold leading-tight text-white sm:text-[26px]"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
          >
            All incoming offers
          </h1>
          <p className="mt-1 text-[14px] text-[#64748B]" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
            Same feed as Trade Hub — full list for your account.
          </p>
        </header>
        <TradeOfferSelectionProvider>
          <IncomingOffersPanel hideViewAllLink />
        </TradeOfferSelectionProvider>
      </div>
    </div>
  );
}
