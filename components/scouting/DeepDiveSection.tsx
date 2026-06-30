'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PlayerDeepDive, PlayerSearchHit } from './types';
import { DEEP_DIVE_SUB_TABS } from './types';

const GLASS = 'rounded-xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-[24px]';

/** Sleeper player_id for Amon-Ra St. Brown — default deep dive. */
const DEFAULT_PLAYER_ID = '7547';

function MiniSparkline({ series }: { series: number[] }) {
  const pts = useMemo(() => {
    if (!series.length) return '0,18 56,6';
    const max = Math.max(...series);
    const min = Math.min(...series);
    return series
      .map((v, i, a) => {
        const x = (i / Math.max(1, a.length - 1)) * 100;
        const y = 28 - ((v - min) / Math.max(0.001, max - min)) * 22;
        return `${x},${y}`;
      })
      .join(' ');
  }, [series]);

  return (
    <svg width="100" height="32" viewBox="0 0 100 32" className="shrink-0 mt-1" aria-hidden>
      <polyline points={pts} fill="none" stroke="#36E7A1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DeepDiveSection() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [hits, setHits] = useState<PlayerSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [openHits, setOpenHits] = useState(false);
  const [playerId, setPlayerId] = useState(DEFAULT_PLAYER_ID);
  const [player, setPlayer] = useState<PlayerDeepDive | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [subTab, setSubTab] = useState('OVERVIEW');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      setSearchLoading(false);
      return;
    }
    let c = false;
    setSearchLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/players/search?q=${encodeURIComponent(debounced)}`, { credentials: 'include' });
        const j = (await res.json()) as { results?: PlayerSearchHit[] };
        if (!c) setHits(j.results ?? []);
      } catch {
        if (!c) setHits([]);
      } finally {
        if (!c) setSearchLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [debounced]);

  useEffect(() => {
    let c = false;
    setPlayerLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/players/${encodeURIComponent(playerId)}`, { credentials: 'include' });
        const j = (await res.json()) as PlayerDeepDive;
        if (!c && j?.name) setPlayer(j);
      } catch {
        if (!c) setPlayer(null);
      } finally {
        if (!c) setPlayerLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [playerId]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpenHits(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectHit = useCallback((h: PlayerSearchHit) => {
    setPlayerId(h.playerId);
    setQuery(h.full_name);
    setOpenHits(false);
    setHits([]);
  }, []);

  const showMetrics = subTab === 'OVERVIEW' || subTab === 'METRICS';

  return (
    <div className={`${GLASS} p-4 mt-4`} id="scouting-deep-dive">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] uppercase tracking-widest text-[#64748B] font-semibold">DEEP DIVE ANY PLAYER</p>
        <div ref={wrapRef} className="relative w-full sm:w-auto sm:min-w-[12rem]">
          <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 focus-within:border-emerald-500/50">
            <Search className="w-4 h-4 text-[#64748B] shrink-0" aria-hidden />
            <input
              type="search"
              placeholder="Search player..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenHits(true);
              }}
              onFocus={() => setOpenHits(true)}
              className="w-full sm:w-48 bg-transparent text-[14px] text-white placeholder:text-[#64748B] outline-none border-0"
              style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}
              autoComplete="off"
            />
          </div>
          {openHits && (debounced.length >= 2 || hits.length > 0) ? (
            <div className="absolute right-0 left-0 sm:left-auto sm:right-0 sm:min-w-[16rem] z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-white/[0.1] bg-[#0a0d14]/95 backdrop-blur-xl py-1">
              {searchLoading ? (
                <p className="px-3 py-2 text-[13px] text-[#64748B]">Searching…</p>
              ) : hits.length === 0 ? (
                <p className="px-3 py-2 text-[13px] text-[#64748B]">No players found</p>
              ) : (
                hits.map((h) => (
                  <button
                    key={h.playerId}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-white/[0.05] text-[14px] text-white border-0 bg-transparent cursor-pointer"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectHit(h)}
                  >
                    {h.full_name}
                    <span className="text-[#64748B] text-[12px] ml-2">
                      {h.position} {h.team ? `· ${h.team}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {playerLoading ? (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 animate-pulse space-y-4">
          <div className="h-16 bg-white/[0.06] rounded-lg" />
          <div className="h-24 bg-white/[0.05] rounded-lg" />
        </div>
      ) : player ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5 mt-3">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="relative w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-full overflow-hidden bg-white/[0.06]">
                {player.avatarUrl ? (
                  <Image
                    src={player.avatarUrl}
                    alt=""
                    width={64}
                    height={64}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[15px] font-bold text-white">
                    {(player.name || '?').slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-[18px] sm:text-[22px] font-bold text-white truncate" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                  {player.name}
                </h3>
                <p className="text-[14px] text-[#64748B] mt-0.5">
                  {player.position} · {player.team}
                </p>
                <div className="flex flex-wrap items-center gap-x-0 gap-y-2 mt-3 divide-x divide-white/[0.08]">
                  {[
                    { lab: 'AGE', val: String(player.age) },
                    { lab: 'HEIGHT', val: player.height },
                    { lab: 'WEIGHT', val: String(player.weight) },
                    { lab: 'COLLEGE', val: player.college },
                    { lab: 'DRAFT', val: player.draft },
                  ].map((x) => (
                    <span key={x.lab} className="inline-flex items-center gap-1.5 px-3 first:pl-0 first:pr-3">
                      <span className="text-[10px] uppercase text-[#64748B] font-semibold tracking-wide">{x.lab}</span>
                      <span className="text-[12px] sm:text-[14px] text-white font-mono tabular-nums">{x.val}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-6 lg:justify-end">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#64748B] font-mono">PLAYER SCORE</p>
                <p className="text-[40px] sm:text-[48px] font-bold tabular-nums leading-none mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
                  {player.playerScore}
                </p>
                <span
                  className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ color: '#36E7A1', background: 'rgba(54,231,161,0.12)', borderColor: 'rgba(54,231,161,0.35)' }}
                >
                  {player.scoreTier}
                </span>
                <p className="text-[12px] text-[#64748B] mt-1" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
                  {player.scoreSub}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-[#64748B] font-mono">TREND (30 DAYS)</p>
                <p className="text-[32px] sm:text-[36px] font-bold tabular-nums leading-none mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#36E7A1' }}>
                  {player.trend30d >= 0 ? '+' : ''}
                  {Number(player.trend30d).toFixed(1)}
                </p>
                <MiniSparkline series={player.trendSpark.length ? player.trendSpark : [2, 3, 4, 5, 6]} />
              </div>
            </div>
          </div>

          <div
            className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-white/[0.06] mt-4"
            style={{ WebkitOverflowScrolling: 'touch' }}
            role="tablist"
          >
            {DEEP_DIVE_SUB_TABS.map((t) => {
              const is = subTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={is}
                  onClick={() => setSubTab(t.id)}
                  className="flex-shrink-0 min-h-[40px] px-3 py-2 text-[12px] font-bold tracking-wide whitespace-nowrap border-b-2 transition-colors"
                  style={{
                    fontFamily: 'var(--font-body), Inter, sans-serif',
                    color: is ? '#ffffff' : '#64748B',
                    borderBottomColor: is ? '#36E7A1' : 'transparent',
                    borderBottomWidth: 2,
                    background: 'transparent',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {showMetrics && player.metrics?.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mt-4">
              {player.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3 text-center"
                >
                  <p className="text-[11px] uppercase tracking-wide text-[#64748B] font-semibold">{m.label}</p>
                  <p className="text-[20px] sm:text-[22px] font-bold tabular-nums mt-1 font-mono" style={{ color: m.valueColor }}>
                    {m.value}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: m.tierColor }}>
                    {m.tier}
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {!showMetrics ? (
            <p className="text-center text-[14px] text-[#64748B] py-10" style={{ fontFamily: 'var(--font-body), Inter, sans-serif' }}>
              This view is coming soon.
            </p>
          ) : null}

          <div className="text-center mt-4">
            <Link href={`/arbitrage`} className="text-[14px] text-[#22D3EE] hover:underline inline-block">
              View Full Player Profile →
            </Link>
          </div>
        </div>
      ) : (
        <p className="text-[14px] text-[#64748B] mt-3">Could not load player.</p>
      )}
    </div>
  );
}
