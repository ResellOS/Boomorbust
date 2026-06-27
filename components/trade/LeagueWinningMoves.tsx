'use client';



import { useCallback, useEffect, useMemo, useState } from 'react';

import CountUpDelta from '@/components/dashboard/CountUpDelta';

import TradePlayerHeadshot from '@/components/trade/TradePlayerHeadshot';

import type { TradeOpportunity } from '@/lib/trade/types';

import { acceptanceColor } from '@/lib/trade/tradeHubUi';



type MoveKind = 'Best Buy Low' | 'Best Sell High' | 'Most Likely Accepted' | 'Highest Impact';



const ROTATE_MS = 7000;



function candidatesForKind(opps: TradeOpportunity[], kind: MoveKind): TradeOpportunity[] {

  switch (kind) {

    case 'Best Buy Low':

      return opps

        .filter((o) => o.type === 'buy_low' || o.type === 'buy_window')

        .sort((a, b) => b.opportunityScore - a.opportunityScore);

    case 'Best Sell High':

      return opps

        .filter((o) => o.type === 'sell_high')

        .sort((a, b) => b.opportunityScore - a.opportunityScore);

    case 'Most Likely Accepted':

      return [...opps].sort((a, b) => b.acceptanceProbability - a.acceptanceProbability);

    case 'Highest Impact':

      return [...opps].sort((a, b) => b.championshipImpact - a.championshipImpact);

    default:

      return [];

  }

}



function buildUniqueCards(opportunities: TradeOpportunity[]): { kind: MoveKind; candidates: TradeOpportunity[] }[] {

  const kinds: MoveKind[] = [

    'Best Buy Low',

    'Best Sell High',

    'Most Likely Accepted',

    'Highest Impact',

  ];

  const usedPlayerIds = new Set<string>();

  const slots: { kind: MoveKind; candidates: TradeOpportunity[] }[] = [];



  for (const kind of kinds) {

    const pool = candidatesForKind(opportunities, kind);

    const unique = pool.filter((o) => !usedPlayerIds.has(o.playerId));

    if (unique.length === 0) continue;

    usedPlayerIds.add(unique[0]!.playerId);

    slots.push({ kind, candidates: unique });

  }



  return slots;

}



export default function LeagueWinningMoves({

  opportunities,

  onSelect,

}: {

  opportunities: TradeOpportunity[];

  onSelect: (opp: TradeOpportunity) => void;

}) {

  const slots = useMemo(() => buildUniqueCards(opportunities), [opportunities]);

  const [offsets, setOffsets] = useState<Record<MoveKind, number>>({

    'Best Buy Low': 0,

    'Best Sell High': 0,

    'Most Likely Accepted': 0,

    'Highest Impact': 0,

  });

  const [paused, setPaused] = useState(false);

  const [visible, setVisible] = useState(true);



  const cards = useMemo(() => {

    return slots.map(({ kind, candidates }) => {

      const idx = offsets[kind] % candidates.length;

      const opp = candidates[idx]!;

      return { kind, opp };

    });

  }, [slots, offsets]);



  const rotate = useCallback(() => {

    setVisible(false);

    window.setTimeout(() => {

      setOffsets((prev) => {

        const next = { ...prev };

        for (const { kind, candidates } of slots) {

          if (candidates.length > 1) {

            next[kind] = (prev[kind] + 1) % candidates.length;

          }

        }

        return next;

      });

      setVisible(true);

    }, 200);

  }, [slots]);



  useEffect(() => {

    const hasRotation = slots.some((s) => s.candidates.length > 1);

    if (!hasRotation || paused) return;

    const iv = window.setInterval(rotate, ROTATE_MS);

    return () => window.clearInterval(iv);

  }, [slots, paused, rotate]);



  if (cards.length === 0) {

    return null;

  }



  return (

    <section onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>

      <div className="mb-2 font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">

        League-Winning Moves

      </div>

      <div

        className={`dash-priority-fade grid grid-cols-1 gap-2 transition-opacity duration-200 sm:grid-cols-2 lg:grid-cols-${Math.min(cards.length, 4)} ${visible ? 'opacity-100' : 'opacity-0'}`}

        style={{ gridTemplateColumns: `repeat(${Math.min(cards.length, 4)}, minmax(0, 1fr))` }}

      >

        {cards.map(({ kind, opp: o }) => {

          const glow = kind === 'Best Sell High' ? 'dash-bust-glow' : 'dash-boom-glow';

          const reason = o.reasonChips[0] ?? o.whyReasons[0] ?? o.portfolioImpactNote;

          return (

            <button

              key={`${kind}-${o.id}`}

              type="button"

              onClick={() => onSelect(o)}

              className={`dash-clickable-card rounded-[10px] border border-[#1e2640] bg-[#0f1420] p-2.5 text-left ${glow}`}

            >

              <div className="font-mono text-[7px] uppercase tracking-wide text-[#6b7a99]">{kind}</div>

              <div className="mt-1.5 flex items-center gap-2">

                <TradePlayerHeadshot playerId={o.playerId} name={o.playerName} size={36} />

                <div className="min-w-0">

                  <div className="truncate font-figtree text-[12px] font-semibold text-[#e8ecf4]">

                    {o.playerName}

                  </div>

                  <div className="font-mono text-[8px] text-[#6b7a99]">{o.leagueName}</div>

                </div>

              </div>

              <div className="mt-1 font-mono text-[8px] uppercase text-boom">{o.actionVerb}</div>

              <div className="mt-1.5 flex gap-3 font-mono text-[9px] tabular-nums">

                <span className="text-boom">

                  <CountUpDelta key={`${o.id}-imp`} value={Math.round(o.championshipImpact * 10) / 10} />% impact

                </span>

                <span style={{ color: acceptanceColor(o.acceptanceProbability) }}>

                  <CountUpDelta key={`${o.id}-acc`} value={o.acceptanceProbability} />% accept

                </span>

              </div>

              <p className="mt-1 line-clamp-2 font-figtree text-[9px] leading-snug text-[#9aa8c4]">{reason}</p>

              <span className="mt-1.5 inline-block font-mono text-[8px] text-boom">View Trade →</span>

            </button>

          );

        })}

      </div>

    </section>

  );

}

