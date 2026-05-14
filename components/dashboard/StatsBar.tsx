'use client';

import { useEffect, useRef, useState } from 'react';
import type { DashboardStats } from '@/app/api/dashboard/stats/route';

// ─── Card config ─────────────────────────────────────────────────────────────

interface CardDef {
  key: keyof DashboardStats;
  label: string;
  sub: string;
  color: string;
  format: (v: number) => string;
}

const CARDS: CardDef[] = [
  {
    key:    'leagues',
    label:  'Leagues',
    sub:    'All synced',
    color:  '#22D3EE',
    format: (v) => String(v),
  },
  {
    key:    'playersRostered',
    label:  'Players Rostered',
    sub:    'Across all leagues',
    color:  '#ffffff',
    format: (v) => String(v),
  },
  {
    key:    'tradeOffers',
    label:  'Trade Offers',
    sub:    'Pending review',
    color:  '#FBBF24',
    format: (v) => String(v),
  },
  {
    key:    'treEdge',
    label:  'TRE Edge',
    sub:    'Avg across leagues',
    color:  '#36E7A1',
    format: (v) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)),
  },
  {
    key:    'winProbability',
    label:  'Win Probability',
    sub:    'This week',
    color:  '#36E7A1',
    format: (v) => `${v}%`,
  },
];

// ─── Skeleton card ────────────────────────────────────────────────────────────

function CardSkeleton({ last }: { last?: boolean }) {
  return (
    <div
      className={`flex flex-col gap-2 rounded-xl px-5 py-4 ${last ? 'col-span-2 md:col-span-1' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      aria-hidden
    >
      {/* value bar */}
      <div className="h-7 w-14 rounded animate-pulse bg-white/[0.08]" />
      {/* label bar */}
      <div className="h-3 w-24 rounded animate-pulse bg-white/[0.06]" />
      {/* sub bar */}
      <div className="h-2.5 w-20 rounded animate-pulse bg-white/[0.04]" />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  def,
  value,
  last,
}: {
  def: CardDef;
  value: number | null;
  last?: boolean;
}) {
  const displayValue = value != null ? def.format(value) : '—';
  const isNull = value == null;

  return (
    <div
      className={`flex flex-col gap-1 rounded-xl px-5 py-4 flex-1 min-w-0 ${last ? 'col-span-2 md:col-span-1' : ''}`}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Value */}
      <span
        className="leading-none tabular-nums font-bold"
        style={{
          fontFamily: 'var(--font-mono), JetBrains Mono, monospace',
          fontSize: 24,
          color: isNull ? '#475569' : def.color,
        }}
      >
        {displayValue}
      </span>

      {/* Label */}
      <span
        className="leading-none"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize: 12,
          color: '#64748B',
        }}
      >
        {def.label}
      </span>

      {/* Sub */}
      <span
        className="leading-none"
        style={{
          fontFamily: 'var(--font-body), Inter, sans-serif',
          fontSize: 11,
          color: '#475569',
        }}
      >
        {def.sub}
      </span>
    </div>
  );
}

// ─── StatsBar ─────────────────────────────────────────────────────────────────

export interface StatsBarProps {
  className?: string;
}

export default function StatsBar({ className }: StatsBarProps) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
        if (!res.ok) throw new Error('fetch failed');
        const json = (await res.json()) as DashboardStats;
        setData(json);
      } catch {
        // Fail silently — cards show "—" values
        setData({
          leagues: 0,
          playersRostered: 0,
          tradeOffers: 0,
          treEdge: null,
          winProbability: null,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div
        className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${className ?? ''}`}
        aria-label="Loading stats"
      >
        {CARDS.map((c, i) => (
          <CardSkeleton key={c.key} last={i === CARDS.length - 1} />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 md:grid-cols-5 gap-3 ${className ?? ''}`}>
      {CARDS.map((def, i) => {
        const raw = data ? data[def.key] : null;
        const value = typeof raw === 'number' ? raw : null;
        return (
          <StatCard
            key={def.key}
            def={def}
            value={value}
            last={i === CARDS.length - 1}
          />
        );
      })}
    </div>
  );
}
