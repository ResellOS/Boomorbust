'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { ProactiveTradeItem } from './types';
import { photoUrl } from './types';

// ─── Suggestion row ───────────────────────────────────────────────────────────

function SuggestionRow({ item, isLast }: { item: ProactiveTradeItem; isLast: boolean }) {
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered]   = useState(false);

  const pid     = item.target_player?.player_id ?? '';
  const name    = item.target_player?.name ?? item.target_player_name;
  const pos     = item.target_player?.position ?? item.target_position;
  const team    = item.target_player?.team ?? '—';
  const ktc     = item.target_player?.ktc_value ?? 0;
  const bvi     = item.target_player?.bvi_score ?? 0;
  const delta   = (bvi || ktc) > 0 ? ((bvi - ktc) / 100) : 22;
  const treEdge = parseFloat(Math.max(0, delta + 10).toFixed(1));

  const POS_COLORS: Record<string, string> = { WR: '#22D3EE', RB: '#36E7A1', QB: '#FBBF24', TE: '#A78BFA' };
  const color   = POS_COLORS[pos] ?? '#94a3b8';
  const initials = name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background:   hovered ? 'rgba(255,255,255,0.02)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div className="rounded-full overflow-hidden shrink-0" style={{ width: 36, height: 36 }}>
        {pid && !imgError ? (
          <Image
            src={photoUrl(pid)}
            alt={name}
            width={36}
            height={36}
            className="object-cover w-full h-full"
            onError={() => setImgError(true)}
            unoptimized
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-[11px] font-semibold"
            style={{ background: `${color}22`, color }}
          >
            {initials}
          </div>
        )}
      </div>

      {/* Name + description */}
      <div className="flex flex-col flex-1 min-w-0">
        <span
          className="font-medium truncate"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#ffffff' }}
        >
          {item.reasoning || `Trade for ${name}`}
        </span>
        <span
          className="truncate"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#64748B' }}
        >
          Target: {name} {pos ? `· ${pos}` : ''} {team && team !== '—' ? `· ${team}` : ''}
        </span>
        <span
          className="truncate"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#475569' }}
        >
          {item.league_name}
        </span>
      </div>

      {/* TRE Edge */}
      <div className="shrink-0 text-right">
        <span
          style={{
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      9,
            color:         '#64748B',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            display:       'block',
          }}
        >
          TRE Edge
        </span>
        <span
          style={{
            fontFamily:  'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:    18,
            fontWeight:  700,
            color:       '#36E7A1',
            fontVariant: 'tabular-nums',
          }}
        >
          +{treEdge}
        </span>
      </div>
    </div>
  );
}

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 animate-pulse"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      aria-hidden
    >
      <div className="rounded-full bg-white/[0.07] shrink-0" style={{ width: 36, height: 36 }} />
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="h-3 w-40 rounded bg-white/[0.07]" />
        <div className="h-2.5 w-24 rounded bg-white/[0.05]" />
      </div>
      <div className="h-5 w-12 rounded bg-white/[0.07]" />
    </div>
  );
}

// ─── TreSuggestionsTab ────────────────────────────────────────────────────────

export interface TreSuggestionsTabProps {
  items:   ProactiveTradeItem[];
  loading: boolean;
  compact?: boolean;
}

export default function TreSuggestionsTab({ items, loading, compact }: TreSuggestionsTabProps) {
  const displayItems = compact ? items.slice(0, 3) : items;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span
          className="uppercase tracking-widest"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize: 12, color: '#64748B', letterSpacing: '0.1em',
          }}
        >
          TRE Suggested Trades
        </span>
        <span
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#475569' }}
        >
          Proactive deals found by TRE Engine
        </span>
      </div>

      {/* List */}
      {loading ? (
        Array.from({ length: compact ? 3 : 5 }).map((_, i) => (
          <SkeletonRow key={i} isLast={i === (compact ? 2 : 4)} />
        ))
      ) : displayItems.length === 0 ? (
        <div className="px-4 py-8 text-center" style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#64748B' }}>
          No TRE suggestions found. Run a sync to generate proactive trade ideas.
        </div>
      ) : (
        displayItems.map((item, i) => (
          <SuggestionRow key={item.id} item={item} isLast={i === displayItems.length - 1} />
        ))
      )}

      {/* Footer link */}
      {!loading && items.length > 0 && (
        <div
          className="flex justify-center px-4 py-2.5"
          style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <Link
            href="#"
            className="hover:underline"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: '#22D3EE' }}
          >
            View All Suggestions →
          </Link>
        </div>
      )}
    </div>
  );
}
