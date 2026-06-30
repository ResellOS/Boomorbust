'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { TradeLeague, TradeOpportunity } from '@/lib/trade/types';
import { dedupeSuggestionsByPlayer } from '@/lib/trade/dedupeSuggestions';
import { opportunityToSuggestion } from '@/lib/trade/tradeHubUi';
import {
  acceptanceColor,
  acceptanceGlow,
  mutualBenefitColor,
  typeBadgeStyle,
  valueGapColor,
} from '@/lib/trade/tradeHubUi';

function PlayerThumb({ playerId, name }: { playerId: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-surface2">
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={name}
          width={32}
          height={32}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full items-center justify-center font-mono text-[9px] text-muted">
          {name.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

function MutualBadge({ score }: { score: number }) {
  const color = mutualBenefitColor(score);
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-full border font-mono text-[11px] tabular-nums"
      style={{ borderColor: `${color}66`, color, background: `${color}14` }}
    >
      {score}
    </div>
  );
}

type SortKey = 'opportunity' | 'gap' | 'acceptance';

export default function SuggestedTradesTable({
  opportunities,
  leagues,
  onViewTrade,
}: {
  opportunities: TradeOpportunity[];
  leagues: TradeLeague[];
  onViewTrade: (opp: TradeOpportunity) => void;
}) {
  const [leagueFilter, setLeagueFilter] = useState('all');
  const [posFilter, setPosFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('opportunity');

  const deduped = useMemo(() => {
    const asSuggestions = opportunities.map(opportunityToSuggestion);
    const unique = dedupeSuggestionsByPlayer(asSuggestions);
    const ids = new Set(unique.map((s) => s.playerId));
    return opportunities.filter((o) => ids.has(o.playerId));
  }, [opportunities]);

  const filtered = useMemo(() => {
    let rows = deduped;
    if (leagueFilter !== 'all') rows = rows.filter((o) => o.leagueId === leagueFilter);
    if (posFilter !== 'all') rows = rows.filter((o) => o.position.toUpperCase() === posFilter);
    if (typeFilter !== 'all') rows = rows.filter((o) => o.type === typeFilter);

    return [...rows].sort((a, b) => {
      if (sort === 'gap') return (b.valueGap ?? 0) - (a.valueGap ?? 0);
      if (sort === 'acceptance') return b.acceptanceProbability - a.acceptanceProbability;
      return b.opportunityScore - a.opportunityScore;
    });
  }, [deduped, leagueFilter, posFilter, typeFilter, sort]);

  if (deduped.length === 0) {
    return (
      <section className="rounded-[10px] border border-border bg-[#0f1420] px-4 py-6 text-center font-figtree text-[13px] text-muted">
        No suggested trades yet — market signals populate after sync.
      </section>
    );
  }

  return (
    <section>
      <div className="mb-2 font-figtree text-[11px] uppercase tracking-[1.5px] text-text">
        Suggested Trades
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <FilterSelect value={leagueFilter} onChange={setLeagueFilter} label="All Leagues">
          <option value="all">All Leagues</option>
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={posFilter} onChange={setPosFilter} label="All Positions">
          {['all', 'QB', 'RB', 'WR', 'TE'].map((p) => (
            <option key={p} value={p}>
              {p === 'all' ? 'All Positions' : p}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={typeFilter} onChange={setTypeFilter} label="Type">
          {[
            ['all', 'All Types'],
            ['buy_low', 'Buy Low'],
            ['buy_window', 'Buy Window'],
            ['sell_high', 'Sell High'],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={sort} onChange={(v) => setSort(v as SortKey)} label="Sort">
          <option value="opportunity">Sort: Opportunity</option>
          <option value="gap">Sort: Value Gap</option>
          <option value="acceptance">Sort: Acceptance</option>
        </FilterSelect>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-border bg-[#0f1420]">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-b border-border font-mono text-[9px] uppercase tracking-wide text-muted">
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">League/Owner</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">BOB Rank</th>
              <th className="px-3 py-2">Market Rank</th>
              <th className="px-3 py-2">Value Gap</th>
              <th className="px-3 py-2">Suggested Price</th>
              <th className="px-3 py-2">Acceptance</th>
              <th className="px-3 py-2">Mutual Benefit</th>
              <th className="px-3 py-2">Champ Impact</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((o, rowIdx) => {
              const badge = typeBadgeStyle(o.type);
              const isTop = rowIdx < 3 && sort === 'opportunity';
              const gapColor = valueGapColor(o.valueGap, o.type);
              return (
                <tr
                  key={o.id}
                  className="border-b border-[#1e2640]/40 last:border-b-0"
                  style={
                    isTop
                      ? { background: 'rgba(54,231,161,0.04)', borderLeft: '3px solid #36E7A1' }
                      : undefined
                  }
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <PlayerThumb playerId={o.playerId} name={o.playerName} />
                      <div>
                        <div className="font-figtree text-[13px] text-text">{o.playerName}</div>
                        <div className="font-mono text-[10px] text-muted">
                          {o.position} · {o.team}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-figtree text-[11px] text-muted">
                    {o.leagueName}
                    <br />
                    {o.managerName}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-1.5 py-0.5 font-mono text-[9px] uppercase"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums text-text">
                    {o.bobRank ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums text-text">
                    {o.marketRank ?? '—'}
                  </td>
                  <td
                    className="px-3 py-2 font-mono text-[12px] tabular-nums"
                    style={{ color: gapColor }}
                  >
                    {o.valueGap != null ? (o.type === 'sell_high' ? '-' : '+') + o.valueGap : '—'}
                  </td>
                  <td className="px-3 py-2 font-figtree text-[11px] text-muted">{o.suggestedPrice}</td>
                  <td
                    className="px-3 py-2 font-mono text-[12px] tabular-nums"
                    style={{
                      color: acceptanceColor(o.acceptanceProbability),
                      textShadow: acceptanceGlow(o.acceptanceProbability),
                    }}
                  >
                    {o.acceptanceProbability}%
                  </td>
                  <td className="px-3 py-2">
                    <MutualBadge score={o.mutualBenefitScore} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[12px] tabular-nums text-boom">
                    +{o.championshipImpact.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onViewTrade(o)}
                      className="font-mono text-[10px] text-boom hover:underline"
                    >
                      View Trade
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-border bg-bg px-2 py-1 font-mono text-[10px] text-text outline-none"
    >
      {children}
    </select>
  );
}
