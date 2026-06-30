'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import PlayerHubCard from './PlayerHubCard';
import type { PlayerHubData } from './PlayerHubCard';
import type { PlayersHubResponse, PlayerHubEntry } from '@/app/api/dashboard/players/route';

// ─── Skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div
      className="shrink-0 flex flex-col rounded-xl p-3 gap-2 animate-pulse"
      style={{
        width: 180,
        minWidth: 160,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      aria-hidden
    >
      {/* Name + pos */}
      <div className="flex flex-col gap-1.5">
        <div className="h-3.5 w-28 rounded bg-white/[0.08]" />
        <div className="h-2.5 w-16 rounded bg-white/[0.05]" />
      </div>
      {/* Pentagon placeholder */}
      <div
        className="rounded-lg bg-white/[0.05] mx-auto"
        style={{ width: 110, height: 110 }}
      />
      {/* Score + badge */}
      <div className="flex flex-col items-center gap-2 pt-1">
        <div className="h-8 w-12 rounded bg-white/[0.08]" />
        <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
        <div className="h-2.5 w-20 rounded bg-white/[0.04]" />
      </div>
    </div>
  );
}

// ─── Map API entry → PlayerHubData ───────────────────────────────────────────

function entryToHubData(entry: PlayerHubEntry): PlayerHubData {
  return {
    playerId:  entry.playerId,
    name:      entry.name,
    position:  entry.position,
    team:      entry.team,
    tfoScore:  entry.tfoScore,
    subLabel:  entry.subLabel,
    // radarValues and benchmarkValues omitted → card derives from tfoScore
  };
}

// ─── PlayerHubSection ─────────────────────────────────────────────────────────

export interface PlayerHubSectionProps {
  className?: string;
}

export default function PlayerHubSection({ className }: PlayerHubSectionProps) {
  const activeLeagueId = useDashboardLeagueStore((s) => s.activeLeagueId);

  const [entries,  setEntries]  = useState<PlayerHubEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel in-flight request from previous leagueId
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    const lgParam = activeLeagueId ?? 'all';
    const url = `/api/dashboard/players?leagueId=${encodeURIComponent(lgParam)}&limit=5`;

    (async () => {
      try {
        const res = await fetch(url, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as PlayersHubResponse;
        setEntries(json.players ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return; // stale request — ignore
        setEntries([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeLeagueId]);

  return (
    <section className={className}>
      {/* ── Section header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="uppercase tracking-widest leading-none"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 12,
            color: '#64748B',
            letterSpacing: '0.1em',
          }}
        >
          My Boom/Bust Players
        </span>

        <Link
          href="/dashboard"
          className="leading-none transition-colors duration-150 hover:underline"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 12,
            color: '#22D3EE',
          }}
        >
          View All Players →
        </Link>
      </div>

      {/* ── Cards row ──────────────────────────────────────────────── */}
      {loading ? (
        /*
         * Skeleton: 5 pulse cards in a horizontal row.
         * Mobile: scrollable. Desktop: 5-across flex.
         */
        <div
          className="flex flex-row gap-3 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          aria-label="Loading player cards"
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ scrollSnapAlign: 'start' }}>
              <CardSkeleton />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        /* ── Empty state ─────────────────────────────────────────── */
        <div
          className="flex items-center justify-center py-10 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p
            className="text-center text-[14px]"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              color: '#64748B',
            }}
          >
            No players found.
            <br />
            Sync your leagues to get started.
          </p>
        </div>
      ) : (
        /*
         * Cards: flex row, scroll on mobile (snap), 5-across on desktop.
         * Each card is 180px (DASH_003 spec) with 160px min-width on mobile.
         */
        <div
          className="flex flex-row gap-3 overflow-x-auto scrollbar-hide pb-1"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
        >
          {entries.map((entry) => (
            <div
              key={entry.playerId}
              className="shrink-0"
              style={{ scrollSnapAlign: 'start' }}
            >
              <PlayerHubCard
                player={entryToHubData(entry)}
                verdict={entry.verdict}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
