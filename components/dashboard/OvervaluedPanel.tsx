'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { OvervaluedAsset, SignalsResponse } from '@/app/api/dashboard/signals/route';

// ─── Player avatar ────────────────────────────────────────────────────────────

function PlayerAvatar({ name, position, photoUrl }: { name: string; position: string; photoUrl: string }) {
  const [imgError, setImgError] = useState(false);

  const initials = name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const POS_COLORS: Record<string, string> = {
    WR: '#22D3EE',
    RB: '#36E7A1',
    QB: '#FBBF24',
    TE: '#A78BFA',
  };
  const color = POS_COLORS[position.toUpperCase()] ?? '#94a3b8';

  if (imgError || !photoUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-full shrink-0 font-semibold"
        style={{
          width:      36,
          height:     36,
          background: `${color}22`,
          color,
          fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
          fontSize:   12,
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="rounded-full overflow-hidden shrink-0" style={{ width: 36, height: 36 }}>
      <Image
        src={photoUrl}
        alt={name}
        width={36}
        height={36}
        className="object-cover w-full h-full"
        onError={() => setImgError(true)}
        unoptimized
      />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

function OvervaluedRow({ asset, isLast }: { asset: OvervaluedAsset; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);

  // Format: "-1,240" — always negative; add comma separators
  const deltaDisplay = asset.delta.toLocaleString('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
    signDisplay: 'always',
  });

  return (
    <div
      className="flex items-center justify-between px-4 py-3 transition-colors duration-150"
      style={{
        borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
        background:   hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
        cursor:       'default',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Left: avatar + name */}
      <div className="flex items-center gap-2 min-w-0">
        <PlayerAvatar
          name={asset.name}
          position={asset.position}
          photoUrl={asset.photoUrl}
        />
        <div className="flex flex-col min-w-0">
          <span
            className="font-medium leading-tight truncate"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize:   13,
              color:      '#ffffff',
            }}
          >
            {asset.name}
          </span>
          <span
            className="leading-tight truncate"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize:   11,
              color:      '#64748B',
            }}
          >
            {asset.position} · {asset.team}
          </span>
        </div>
      </div>

      {/* Right: delta + badge */}
      <div className="flex items-center gap-2 shrink-0 ml-3">
        <span
          style={{
            fontFamily:   'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:     13,
            color:        '#EF4444',
            fontVariant:  'tabular-nums',
            letterSpacing: '0.01em',
          }}
        >
          {deltaDisplay}
        </span>
        <span
          className="inline-flex items-center rounded-full font-medium uppercase"
          style={{
            padding:       '2px 7px',
            background:    'rgba(69,10,10,0.6)',
            color:         '#f87171',
            border:        '1px solid rgba(239,68,68,0.3)',
            fontSize:      10,
            letterSpacing: '0.04em',
            fontFamily:    'var(--font-mono), "JetBrains Mono", monospace',
            whiteSpace:    'nowrap',
          }}
        >
          OVERVALUE
        </span>
      </div>
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 animate-pulse"
      style={{ borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)' }}
      aria-hidden
    >
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-white/[0.07] shrink-0" style={{ width: 36, height: 36 }} />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-28 rounded bg-white/[0.07]" />
          <div className="h-2.5 w-16 rounded bg-white/[0.05]" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-3.5 w-12 rounded bg-white/[0.07]" />
        <div className="h-4 w-20 rounded-full bg-white/[0.07]" />
      </div>
    </div>
  );
}

// ─── OvervaluedPanel ──────────────────────────────────────────────────────────

export interface OvervaluedPanelProps {
  data:    SignalsResponse | null;
  loading: boolean;
}

export default function OvervaluedPanel({ data, loading }: OvervaluedPanelProps) {
  const assets = data?.overvalued ?? [];

  return (
    <div
      className="flex flex-col flex-1 min-w-0"
      style={{
        background:    'rgba(255,255,255,0.03)',
        border:        '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
        borderRadius:  12,
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
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      12,
            color:         '#64748B',
            letterSpacing: '0.1em',
          }}
        >
          Overvalued Assets
        </span>
        <Link
          href="/trade-hub"
          className="transition-colors duration-150 hover:underline"
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   12,
            color:      '#22D3EE',
          }}
        >
          View All →
        </Link>
      </div>

      {/* List */}
      <div className="flex flex-col flex-1">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} isLast={i === 4} />
          ))
        ) : assets.length === 0 ? (
          <div
            className="flex items-center justify-center flex-1 py-8"
            style={{
              fontFamily: 'var(--font-body), Inter, sans-serif',
              fontSize:   13,
              color:      '#64748B',
            }}
          >
            No overvalued assets found.
          </div>
        ) : (
          assets.map((asset, i) => (
            <OvervaluedRow
              key={asset.playerId}
              asset={asset}
              isLast={i === assets.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}
