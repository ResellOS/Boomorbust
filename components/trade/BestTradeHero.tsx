'use client';



import { useState } from 'react';

import Image from 'next/image';

import type { TradeOpportunity } from '@/lib/trade/types';

import {

  acceptanceColor,

  acceptanceGlow,

  calculatorAssetsFromOpportunity,

  confidenceBadgeStyle,

} from '@/lib/trade/tradeHubUi';



function PlayerHeadshot({ playerId, name }: { playerId: string; name: string }) {

  const [failed, setFailed] = useState(false);

  return (

    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#1e2640] bg-[#141929]">

      {!failed ? (

        <Image

          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}

          alt={name}

          width={80}

          height={80}

          unoptimized

          className="h-full w-full object-cover"

          onError={() => setFailed(true)}

        />

      ) : (

        <span className="flex h-full items-center justify-center font-mono text-xs text-muted">

          {name.slice(0, 2).toUpperCase()}

        </span>

      )}

    </div>

  );

}



function ReasonChip({ label }: { label: string }) {

  return (

    <span className="inline-flex items-center gap-1 rounded-full border border-[#1e2640] bg-[#141929]/80 px-2 py-0.5 font-figtree text-[10px] text-[#e8ecf4]">

      <span className="text-boom">✓</span>

      {label}

    </span>

  );

}



export default function BestTradeHero({

  opportunity,

  onViewTrade,

  onSendCalculator,

}: {

  opportunity: TradeOpportunity | null;

  onViewTrade: (opp: TradeOpportunity) => void;

  onSendCalculator: (opp: TradeOpportunity) => void;

}) {

  if (!opportunity) {

    return (

      <section className="rounded-[10px] border border-dashed border-[#1e2640] bg-[#0f1420] px-5 py-8 text-center">

        <p className="font-figtree text-[13px] text-[#6b7a99]">

          No ranked trade opportunities yet — sync leagues and wait for BOB intelligence.

        </p>

      </section>

    );

  }



  const o = opportunity;

  const acceptColor = acceptanceColor(o.acceptanceProbability);

  const confStyle = confidenceBadgeStyle(o.tradeConfidence);

  const chips = o.reasonChips.length > 0 ? o.reasonChips : o.whyReasons;



  return (

    <section

      className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] p-4 md:p-5"

      style={{ borderLeft: '4px solid #36E7A1', boxShadow: '0 0 24px rgba(54,231,161,0.08)' }}

    >

      <div className="mb-3 font-figtree text-[10px] uppercase tracking-[1.5px] text-[#6b7a99]">

        Best Trade Available Right Now

      </div>



      <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto]">

        <div className="flex gap-3">

          <PlayerHeadshot playerId={o.playerId} name={o.playerName} />

          <div>

            <div className="font-figtree text-xl text-[#e8ecf4] md:text-2xl">{o.playerName}</div>

            <div className="font-mono text-[10px] text-[#6b7a99]">

              {o.position} · {o.team}

            </div>

            <div className="mt-1 font-mono text-[10px] tabular-nums text-[#6b7a99]">

              BOB Rank: <span className="text-boom">{o.bobRank ?? '—'}</span> · Market Rank:{' '}

              <span className="text-[#e8ecf4]">{o.marketRank ?? '—'}</span>

            </div>

          </div>

        </div>



        <div className="min-w-0">

          <div className="font-mono text-[9px] uppercase text-[#6b7a99]">League: {o.leagueName}</div>

          <div className="font-mono text-[9px] uppercase text-[#6b7a99]">Owner: {o.managerName}</div>



          <div className="mt-3 font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">

            Why This Works

          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5">

            {chips.slice(0, 5).map((c) => (

              <ReasonChip key={c} label={c} />

            ))}

          </div>

        </div>



        <div className="space-y-3 lg:min-w-[240px]">

          <div className="rounded-[8px] border border-[#1e2640] bg-[#0a0d14] px-3 py-2">

            <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">

              Suggested Offer

            </div>

            <div className="mt-1 font-figtree text-[11px] text-[#e8ecf4]">

              Give: {o.givePlayerName}

              {o.suggestedAddOn ? ` + ${o.suggestedAddOn}` : ''}

            </div>

            <div className="font-figtree text-[11px] text-boom">Get: {o.getPlayerName}</div>

          </div>



          <div className="font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">

            Expected Outcome

          </div>

          <div className="grid grid-cols-2 gap-2">

            <OutcomeStat label="Trade Value Gain" value={`+${o.tfoDelta.toFixed(0)} TFO`} />

            <OutcomeStat label="Championship Impact" value={`+${o.championshipImpact.toFixed(1)}%`} accent />

            <div className="col-span-2">

              <div className="flex items-end justify-between gap-2">

                <div>

                  <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Acceptance Probability</div>

                  <div

                    className="font-mono text-2xl tabular-nums"

                    style={{ color: acceptColor, textShadow: acceptanceGlow(o.acceptanceProbability) }}

                  >

                    {o.acceptanceProbability}%

                  </div>

                </div>

                <span

                  className="rounded px-2 py-1 font-mono text-[9px] uppercase tracking-wide"

                  style={{ background: confStyle.bg, color: confStyle.text }}

                >

                  {o.tradeConfidence}

                </span>

              </div>

            </div>

            <div className="col-span-2 rounded-[8px] border border-boom/25 bg-boom/5 px-3 py-2">

              <div className="font-mono text-[7px] uppercase text-[#6b7a99]">Portfolio Impact</div>

              <div className="font-mono text-xl tabular-nums text-boom">

                {o.portfolioImpactScore}{' '}

                <span className="text-sm text-[#6b7a99]">/ 100</span>

              </div>

              <p className="mt-0.5 font-figtree text-[10px] leading-snug text-[#6b7a99]">

                {o.portfolioImpactNote}

              </p>

            </div>

          </div>

        </div>

      </div>



      <div className="mt-4 flex flex-wrap gap-2">

        <button

          type="button"

          onClick={() => onViewTrade(o)}

          className="rounded-[6px] border border-boom/40 bg-boom px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-[#0a0d14] hover:brightness-110"

        >

          View Trade Package

        </button>

        <button

          type="button"

          onClick={() => onSendCalculator(o)}

          className="rounded-[6px] border border-[#1e2640] px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-[#e8ecf4] hover:bg-white/[0.03]"

        >

          Send to Calculator

        </button>

      </div>

    </section>

  );

}



function OutcomeStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {

  return (

    <div className="rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-2 py-1.5">

      <div className="font-mono text-[7px] uppercase text-[#6b7a99]">{label}</div>

      <div className={`font-mono text-[11px] tabular-nums ${accent ? 'text-boom' : 'text-[#e8ecf4]'}`}>

        {value}

      </div>

    </div>

  );

}



export { calculatorAssetsFromOpportunity };


