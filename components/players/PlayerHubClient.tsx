'use client';

import { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type { HubPlayer, PlayerHubPortfolio } from '@/lib/players/types';
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

const FILTERS: FilterKey[] = ['ALL', 'BOOM', 'HOLD', 'BUST', 'QB', 'RB', 'WR', 'TE'];

interface PlayerHubClientProps {
  players: HubPlayer[];
  leaguePresence: Record<string, string[]>;
  portfolio: PlayerHubPortfolio;
  showAds?: boolean;
}

export default function PlayerHubClient({
  players,
  leaguePresence,
  portfolio,
  showAds = false,
}: PlayerHubClientProps) {
  const searchParams = useSearchParams();
  const deepLinkId =
    searchParams.get('player') ??
    searchParams.get('target') ??
    searchParams.get('highlight');
  const defaultId = players.find((p) => p.playerId === deepLinkId)?.playerId ?? players[0]?.playerId ?? '';
  const [selectedId, setSelectedId] = useState(defaultId);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  useEffect(() => {
    if (deepLinkId && players.some((p) => p.playerId === deepLinkId)) {
      setSelectedId(deepLinkId);
    }
  }, [deepLinkId, players]);
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('rating');
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

  const filterBtnClass = (key: FilterKey): string => {
    if (filter !== key) {
      return 'border border-border bg-surface text-muted hover:border-muted hover:text-text';
    }
    if (key === 'ALL') return 'border-border bg-border text-text';
    if (key === 'BOOM') return 'border-boom/35 bg-boom/[0.08] text-boom';
    if (key === 'HOLD') return 'border-hold/35 bg-hold/[0.08] text-hold';
    if (key === 'BUST') return 'border-bust/35 bg-bust/[0.08] text-bust';
    return 'border-border bg-border text-text';
  };

  return (
    <div
      className="col-start-1 md:col-start-2 row-start-2 min-h-0 overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_minmax(580px,42%)]"
    >
      <div className="flex min-w-0 flex-col gap-2.5 overflow-y-auto overflow-x-hidden p-3 px-3.5 [scrollbar-width:thin]">
        <div>
          <div className="font-figtree text-[26px] font-extrabold leading-none tracking-[-1px] text-text md:text-[34px]">
            PLAYER HUB
          </div>
          <div className="mt-[3px] font-mono text-[9px] text-muted">
            Every player. Every signal. Every week.
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 py-[7px]">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search players..."
              className="w-full border-none bg-transparent font-figtree text-[11px] text-text outline-none placeholder:text-muted"
            />
          </div>
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
              className={`cursor-pointer rounded-[5px] px-[11px] py-[7px] font-figtree text-[10px] font-medium transition-colors min-h-[44px] md:min-h-0 md:py-[5px] ${filterBtnClass(key)}`}
            >
              {FILTER_VERDICT_LABELS[key] ?? key}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="ml-auto cursor-pointer rounded-[5px] border border-border bg-surface px-2.5 py-[5px] font-figtree text-[10px] text-text outline-none"
          >
            <option value="rating">Dynasty Rating</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-[7px] border border-border bg-surface">
          <div
            className="grid gap-2 border-b border-border bg-bg px-3 py-[7px]"
            style={{ gridTemplateColumns: '2fr 70px 110px' }}
          >
            {['Player', 'Rating', 'Grade'].map((h) => (
              <div
                key={h}
                className="font-mono text-[7px] font-normal uppercase tracking-[1.5px] text-muted"
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
                  className={`grid w-full cursor-pointer items-center gap-2 border-b border-border/50 px-3 py-[7px] text-left transition-colors last:border-b-0 hover:bg-white/[0.015] ${
                    sel
                      ? 'border-l-2 border-l-boom bg-boom/[0.04] pl-[10px]'
                      : 'border-l-2 border-l-transparent'
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
                      <div className="mb-px font-figtree text-[11.5px] leading-tight text-text">
                        {p.fullName}
                      </div>
                      <div className="font-mono text-[8px] text-muted">
                        {p.position} · {p.team}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-[13px]" style={{ color: mvColor(p) }}>
                    {p.tfoScore.toFixed(1)}
                  </div>
                  <div>
                    <span
                      className="inline-block whitespace-nowrap rounded border border-border bg-white/[0.03] px-[7px] py-[3px] text-center font-figtree text-[9px] font-medium text-text"
                    >
                      {getGradeLabel(p.tfoScore)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-8 text-center font-mono text-[11px] text-muted">
              No players match your filters.
            </div>
          )}
          <div className="flex items-center gap-[5px] border-t border-border px-3 py-2 font-mono text-[8.5px] text-muted">
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
            onSelectPlayer={setSelectedId}
          />
        ) : (
          <div className="flex h-full items-center justify-center font-mono text-[11px] text-muted">
            No player data available
          </div>
        )}
      </div>

      {selected && mobileDetailOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0d14] md:hidden">
          <button
            type="button"
            onClick={() => setMobileDetailOpen(false)}
            className="shrink-0 border-b border-border px-4 py-3 text-left font-mono text-[10px] text-boom"
          >
            ← Back to list
          </button>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <PlayerDetailPanel
              player={selected}
              leagueNames={leaguePresence[selected.playerId] ?? []}
              portfolio={portfolio}
              allPlayers={players}
              comparables={similar}
              onSelectPlayer={setSelectedId}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
