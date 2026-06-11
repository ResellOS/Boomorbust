'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ExposurePlayer } from '@/lib/exposure/types';
import { formatLeaguesSummary, riskBadgeClass, riskBarColor } from '@/lib/exposure/utils';
import { isBoomVerdict, isBustVerdict, isHoldVerdict } from '@/lib/players/utils';
import PlayerAvatar from '@/components/players/PlayerAvatar';

type FilterKey = 'ALL' | 'BOOM' | 'HOLD' | 'BUST' | 'QB' | 'RB' | 'WR' | 'TE';
type SortKey = 'exposure' | 'rating' | 'risk';

const FILTERS: FilterKey[] = ['ALL', 'BOOM', 'HOLD', 'BUST', 'QB', 'RB', 'WR', 'TE'];
const WATCHLIST_KEY = 'bb_watchlist';

interface ExposureClientProps {
  players: ExposurePlayer[];
  isGameDay: boolean;
}

function riskSortWeight(level: ExposurePlayer['riskLevel']): number {
  if (level === 'DANGER') return 3;
  if (level === 'CAUTION') return 2;
  return 1;
}

function TrendSpark({ values, color }: { values: number[]; color: string }) {
  const pts = values.length >= 2 ? values : [50, 50, 50, 50, 50, 50, 50];
  const min = Math.min(...pts);
  const max = Math.max(...pts);
  const range = max - min || 1;
  const poly = pts
    .map((v, i) => {
      const x = (i / Math.max(pts.length - 1, 1)) * 52;
      const y = 20 - ((v - min) / range) * 16;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={52} height={22} viewBox="0 0 52 22" aria-hidden>
      <polyline
        points={poly}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function weeklyPointsColor(
  actual: number | null,
  projected: number | null,
): string {
  if (actual === null || projected === null || projected <= 0) return 'text-text';
  const ratio = (actual - projected) / projected;
  if (ratio > 0) return 'text-boom';
  if (ratio >= -0.1) return 'text-hold';
  return 'text-[#ef4444]';
}

export default function ExposureClient({ players, isGameDay }: ExposureClientProps) {
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('exposure');

  const filtered = useMemo(() => {
    let list = [...players];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => p.fullName.toLowerCase().includes(q));

    if (filter === 'BOOM') list = list.filter((p) => isBoomVerdict(p.verdict));
    else if (filter === 'HOLD') list = list.filter((p) => isHoldVerdict(p.verdict));
    else if (filter === 'BUST') list = list.filter((p) => isBustVerdict(p.verdict));
    else if (['QB', 'RB', 'WR', 'TE'].includes(filter)) {
      list = list.filter((p) => p.position === filter);
    }

    if (sort === 'rating') list.sort((a, b) => b.tfoScore - a.tfoScore);
    else if (sort === 'risk') {
      list.sort(
        (a, b) =>
          riskSortWeight(b.riskLevel) - riskSortWeight(a.riskLevel) ||
          b.exposurePct - a.exposurePct,
      );
    } else {
      list.sort((a, b) => b.exposurePct - a.exposurePct);
    }

    return list;
  }, [players, search, filter, sort]);

  const filterBtnClass = (key: FilterKey): string => {
    if (filter !== key) {
      return 'border border-border bg-surface2 text-muted hover:text-text';
    }
    if (key === 'BOOM') return 'border-boom bg-boom/10 text-boom';
    if (key === 'HOLD') return 'border-hold bg-hold/10 text-hold';
    if (key === 'BUST') return 'border-bust bg-bust/10 text-bust';
    return 'border-border bg-border text-text';
  };

  const handleMonitor = (playerId: string) => {
    try {
      const raw = localStorage.getItem(WATCHLIST_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(playerId)) {
        list.push(playerId);
        localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-y-auto [scrollbar-width:thin]">
          <div className="px-5 pb-1 pt-2.5">
            <div className="text-xl font-bold uppercase tracking-[-0.5px] text-text">
              Exposure Tracker
            </div>
            <div className="mt-[3px] text-xs text-muted">Know your risk. Own your portfolio.</div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-5 pb-2 pt-1">
            <div className="flex h-7 min-w-[160px] flex-1 items-center gap-2 rounded-md border border-border bg-surface2 px-3">
              <Search className="h-3 w-3 shrink-0 text-muted" strokeWidth={2} />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search any player..."
                className="w-full border-none bg-transparent text-xs text-text outline-none placeholder:text-muted"
              />
            </div>
            {FILTERS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`h-7 cursor-pointer rounded px-2.5 text-[10px] font-medium ${filterBtnClass(key)}`}
              >
                {key}
              </button>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="ml-auto flex h-7 cursor-pointer items-center gap-1 rounded-[5px] border border-border bg-surface2 px-2.5 text-[10px] text-text outline-none"
            >
              <option value="exposure">Exposure %</option>
              <option value="rating">Dynasty Rating</option>
              <option value="risk">Risk Level</option>
            </select>
          </div>

          <div className="flex items-center gap-[7px] border-b border-border px-5 pb-[5px]">
            <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-muted">
              Portfolio Exposure — By Player
            </span>
          </div>

          <div className="px-5">
            <div
              className="grid gap-2 border-b border-border py-2"
              style={{ gridTemplateColumns: '220px 1fr 90px 110px' }}
            >
              {['Player', 'Exposure', 'Leagues', 'Risk Level'].map((h) => (
                <div key={h} className="text-[9px] uppercase tracking-wide text-muted">
                  {h}
                </div>
              ))}
            </div>
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <div
                  key={p.playerId}
                  className="grid items-center gap-2 border-b border-border/70 py-[5px] transition-colors hover:bg-white/[0.015]"
                  style={{ gridTemplateColumns: '220px 1fr 90px 110px' }}
                >
                  <div className="flex items-center gap-2">
                    <PlayerAvatar playerId={p.playerId} name={p.fullName} size={28} />
                    <div>
                      <div className="text-xs text-text">{p.fullName}</div>
                      <div className="mt-px text-[10px] text-muted">
                        {p.position} · {p.team}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2.5">
                    <div className="h-[9px] flex-1 overflow-hidden rounded-sm bg-border">
                      <div
                        className="h-full rounded-sm"
                        style={{
                          width: `${Math.min(100, p.exposurePct)}%`,
                          background: riskBarColor(p.riskLevel),
                        }}
                      />
                    </div>
                    <span className="w-[34px] shrink-0 text-right font-mono text-[10px] text-muted">
                      {Math.round(p.exposurePct)}%
                    </span>
                  </div>
                  <div className="text-center font-mono text-xs text-text">
                    {p.leagueCount}/{p.totalLeagues}
                  </div>
                  <div className="flex justify-center">
                    <span
                      className={`min-w-[70px] rounded-[3px] px-2.5 py-[3px] text-center text-[9px] font-medium tracking-wide ${riskBadgeClass(p.riskLevel)}`}
                    >
                      {p.riskLevel}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center font-mono text-[11px] text-muted">
                No players match your filters.
              </div>
            )}
          </div>

          <div className="mt-1 flex items-center gap-2.5 border-b border-border px-5 py-2">
            <span className="text-[10px] font-medium uppercase tracking-[1.5px] text-muted">
              Player Exposure Details
            </span>
            {isGameDay && (
              <>
                <span className="flex items-center gap-1 text-[9px] font-medium text-boom">
                  <span className="h-[5px] w-[5px] rounded-full bg-boom" />
                  LIVE
                </span>
                <span className="text-[9px] text-muted">
                  Updates every 60 seconds during game days
                </span>
              </>
            )}
          </div>

          <div className="overflow-x-auto px-5 pb-2">
            <div
              className="grid min-w-[820px] gap-1 border-b border-border py-[7px]"
              style={{
                gridTemplateColumns:
                  '155px 38px 52px 88px 72px 100px 58px 80px 76px',
              }}
            >
              {[
                'Player',
                'POS',
                'Shares',
                'Leagues',
                'Dyn. Rtg',
                'Weekly Pts',
                '7-Day',
                'Risk',
                'Action',
              ].map((h) => (
                <div key={h} className="text-[9px] uppercase tracking-[0.8px] text-muted">
                  {h}
                </div>
              ))}
            </div>
            {filtered.map((p) => (
              <div
                key={`det-${p.playerId}`}
                className="grid min-w-[820px] items-center gap-1 border-b border-border/50 py-[7px] transition-colors hover:bg-white/[0.015]"
                style={{
                  gridTemplateColumns:
                    '155px 38px 52px 88px 72px 100px 58px 80px 76px',
                }}
              >
                <div className="flex items-center gap-[7px]">
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={24} />
                  <span className="truncate text-[11px] text-text">{p.fullName}</span>
                </div>
                <div className="text-[10px] text-muted">{p.position}</div>
                <div className="font-mono text-[11px] text-text">
                  {p.leagueCount}/{p.totalLeagues}
                </div>
                <div className="truncate text-[10px] text-muted">
                  {formatLeaguesSummary(p.leagueNames, p.totalLeagues)}
                </div>
                <div className="font-mono text-[11px] text-text">
                  {p.tfoScore > 0 ? p.tfoScore.toFixed(1) : '—'}
                </div>
                <div>
                  {p.weeklyPoints !== null ? (
                    <>
                      <div
                        className={`text-[10px] ${weeklyPointsColor(p.weeklyPoints, p.projectedPoints)}`}
                      >
                        {p.weeklyPoints.toFixed(1)} pts
                      </div>
                      <div className="mt-px text-[9px] text-muted">
                        Proj: {p.projectedPoints !== null ? p.projectedPoints.toFixed(1) : '—'}
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </div>
                <TrendSpark
                  values={p.trend7d}
                  color={riskBarColor(p.riskLevel)}
                />
                <div>
                  <span
                    className={`inline-block rounded-[3px] px-2 py-[3px] text-[9px] font-medium ${riskBadgeClass(p.riskLevel)}`}
                  >
                    {p.riskLevel}
                  </span>
                </div>
                <div>
                  {p.riskLevel === 'DANGER' && (
                    <Link
                      href={`/trade?action=offer&player=${p.playerId}`}
                      className="inline-block rounded-[3px] border border-[rgba(239,68,68,0.25)] bg-[rgba(239,68,68,0.1)] px-2 py-[3px] text-[9px] font-medium text-[#ef4444] no-underline"
                    >
                      Reduce
                    </Link>
                  )}
                  {p.riskLevel === 'CAUTION' && (
                    <button
                      type="button"
                      onClick={() => handleMonitor(p.playerId)}
                      className="rounded-[3px] border border-hold/25 bg-hold/10 px-2 py-[3px] text-[9px] font-medium text-hold"
                    >
                      Monitor
                    </button>
                  )}
                  {p.riskLevel === 'SAFE' && (
                    <Link
                      href={`/trade?action=acquire&player=${p.playerId}`}
                      className="inline-block rounded-[3px] border border-boom/25 bg-boom/10 px-2 py-[3px] text-[9px] font-medium text-boom no-underline"
                    >
                      Add More
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
