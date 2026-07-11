'use client';



import { useMemo, useState } from 'react';

import CountUpDelta from '@/components/dashboard/CountUpDelta';

import TradePlayerHeadshot from '@/components/trade/TradePlayerHeadshot';

import type { TradeLeague, TradeOpportunity } from '@/lib/trade/types';

import { dedupeSuggestionsByPlayer } from '@/lib/trade/dedupeSuggestions';

import { opportunityToSuggestion } from '@/lib/trade/tradeHubUi';

import {

  acceptanceColor,

  typeBadgeStyle,

  valueGapColor,

} from '@/lib/trade/tradeHubUi';



type TierTab = 'all' | 'smash' | 'high' | 'speculative' | 'long';

export type TradeTypeFilter = 'all' | 'buy' | 'sell';

type QuickChip = 'all' | 'smash' | 'high' | 'buy_low' | 'sell_high' | 'impact';



const DEFAULT_VISIBLE = 12;



const QUICK_CHIPS: { id: QuickChip; label: string }[] = [

  { id: 'smash', label: 'Smart Accepts' },

  { id: 'high', label: 'High Confidence' },

  { id: 'buy_low', label: 'Best Buy Lows' },

  { id: 'sell_high', label: 'Best Sell Highs' },

  { id: 'impact', label: 'Highest Impact' },

];



function tierFilter(tab: TierTab, o: TradeOpportunity): boolean {

  if (tab === 'all') return true;

  if (tab === 'smash') return o.acceptanceProbability >= 80;

  if (tab === 'high') return o.acceptanceProbability >= 70 && (o.tradeConfidence === 'High' || o.tradeConfidence === 'Elite');

  if (tab === 'speculative') return o.acceptanceProbability >= 50 && o.acceptanceProbability < 70;

  return o.acceptanceProbability < 50;

}



function applyQuickChip(chip: QuickChip, rows: TradeOpportunity[]): TradeOpportunity[] {

  switch (chip) {

    case 'smash':

      return rows.filter((o) => o.acceptanceProbability >= 80);

    case 'high':

      return rows.filter(

        (o) => o.acceptanceProbability >= 70 && (o.tradeConfidence === 'High' || o.tradeConfidence === 'Elite'),

      );

    case 'buy_low':

      return rows.filter((o) => o.type === 'buy_low' || o.type === 'buy_window');

    case 'sell_high':

      return rows.filter((o) => o.type === 'sell_high');

    case 'impact':

      return [...rows].sort((a, b) => b.championshipImpact - a.championshipImpact);

    default:

      return rows;

  }

}



export default function TradeDatabase({

  opportunities,

  leagues,

  positionFilter,

  tier: tierProp,

  onTierChange,

  tradeTypeFilter = 'all',

  onRowClick,

}: {

  opportunities: TradeOpportunity[];

  leagues: TradeLeague[];

  positionFilter?: string;

  tier?: TierTab;

  onTierChange?: (tier: TierTab) => void;

  tradeTypeFilter?: TradeTypeFilter;

  onRowClick: (opp: TradeOpportunity) => void;

}) {

  const [tierInternal] = useState<TierTab>('all');

  const tier = tierProp ?? tierInternal;

  const [quickChip, setQuickChip] = useState<QuickChip>('all');

  const [leagueFilter, setLeagueFilter] = useState('all');

  const [expanded, setExpanded] = useState(false);



  const deduped = useMemo(() => {

    const asSuggestions = opportunities.map(opportunityToSuggestion);

    const unique = dedupeSuggestionsByPlayer(asSuggestions);

    const ids = new Set(unique.map((s) => s.playerId));

    return opportunities.filter((o) => ids.has(o.playerId));

  }, [opportunities]);



  const filtered = useMemo(() => {

    let rows = deduped.filter((o) => tierFilter(tier, o));

    if (leagueFilter !== 'all') rows = rows.filter((o) => o.leagueId === leagueFilter);

    if (positionFilter && positionFilter !== 'all') {

      rows = rows.filter((o) => o.position.toUpperCase() === positionFilter);

    }

    if (tradeTypeFilter === 'buy') {

      rows = rows.filter((o) => o.type === 'buy_low' || o.type === 'buy_window');

    } else if (tradeTypeFilter === 'sell') {

      rows = rows.filter((o) => o.type === 'sell_high');

    }

    if (quickChip !== 'all') {

      rows = applyQuickChip(quickChip, rows);

    }

    return [...rows].sort((a, b) => b.opportunityScore - a.opportunityScore);

  }, [deduped, tier, leagueFilter, positionFilter, tradeTypeFilter, quickChip]);



  const visibleRows = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);



  if (deduped.length === 0) {

    return (

      <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-4 py-6 text-center font-figtree text-[13px] text-[#6b7a99]">

        No trades in database yet — market signals populate after sync.

      </section>

    );

  }



  return (

    <section id="trade-database" className="opacity-95">

      <div className="mb-1 flex flex-wrap items-end justify-between gap-2">

        <div>

          <h3 className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">Trade Database</h3>

          <p className="font-mono text-[9px] text-[#6b7a99]">

            {filtered.length} opportunities · expand for full list

          </p>

        </div>

        <select

          value={leagueFilter}

          onChange={(e) => setLeagueFilter(e.target.value)}

          className="rounded border border-[#1e2640] bg-[#0f1420] px-2 py-0.5 font-mono text-[9px] text-[#e8ecf4]"

        >

          <option value="all">All Leagues</option>

          {leagues.map((l) => (

            <option key={l.id} value={l.id}>

              {l.name}

            </option>

          ))}

        </select>

      </div>



      <div className="mb-2 flex flex-wrap gap-1">

        <button

          type="button"

          onClick={() => setQuickChip('all')}

          className={`rounded border px-2 py-0.5 font-mono text-[9px] ${

            quickChip === 'all'

              ? 'border-boom/40 bg-boom/10 text-boom'

              : 'border-[#1e2640] text-[#6b7a99] hover:text-[#e8ecf4]'

          }`}

        >

          All

        </button>

        {QUICK_CHIPS.map((c) => (

          <button

            key={c.id}

            type="button"

            onClick={() => {

              setQuickChip(c.id);

              if (c.id === 'smash') onTierChange?.('smash');

              else if (c.id === 'high') onTierChange?.('high');

            }}

            className={`rounded border px-2 py-0.5 font-mono text-[9px] ${

              quickChip === c.id

                ? 'border-boom/40 bg-boom/10 text-boom'

                : 'border-[#1e2640] text-[#6b7a99] hover:text-[#e8ecf4]'

            }`}

          >

            {c.label}

          </button>

        ))}

      </div>



      <div className="overflow-x-auto rounded-[10px] border border-[#1e2640] bg-[#0f1420]">

        <table className="w-full min-w-[960px] border-collapse text-left">

          <thead>

            <tr className="border-b border-[#1e2640] font-mono text-[8px] uppercase tracking-wide text-[#6b7a99]">

              <th className="sticky left-0 z-10 bg-[#0f1420] px-2 py-2">Target</th>

              <th className="px-2 py-2">You Send</th>

              <th className="px-2 py-2">They Get</th>

              <th className="px-2 py-2">League / Manager</th>

              <th className="px-2 py-2">Action</th>

              <th className="px-2 py-2">Rank Δ</th>

              <th className="px-2 py-2">Accept</th>

              <th className="px-2 py-2">Impact</th>

              <th className="px-2 py-2">Why</th>

            </tr>

          </thead>

          <tbody>

            {visibleRows.map((o, idx) => {

              const badge = typeBadgeStyle(o.type);

              const delta = o.valueGap ?? (o.marketRank != null && o.bobRank != null ? Math.abs(o.marketRank - o.bobRank) : null);

              const deltaSigned = o.type === 'sell_high' ? -(delta ?? 0) : (delta ?? 0);

              const isTop = idx < 3;

              return (

                <tr

                  key={o.id}

                  onClick={() => onRowClick(o)}

                  className={`dash-clickable-row cursor-pointer border-b border-[#1e2640]/40 last:border-b-0 ${

                    isTop ? 'dash-boom-glow' : ''

                  }`}

                  style={isTop ? { borderLeft: '2px solid #36E7A1' } : undefined}

                >

                  <td className="sticky left-0 z-10 bg-[#0f1420] px-2 py-2">

                    <div className="flex items-center gap-1.5">

                      <TradePlayerHeadshot playerId={o.playerId} name={o.playerName} size={28} />

                      <div>

                        <div className="font-figtree text-[12px] text-[#e8ecf4]">{o.playerName}</div>

                        <div className="font-mono text-[9px] text-[#6b7a99]">

                          BOB #{o.bobRank ?? '—'} · Mkt #{o.marketRank ?? '—'}

                        </div>

                      </div>

                    </div>

                  </td>

                  <td className="px-2 py-2 font-figtree text-[10px] text-[#9aa8c4]">

                    {o.givePlayerName}

                    {o.suggestedPrice ? ` + ${o.suggestedPrice}` : ''}

                  </td>

                  <td className="px-2 py-2 font-figtree text-[10px] text-boom">{o.getPlayerName}</td>

                  <td className="px-2 py-2 font-figtree text-[10px] text-[#8b9bb8]">

                    {o.leagueName}

                    <br />

                    {o.managerName}

                  </td>

                  <td className="px-2 py-2">

                    <span

                      className="rounded px-1 py-px font-mono text-[8px] uppercase"

                      style={{ color: badge.color, background: badge.bg }}

                    >

                      {badge.label}

                    </span>

                  </td>

                  <td className="px-2 py-2 font-mono text-[12px] font-semibold tabular-nums">

                    {delta != null ? (

                      <CountUpDelta value={deltaSigned} style={{ color: valueGapColor(delta, o.type) }} />

                    ) : (

                      '—'

                    )}

                  </td>

                  <td

                    className="px-2 py-2 font-mono text-[11px] tabular-nums"

                    style={{ color: acceptanceColor(o.acceptanceProbability) }}

                  >

                    {o.acceptanceProbability}%

                  </td>

                  <td className="px-2 py-2 font-mono text-[11px] tabular-nums text-boom">

                    +{o.championshipImpact.toFixed(1)}%

                  </td>

                  <td className="max-w-[140px] truncate px-2 py-2 font-figtree text-[10px] text-[#8b9bb8]">

                    {o.whyReasons[0] ?? o.reasonChips[0] ?? '—'}

                  </td>

                </tr>

              );

            })}

          </tbody>

        </table>

      </div>



      {filtered.length > DEFAULT_VISIBLE ? (

        <button

          type="button"

          onClick={() => setExpanded((v) => !v)}

          className="mt-2 font-mono text-[10px] text-boom hover:underline"

        >

          {expanded ? 'Show Fewer Trades ↑' : `View All Trades → (${filtered.length})`}

        </button>

      ) : null}

    </section>

  );

}

