'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type { HubPlayer, PlayerHubPortfolio } from '@/lib/players/types';
import type { TradeOpportunity } from '@/lib/trade/types';
import {
  findSimilarPlayers,
  isBoomVerdict,
  isBustVerdict,
  isHoldVerdict,
} from '@/lib/players/utils';
import { getGradeLabel } from '@/lib/verdict';
import { FILTER_VERDICT_LABELS } from '@/lib/ui/labels';

// Market verdict color (5-color) for a player; neutral gray when no signal.
function mvColor(p: HubPlayer): string {
  return p.marketVerdict && !p.marketVerdict.noMarketData ? p.marketVerdict.color : '#6b7a99';
}
import PlayerAvatar from './PlayerAvatar';
import PlayerDetailPanel from './PlayerDetailPanel';
import AdSlot from '@/components/ads/AdSlot';

const PAGE_SIZE = 25;

type FilterKey = 'ALL' | 'BOOM' | 'HOLD' | 'BUST' | 'QB' | 'RB' | 'WR' | 'TE';
type SortKey = 'rating' | 'name' | 'position';

const VERDICT_FILTERS: FilterKey[] = ['ALL', 'BOOM', 'HOLD', 'BUST'];
const POSITION_FILTERS: FilterKey[] = ['QB', 'RB', 'WR', 'TE'];

/** Rating (TFO score) color tiers. */
function ratingColor(score: number): string {
  if (score >= 90) return '#36E7A1';
  if (score >= 75) return '#FBBF24';
  if (score >= 60) return '#e8ecf4';
  return '#6b7a99';
}

/** Outlined grade-pill color by dynasty asset tier label. */
function gradePillClass(label: string): string {
  if (label === 'ELITE ASSET') return 'border-boom text-boom';
  if (label === 'STRONG ASSET') return 'border-hold text-hold';
  if (label === 'STABLE ASSET') return 'border-muted text-muted';
  return 'border-bust text-bust';
}

interface PlayerHubClientProps {
  players: HubPlayer[];
  leaguePresence: Record<string, string[]>;
  portfolio: PlayerHubPortfolio;
  leagues: { id: string; name: string }[];
  tradeOpportunities: TradeOpportunity[];
  showAds?: boolean;
}

export default function PlayerHubClient({
  players,
  leaguePresence,
  portfolio,
  leagues,
  tradeOpportunities,
  showAds = false,
}: PlayerHubClientProps) {
  const searchParams = useSearchParams();
  const deepLinkId =
    searchParams.get('player') ??
    searchParams.get('target') ??
    searchParams.get('highlight');
  const deepLinkPosition = searchParams.get('position')?.toUpperCase();
  const deepLinkSort = searchParams.get('sort') as SortKey | null;
  const defaultId = players.find((p) => p.playerId === deepLinkId)?.playerId ?? players[0]?.playerId ?? '';
  const [selectedId, setSelectedId] = useState(defaultId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (deepLinkId && players.some((p) => p.playerId === deepLinkId)) {
      setSelectedId(deepLinkId);
    }
  }, [deepLinkId, players]);
  const [filter, setFilter] = useState<FilterKey>(() => {
    if (deepLinkPosition && ['QB', 'RB', 'WR', 'TE'].includes(deepLinkPosition)) {
      return deepLinkPosition as FilterKey;
    }
    return 'ALL';
  });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>(
    deepLinkSort === 'name' || deepLinkSort === 'position' || deepLinkSort === 'rating'
      ? deepLinkSort
      : 'rating',
  );
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let list = [...players];
    const q = search.trim().toLowerCase();

    if (q) {
      list = list.filter((p) => p.fullName.toLowerCase().includes(q));
    }

    if (filter === 'BOOM') list = list.filter((p) => isBoomVerdict(p.verdict));
    else if (filter === 'HOLD') list = list.filter((p) => isHoldVerdict(p.verdict));
    else if (filter === 'BUST') list = list.filter((p) => isBustVerdict(p.verdict));
    else if (['QB', 'RB', 'WR', 'TE'].includes(filter)) {
      list = list.filter((p) => p.position === filter);
    }

    if (sort === 'name') {
      list.sort((a, b) => a.fullName.localeCompare(b.fullName));
    } else if (sort === 'position') {
      list.sort((a, b) => a.position.localeCompare(b.position) || b.tfoScore - a.tfoScore);
    } else {
      list.sort((a, b) => b.tfoScore - a.tfoScore);
    }

    return list;
  }, [players, search, filter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageSlice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selected =
    players.find((p) => p.playerId === selectedId) ?? players[0] ?? null;

  const similar = selected ? findSimilarPlayers(players, selected, 3) : [];

  // Any active pill is uniformly filled boom with glow (not per-verdict colors).
  const filterBtnClass = (key: FilterKey): string =>
    filter === key
      ? 'border border-boom bg-boom text-[#0a0d14] shadow-[0_0_12px_rgba(54,231,161,0.45)]'
      : 'border border-border bg-surface text-muted hover:border-muted hover:text-text';

  const renderFilterPill = (key: FilterKey) => (
    <button
      key={key}
      type="button"
      onClick={() => {
        setFilter(key);
        setPage(1);
      }}
      className={`cursor-pointer rounded-[5px] px-[11px] py-[7px] font-figtree text-[11px] font-medium transition-all min-h-[44px] md:min-h-0 md:py-[5px] ${filterBtnClass(key)}`}
    >
      {FILTER_VERDICT_LABELS[key] ?? key}
    </button>
  );

  return (
    <div
      className="col-start-1 md:col-start-2 row-start-2 min-h-0 overflow-hidden flex flex-col md:grid md:grid-cols-[minmax(0,1fr)_minmax(620px,48%)]"
    >
      <div className="flex min-w-0 flex-col gap-2.5 overflow-y-auto overflow-x-hidden p-3 px-3.5 [scrollbar-width:thin]">
        <div>
          <div className="font-figtree text-[26px] font-extrabold leading-none tracking-[-1px] text-text md:text-[34px]">
            PLAYER HUB
          </div>
          <div className="mt-[3px] font-mono text-[10px] text-muted">
            Every player. Every signal. Every week.
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            {/* Ghost search — underline only */}
            <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-none border-0 border-b border-[#1e2640] bg-transparent px-1 py-[7px] transition-colors focus-within:border-boom">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search players..."
                className="w-full border-none bg-transparent font-figtree text-[12px] text-text outline-none placeholder:text-muted"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ml-auto cursor-pointer rounded-[5px] border border-border bg-surface px-2.5 py-[5px] font-figtree text-[11px] text-text outline-none"
            >
              <option value="rating">Dynasty Rating</option>
              <option value="name">Name</option>
              <option value="position">Position</option>
            </select>
          </div>
          {/* Row 1 — verdict filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {VERDICT_FILTERS.map(renderFilterPill)}
          </div>
          {/* Row 2 — position filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {POSITION_FILTERS.map(renderFilterPill)}
          </div>
        </div>

        <div className="overflow-hidden rounded-[7px] border border-border bg-surface">
          <div
            className="grid gap-2 border-b border-border bg-bg px-3 py-[7px]"
            style={{ gridTemplateColumns: '2fr 70px 110px' }}
          >
            {['Player', 'Rating', 'Grade'].map((h) => (
              <div
                key={h}
                className="font-mono text-[8px] font-normal uppercase tracking-[1.5px] text-muted"
              >
                {h}
              </div>
            ))}
          </div>
          {pageSlice.length > 0 ? (
            pageSlice.map((p) => {
              const sel = p.playerId === selectedId;
              return (
                <button
                  key={p.playerId}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.playerId);
                    setMobileDetailOpen(true);
                  }}
                  className={`grid w-full cursor-pointer items-center gap-2 border-b border-border/50 px-3 py-[7px] text-left transition-all duration-150 last:border-b-0 hover:bg-boom/[0.03] hover:border-l-boom/30 ${
                    sel
                      ? 'border-l-[3px] border-l-boom bg-boom/[0.06] pl-[9px] shadow-[inset_0_0_20px_rgba(54,231,161,0.06)]'
                      : 'border-l-[3px] border-l-transparent'
                  }`}
                  style={{ gridTemplateColumns: '2fr 70px 110px' }}
                >
                  <div className="flex items-center gap-2">
                    <PlayerAvatar
                      playerId={p.playerId}
                      name={p.fullName}
                      size={30}
                      fallbackColor={mvColor(p)}
                    />
                    <div>
                      <div className="mb-px font-figtree text-[12.5px] leading-tight text-text">
                        {p.fullName}
                      </div>
                      <div className="font-mono text-[9px] text-muted">
                        {p.position} · {p.team}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-[14px]" style={{ color: ratingColor(p.tfoScore) }}>
                    {p.tfoScore.toFixed(1)}
                  </div>
                  <div>
                    <span
                      className={`inline-block whitespace-nowrap rounded border bg-transparent px-[7px] py-[3px] text-center font-figtree text-[10px] font-medium ${gradePillClass(getGradeLabel(p.tfoScore))}`}
                    >
                      {getGradeLabel(p.tfoScore)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-8 text-center font-mono text-[12px] text-muted">
              No players match your filters.
            </div>
          )}
          <div className="flex items-center gap-[5px] border-t border-border px-3 py-2 font-mono text-[9.5px] text-muted">
            <span className="mr-auto">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`cursor-pointer rounded px-[7px] py-[3px] ${
                  n === safePage
                    ? 'border border-boom/20 bg-boom/10 text-boom'
                    : 'hover:text-text'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <AdSlot placement="player-hub" showAds={showAds} className="mt-0" />
      </div>

      <div className="hidden min-h-0 overflow-y-auto border-l border-border bg-bg md:block">
        {selected ? (
          <PlayerDetailPanel
            player={selected}
            leagueNames={leaguePresence[selected.playerId] ?? []}
            portfolio={portfolio}
            allPlayers={players}
            comparables={similar}
            leagues={leagues}
            tradeOpportunities={tradeOpportunities}
            onSelectPlayer={setSelectedId}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[12px] text-muted">
            No player data available
          </div>
        )}
      </div>

      {selected && mobileDetailOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0d14] md:hidden">
          <button
            type="button"
            onClick={() => setMobileDetailOpen(false)}
            className="shrink-0 border-b border-border px-4 py-3 text-left font-mono text-[11px] text-boom"
          >
            ← Players
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto pb-20">
            <PlayerDetailPanel
              player={selected}
              leagueNames={leaguePresence[selected.playerId] ?? []}
              portfolio={portfolio}
              allPlayers={players}
              comparables={similar}
              leagues={leagues}
              tradeOpportunities={tradeOpportunities}
              onSelectPlayer={setSelectedId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
