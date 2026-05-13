'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  TrendingDown,
  TrendingUp,
  Minus,
  Trophy,
  Users,
  Target,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import AppBackground from '@/components/AppBackground';
import type {
  TeamCard,
  TeamStatus,
  BHSSignal,
  KTCTrend,
  ContentionWindow,
  TeamCardPlayer,
} from '@/app/api/dashboard/teams/route';

// ─── Design tokens ────────────────────────────────────────────────────────────

const STATUS_META: Record<TeamStatus, { label: string; color: string; glow: string; dot: string }> =
  {
    CONTENDING: {
      label: 'CONTENDING',
      color: '#36E7A1',
      glow: '0 0 12px rgba(54,231,161,0.55)',
      dot: 'bg-[#36E7A1]',
    },
    TRANSITIONING: {
      label: 'TRANSITIONING',
      color: '#FBBF24',
      glow: '0 0 12px rgba(251,191,36,0.55)',
      dot: 'bg-[#FBBF24]',
    },
    REBUILDING: {
      label: 'REBUILDING',
      color: '#A78BFA',
      glow: '0 0 12px rgba(167,139,250,0.55)',
      dot: 'bg-[#A78BFA]',
    },
  };

const BHS_META: Record<BHSSignal, { label: string; color: string; bg: string; glow: string }> = {
  BUY: {
    label: 'BUY',
    color: '#36E7A1',
    bg: 'rgba(54,231,161,0.12)',
    glow: '0 0 8px rgba(54,231,161,0.45)',
  },
  HOLD: {
    label: 'HOLD',
    color: '#FBBF24',
    bg: 'rgba(251,191,36,0.12)',
    glow: '0 0 8px rgba(251,191,36,0.35)',
  },
  SELL: {
    label: 'SELL',
    color: '#EF4444',
    bg: 'rgba(239,68,68,0.12)',
    glow: '0 0 8px rgba(239,68,68,0.45)',
  },
};

const POS_COLOR: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
};

const TREND_ICON: Record<KTCTrend, React.ReactNode> = {
  RISING: <TrendingUp size={12} className="inline" style={{ color: '#36E7A1' }} />,
  STABLE: <Minus size={12} className="inline" style={{ color: '#64748B' }} />,
  FALLING: <TrendingDown size={12} className="inline" style={{ color: '#EF4444' }} />,
};

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-xl p-5 animate-pulse"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      <div className="h-4 w-3/5 rounded bg-white/10 mb-3" />
      <div className="h-3 w-2/5 rounded bg-white/06 mb-6" />
      <div className="flex gap-2 mb-4">
        <div className="h-6 w-16 rounded-full bg-white/08" />
        <div className="h-6 w-24 rounded-full bg-white/08" />
      </div>
      <div className="h-10 w-full rounded bg-white/06 mb-4" />
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 flex-1 rounded bg-white/06" />
        ))}
      </div>
    </div>
  );
}

// ─── BHS pill ─────────────────────────────────────────────────────────────────

function BhsPill({ player }: { player: TeamCardPlayer }) {
  const meta = BHS_META[player.bhs];
  const posColor = POS_COLOR[player.position] ?? '#94A3B8';

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 min-w-0"
      style={{
        background: meta.bg,
        border: `1px solid ${meta.color}33`,
        boxShadow: meta.glow,
      }}
    >
      <span
        className="text-[10px] font-bold shrink-0"
        style={{
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          color: meta.color,
        }}
      >
        {meta.label}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className="text-[11px] font-medium text-white truncate leading-tight"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          {player.name.split(' ').pop()}
        </p>
        <p
          className="text-[9px] truncate"
          style={{
            color: posColor,
            fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          }}
        >
          {player.position} · {player.team}
        </p>
      </div>
    </div>
  );
}

// ─── Contention window visual ─────────────────────────────────────────────────

function ContentionWindowBar({ window: cw }: { window: ContentionWindow }) {
  const currentYear = new Date().getFullYear();
  const totalSpan = 8;
  const startOffset = cw.peakStart - currentYear;
  const duration = cw.peakEnd - cw.peakStart;
  const leftPct = Math.max(0, Math.min(100, (startOffset / totalSpan) * 100));
  const widthPct = Math.max(5, Math.min(100 - leftPct, (duration / totalSpan) * 100));

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span
          className="text-[10px] text-white/40"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          {currentYear}
        </span>
        <span
          className="text-[10px] text-white/40"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          {currentYear + totalSpan}
        </span>
      </div>
      <div
        className="relative h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        {/* Now marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-white/30 z-10"
          style={{ left: '0%' }}
        />
        {/* Peak window */}
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{
            left: `${leftPct}%`,
            width: `${widthPct}%`,
            background:
              cw.peakStart <= currentYear
                ? 'linear-gradient(90deg, #36E7A1, #22D3EE)'
                : cw.peakStart <= currentYear + 1
                  ? 'linear-gradient(90deg, #FBBF24, #F97316)'
                  : 'linear-gradient(90deg, #A78BFA, #7C3AED)',
            boxShadow:
              cw.peakStart <= currentYear
                ? '0 0 8px rgba(54,231,161,0.6)'
                : cw.peakStart <= currentYear + 1
                  ? '0 0 8px rgba(251,191,36,0.6)'
                  : '0 0 8px rgba(167,139,250,0.6)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Full analysis expand ─────────────────────────────────────────────────────

function FullAnalysis({ card }: { card: TeamCard }) {
  const { contentionWindow: cw } = card;

  return (
    <div
      className="mt-4 pt-4 space-y-4"
      style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      {/* Contention timeline */}
      <div>
        <p
          className="text-[10px] text-white/40 uppercase tracking-wider mb-2"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          Contention Timeline
        </p>
        <ContentionWindowBar window={cw} />
        <p
          className="text-[10px] text-white/50 mt-2"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          {cw.reasoning}
        </p>
      </div>

      {/* Position age breakdown */}
      {Object.keys(cw.positionBreakdown).length > 0 && (
        <div>
          <p
            className="text-[10px] text-white/40 uppercase tracking-wider mb-2"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            Roster Age by Position
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {['QB', 'RB', 'WR', 'TE'].map((pos) => {
              const data = cw.positionBreakdown[pos];
              if (!data) return null;
              return (
                <div
                  key={pos}
                  className="rounded-lg p-2 text-center"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: `1px solid ${POS_COLOR[pos] ?? '#fff'}22`,
                  }}
                >
                  <p
                    className="text-[10px] font-bold mb-0.5"
                    style={{
                      color: POS_COLOR[pos] ?? '#94A3B8',
                      fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
                    }}
                  >
                    {pos}
                  </p>
                  <p
                    className="text-[13px] font-bold text-white"
                    style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
                  >
                    {data.avgAge.toFixed(1)}
                  </p>
                  <p className="text-[9px] text-white/30" style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}>
                    avg yrs · {data.count}p
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        {/* KTC trend */}
        <div
          className="rounded-lg p-2 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p
            className="text-[9px] text-white/40 mb-1 uppercase"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            KTC Trend
          </p>
          <span className="text-[11px]">{TREND_ICON[cw.ktcTrend]}</span>
          <p
            className="text-[10px] font-bold mt-0.5"
            style={{
              color:
                cw.ktcTrend === 'RISING'
                  ? '#36E7A1'
                  : cw.ktcTrend === 'FALLING'
                    ? '#EF4444'
                    : '#64748B',
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            }}
          >
            {cw.ktcTrend}
          </p>
        </div>

        {/* Avg age */}
        <div
          className="rounded-lg p-2 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p
            className="text-[9px] text-white/40 mb-1 uppercase"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            Avg Age
          </p>
          <p
            className="text-[14px] font-bold text-white"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            {cw.avgAge.toFixed(1)}
          </p>
        </div>

        {/* TFO avg */}
        <div
          className="rounded-lg p-2 text-center"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p
            className="text-[9px] text-white/40 mb-1 uppercase"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            TFO Avg
          </p>
          <p
            className="text-[14px] font-bold"
            style={{
              color: cw.avgTFO != null && cw.avgTFO >= 75 ? '#36E7A1' : cw.avgTFO != null && cw.avgTFO < 55 ? '#EF4444' : '#FBBF24',
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            }}
          >
            {cw.avgTFO != null ? cw.avgTFO : '—'}
          </p>
        </div>
      </div>

      {/* CTA to Trade Finder */}
      <a
        href="/dashboard/trade"
        className="flex items-center justify-center gap-2 w-full rounded-lg py-2.5 text-[12px] font-semibold transition-all hover:opacity-80"
        style={{
          background: 'rgba(34,211,238,0.10)',
          border: '1px solid rgba(34,211,238,0.30)',
          color: '#22D3EE',
          boxShadow: '0 0 12px rgba(34,211,238,0.15)',
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
        }}
      >
        Explore Trade Moves
        <ArrowRight size={13} />
      </a>
    </div>
  );
}

// ─── Team card ────────────────────────────────────────────────────────────────

function TeamCardView({ card }: { card: TeamCard }) {
  const [expanded, setExpanded] = useState(false);
  const statusMeta = STATUS_META[card.status];

  const peakLabel =
    card.contentionWindow.peakStart === card.contentionWindow.peakEnd
      ? `${card.contentionWindow.peakStart}`
      : `${card.contentionWindow.peakStart}–${card.contentionWindow.peakEnd}`;

  const winPct =
    card.wins + card.losses > 0
      ? Math.round((card.wins / (card.wins + card.losses)) * 100)
      : 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4 transition-all duration-200"
      style={{
        background: 'rgba(10,13,20,0.65)',
        border: '1px solid rgba(255,255,255,0.10)',
        backdropFilter: 'blur(24px)',
        boxShadow: `0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
    >
      {/* Header: league + team name */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className="text-[11px] text-white/40 uppercase tracking-wider truncate"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            {card.leagueName}
          </p>
          <h3
            className="text-[15px] font-bold text-white truncate mt-0.5 leading-tight"
            style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
          >
            {card.teamName ?? 'My Team'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              color: statusMeta.color,
              background: `${statusMeta.color}18`,
              border: `1px solid ${statusMeta.color}44`,
              boxShadow: statusMeta.glow,
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            }}
          >
            {statusMeta.label}
          </span>
        </div>
      </div>

      {/* Record + Win% */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Trophy size={12} className="text-white/30" />
          <span
            className="text-[13px] font-bold text-white"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            {card.wins}–{card.losses}
            {card.ties > 0 ? `–${card.ties}` : ''}
          </span>
        </div>
        <span
          className="text-[11px] text-white/40"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          {winPct}% win rate
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <Users size={11} className="text-white/30" />
          <span
            className="text-[10px] text-white/30"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            {card.totalPlayers}p
          </span>
        </div>
      </div>

      {/* Contention window */}
      <div
        className="rounded-lg p-3"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-[10px] text-white/40 uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            Contention Window
          </span>
          <span
            className="text-[12px] font-bold"
            style={{
              color: statusMeta.color,
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            }}
          >
            Peak: {peakLabel}
          </span>
        </div>
        <ContentionWindowBar window={card.contentionWindow} />
      </div>

      {/* Dynasty Manager Title */}
      {card.managerTitle && (
        <div className="flex items-center gap-2">
          <Target size={11} style={{ color: '#64748B' }} />
          <span
            className="text-[11px] italic"
            style={{
              color: '#64748B',
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
            }}
          >
            {card.managerTitle}
          </span>
        </div>
      )}

      {/* Top 3 BHS recommendations */}
      {card.topBhsPlayers.length > 0 && (
        <div>
          <p
            className="text-[10px] text-white/30 uppercase tracking-wider mb-2"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
          >
            Top Moves
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {card.topBhsPlayers.map((p) => (
              <BhsPill key={p.player_id} player={p} />
            ))}
          </div>
        </div>
      )}

      {/* View Full Analysis toggle */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center justify-center gap-2 w-full rounded-lg py-2 text-[11px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          color: 'rgba(255,255,255,0.60)',
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
        }}
      >
        {expanded ? (
          <>
            <ChevronUp size={13} />
            Collapse
          </>
        ) : (
          <>
            <ChevronDown size={13} />
            View Full Analysis
          </>
        )}
      </button>

      {/* Expanded analysis */}
      {expanded && <FullAnalysis card={card} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamsPage() {
  const [cards, setCards] = useState<TeamCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/dashboard/teams');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as TeamCard[];
      setCards(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Summary stats
  const contending = cards.filter((c) => c.status === 'CONTENDING').length;
  const rebuilding = cards.filter((c) => c.status === 'REBUILDING').length;
  const transitioning = cards.filter((c) => c.status === 'TRANSITIONING').length;
  const totalWins = cards.reduce((s, c) => s + c.wins, 0);
  const totalLosses = cards.reduce((s, c) => s + c.losses, 0);

  return (
    <AppBackground intensity="subtle">
      {/* Simple sticky top bar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 sm:px-6 h-14"
        style={{
          background: 'rgba(10,13,20,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace', fontSize: 11 }}
        >
          <ChevronLeft size={14} />
          Dashboard
        </Link>
        <span className="text-white/20 text-xs">/</span>
        <span
          className="text-white/60 text-[11px] uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
        >
          All Teams
        </span>
      </nav>

      <main className="min-h-screen pt-14 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          {/* Page header */}
          <div className="py-8 sm:py-10">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <p
                  className="text-[11px] text-white/40 uppercase tracking-widest mb-1"
                  style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
                >
                  Dynasty Command Center
                </p>
                <h1
                  className="text-[32px] sm:text-[40px] font-bold text-white leading-none"
                  style={{ fontFamily: 'var(--font-display), "Bebas Neue", sans-serif', letterSpacing: '0.04em' }}
                >
                  ALL TEAMS
                </h1>
                <p
                  className="text-[12px] text-white/40 mt-1"
                  style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
                >
                  Full contention analysis across all your leagues
                </p>
              </div>

              {/* Empire stats strip */}
              {!loading && cards.length > 0 && (
                <div className="flex gap-4 sm:gap-6 flex-wrap">
                  {[
                    { label: 'Leagues', value: cards.length, color: '#22D3EE' },
                    { label: 'Contending', value: contending, color: '#36E7A1' },
                    { label: 'Transitioning', value: transitioning, color: '#FBBF24' },
                    { label: 'Rebuilding', value: rebuilding, color: '#A78BFA' },
                    { label: 'Overall W-L', value: `${totalWins}–${totalLosses}`, color: '#fff' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="text-center">
                      <p
                        className="text-[18px] sm:text-[22px] font-bold"
                        style={{
                          color,
                          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
                        }}
                      >
                        {value}
                      </p>
                      <p
                        className="text-[9px] text-white/30 uppercase tracking-wider"
                        style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
                      >
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status filter legend */}
          {!loading && cards.length > 0 && (
            <div className="flex gap-3 mb-6 flex-wrap">
              {(Object.entries(STATUS_META) as [TeamStatus, typeof STATUS_META[TeamStatus]][]).map(
                ([status, meta]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: meta.color, boxShadow: meta.glow }}
                    />
                    <span
                      className="text-[10px] text-white/40"
                      style={{
                        fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                ),
              )}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              className="rounded-xl p-6 text-center mb-6"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.20)',
              }}
            >
              <p
                className="text-[13px] text-red-400"
                style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
              >
                {error}
              </p>
              <button
                onClick={load}
                className="mt-3 text-[11px] text-red-400/60 underline hover:text-red-400"
                style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Skeleton grid */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* No data */}
          {!loading && !error && cards.length === 0 && (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <Users size={32} className="mx-auto mb-3 text-white/20" />
              <p
                className="text-[14px] text-white/40"
                style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
              >
                No leagues found.
              </p>
              <p
                className="text-[11px] text-white/25 mt-1"
                style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace' }}
              >
                Import your Sleeper leagues in{' '}
                <a href="/onboarding" className="underline hover:text-white/50">
                  onboarding
                </a>{' '}
                to get started.
              </p>
            </div>
          )}

          {/* Team card grid */}
          {!loading && cards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {cards.map((card) => (
                <TeamCardView key={card.leagueId} card={card} />
              ))}
            </div>
          )}
        </div>
      </main>
    </AppBackground>
  );
}
