'use client';



import { useCallback, useEffect, useState } from 'react';

import type { ManagerTradeCard, OwnedPick, TradeOpportunity } from '@/lib/trade/types';

import { pushStagedTrade } from '@/lib/dashboard/stagedTradesQueue';

import TradeCalculator, { type CalculatorAsset } from '@/components/trade/TradeCalculator';

import {

  acceptanceColor,

  calculatorAssetsFromOpportunity,

  interpretTradePackage,

  whyItWorks,

  type TradeValueTotals,

} from '@/lib/trade/tradeHubUi';

import CountUpDelta from '@/components/dashboard/CountUpDelta';



export default function TradeStagingArea({

  activeOpportunity,

  givePicks,

  selectedManager,

  onStaged,

}: {

  activeOpportunity: TradeOpportunity | null;

  givePicks: OwnedPick[];

  selectedManager: ManagerTradeCard | null;

  onStaged?: () => void;

}) {

  const [stagedPulse, setStagedPulse] = useState(false);

  const [offerStaged, setOfferStaged] = useState(false);

  const [totals, setTotals] = useState<TradeValueTotals | null>(null);



  const calcState = activeOpportunity

    ? calculatorAssetsFromOpportunity(activeOpportunity)

    : { give: [] as CalculatorAsset[], get: [] as CalculatorAsset[], leagueId: '' };



  useEffect(() => {

    setStagedPulse(false);

    setOfferStaged(false);

    setTotals(null);

  }, [activeOpportunity?.id]);



  const handleTotalsChange = useCallback((t: TradeValueTotals) => {

    setTotals(t);

  }, []);



  const handleStage = () => {

    if (!activeOpportunity) return;

    pushStagedTrade(activeOpportunity);

    setOfferStaged(true);

    setStagedPulse(true);

    onStaged?.();

    window.setTimeout(() => setStagedPulse(false), 2400);

  };



  const acceptPct = activeOpportunity?.acceptanceProbability ?? 0;

  const interpretation = interpretTradePackage(totals, activeOpportunity);

  const worksBecause = whyItWorks(activeOpportunity, interpretation);

  const mgrInterest = selectedManager?.tradeLikelihood ?? acceptPct;



  return (

    <section

      className={`flex h-full flex-col overflow-hidden rounded-[10px] border bg-[#0f1420] ${

        stagedPulse ? 'border-boom/50 dash-boom-glow animate-pulse' : 'border-[#1e2640]'

      }`}

    >

      <div className="border-b border-[#1e2640]/80 px-3 py-2">

        <h3 className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">

          Offer Builder

        </h3>

        <p className="font-mono text-[9px] text-[#6b7a99]">Review package before Command Queue</p>

      </div>



      {!activeOpportunity ? (

        <div className="flex flex-1 items-center justify-center px-4 py-8 text-center">

          <p className="font-figtree text-[12px] text-[#6b7a99]">

            Click any trade card or database row to build an offer.

          </p>

        </div>

      ) : (

        <>

          <div className="space-y-2 px-3 py-2">

            <Side label="YOU GET" items={calcState.get} accent />

            <Side label="YOU GIVE" items={calcState.give} />

          </div>



          <div

            className="mx-3 rounded-md border px-2.5 py-2"

            style={{ borderColor: `${interpretation.color}44`, background: `${interpretation.color}10` }}

          >

            <div className="font-figtree text-[12px] font-semibold" style={{ color: interpretation.color }}>

              {interpretation.label}

            </div>

            <p className="mt-0.5 font-figtree text-[10px] leading-snug text-[#9aa8c4]">{interpretation.detail}</p>

          </div>



          <div className="mx-3 mt-2 rounded border border-[#1e2640]/50 bg-[#141929]/40 px-2 py-1.5">

            <div className="font-mono text-[8px] uppercase text-boom">Why It Works</div>

            <p className="mt-0.5 font-figtree text-[10px] leading-snug text-[#b8c4dc]">{worksBecause}</p>

          </div>



          <div className="border-t border-[#1e2640]/60 px-3 py-2">

            <div className="font-mono text-[8px] uppercase text-[#6b7a99]">Deal Metrics</div>

            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[9px]">

              <Row label="Acceptance">

                <CountUpDelta key={`${activeOpportunity.id}-acc`} value={acceptPct} style={{ color: acceptanceColor(acceptPct) }} />%

              </Row>

              <Row label="Impact">

                <span className="text-boom">+{activeOpportunity.championshipImpact.toFixed(1)}%</span>

              </Row>

              <Row label="Fairness">

                <span className="text-[#e8ecf4]">{activeOpportunity.mutualBenefitScore}/100</span>

              </Row>

              <Row label="Mgr Interest">

                <span className="text-boom">{mgrInterest}%</span>

              </Row>

            </div>

          </div>



          <div className="flex-1 min-h-0 max-h-[200px] overflow-hidden px-1 pb-1">

            <TradeCalculator

              key={activeOpportunity.id}

              givePicks={givePicks}

              initialGive={calcState.give}

              initialGet={calcState.get}

              embedded

              onTotalsChange={handleTotalsChange}

            />

          </div>



          <div className="flex flex-col gap-1.5 border-t border-[#1e2640]/60 px-3 py-2">

            {offerStaged ? (

              <div className="rounded border border-boom/40 bg-boom/10 px-2 py-1.5 text-center">

                <div className="font-mono text-[11px] font-semibold text-boom">Offer Staged</div>

                <div className="font-mono text-[9px] text-boom/80">Added to Command Queue</div>

              </div>

            ) : null}

            <button

              type="button"

              onClick={handleStage}

              disabled={offerStaged}

              className={`dash-action-btn w-full rounded-md py-2 font-mono text-[11px] font-semibold uppercase text-white ${

                offerStaged ? 'bg-boom/30' : 'bg-bust'

              }`}

            >

              {offerStaged ? 'Offer Staged ✓' : 'Stage Offer'}

            </button>

          </div>

        </>

      )}

    </section>

  );

}



function Side({ label, items, accent }: { label: string; items: CalculatorAsset[]; accent?: boolean }) {

  return (

    <div className="rounded-md border border-[#1e2640]/50 bg-[#141929]/40 px-2 py-1.5">

      <div className="font-mono text-[8px] uppercase text-[#6b7a99]">{label}</div>

      {items.length === 0 ? (

        <div className="font-figtree text-[11px] text-[#6b7a99]">—</div>

      ) : (

        items.map((a) => (

          <div key={a.key} className={`font-figtree text-[11px] ${accent ? 'text-boom' : 'text-[#e8ecf4]'}`}>

            · {a.label}

          </div>

        ))

      )}

    </div>

  );

}



function Row({ label, children }: { label: string; children: React.ReactNode }) {

  return (

    <div className="flex justify-between gap-1">

      <span className="text-[#6b7a99]">{label}</span>

      {children}

    </div>

  );

}

