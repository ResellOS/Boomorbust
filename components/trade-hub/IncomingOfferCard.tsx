'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { TradeHubOffer, TradeHubAsset } from './types';
import { timeAgo, isNewOffer, photoUrl } from './types';

// ─── Asset chip (player or pick) ─────────────────────────────────────────────

function AssetAvatar({ asset }: { asset: TradeHubAsset }) {
  const [imgError, setImgError] = useState(false);
  const isPick = asset.position === 'PICK';

  const POS_COLORS: Record<string, string> = {
    WR: '#22D3EE', RB: '#36E7A1', QB: '#FBBF24', TE: '#A78BFA',
  };
  const color = POS_COLORS[asset.position] ?? '#94a3b8';
  const initials = asset.name.split(' ').map((w) => w[0] ?? '').slice(0, 2).join('').toUpperCase();

  if (isPick) {
    return (
      <div
        className="flex items-center justify-center rounded-full shrink-0 text-[10px] font-bold"
        style={{ width: 32, height: 32, background: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: '1px solid rgba(251,191,36,0.3)' }}
      >
        PK
      </div>
    );
  }

  if (!imgError) {
    return (
      <div className="rounded-full overflow-hidden shrink-0" style={{ width: 32, height: 32 }}>
        <Image
          src={photoUrl(asset.player_id)}
          alt={asset.name}
          width={32}
          height={32}
          className="object-cover w-full h-full"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full shrink-0 text-[11px] font-semibold"
      style={{ width: 32, height: 32, background: `${color}22`, color }}
    >
      {initials}
    </div>
  );
}

function AssetChip({ asset }: { asset: TradeHubAsset }) {
  const isPick = asset.position === 'PICK';
  return (
    <div className="flex items-center gap-2 py-1">
      <AssetAvatar asset={asset} />
      <div className="flex flex-col min-w-0">
        <span
          className="truncate font-medium leading-tight"
          style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 13, color: '#ffffff' }}
        >
          {asset.name}
        </span>
        {!isPick && (
          <span
            className="leading-tight"
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#64748B' }}
          >
            {asset.position} · {asset.team}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── TRE Edge display ─────────────────────────────────────────────────────────

function TreEdge({ offer }: { offer: TradeHubOffer }) {
  const giveKtc    = offer.give.reduce((s, a) => s + (a.ktc_value ?? a.bvi_score ?? 0), 0);
  const receiveKtc = offer.receive.reduce((s, a) => s + (a.ktc_value ?? a.bvi_score ?? 0), 0);
  const delta      = receiveKtc - giveKtc;
  const display    = (delta / 100).toFixed(1);
  const positive   = delta >= 0;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col">
        <span
          style={{
            fontFamily: 'var(--font-body), Inter, sans-serif',
            fontSize:   10,
            color:      '#64748B',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Offer Value
        </span>
        <span
          style={{
            fontFamily:   'var(--font-mono), "JetBrains Mono", monospace',
            fontSize:     22,
            fontWeight:   700,
            color:        positive ? '#36E7A1' : '#EF4444',
            fontVariant:  'tabular-nums',
          }}
        >
          {positive ? '+' : ''}{display}
        </span>
        <span
          style={{
            fontFamily:    'var(--font-body), Inter, sans-serif',
            fontSize:      9,
            color:         '#64748B',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          TRE Edge
        </span>
      </div>
    </div>
  );
}

// ─── IncomingOfferCard ────────────────────────────────────────────────────────

export interface IncomingOfferCardProps {
  offer:      TradeHubOffer;
  isSelected: boolean;
  onClick:    () => void;
  leagueIdx:  number;
}

export default function IncomingOfferCard({ offer, isSelected, onClick, leagueIdx }: IncomingOfferCardProps) {
  const isNew = isNewOffer(offer.created_at);
  const LEAGUE_COLORS = ['#36E7A1', '#22D3EE', '#FBBF24', '#A78BFA', '#F472B6', '#60A5FA'];
  const lgColor = LEAGUE_COLORS[leagueIdx % LEAGUE_COLORS.length]!;

  return (
    <div
      className="rounded-xl p-4 mb-3 cursor-pointer transition-all duration-150"
      style={{
        background:  isSelected ? 'rgba(54,231,161,0.06)' : 'rgba(255,255,255,0.03)',
        border:      `1px solid ${isSelected ? 'rgba(54,231,161,0.4)' : 'rgba(255,255,255,0.08)'}`,
        backdropFilter: 'blur(24px)',
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-pressed={isSelected}
    >
      {/* Top row: league + time + NEW badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="rounded-full"
            style={{ width: 8, height: 8, background: lgColor, display: 'inline-block' }}
            aria-hidden
          />
          <span
            style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 12, color: lgColor, fontWeight: 600 }}
          >
            {offer.league_name}
          </span>
          <span
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace', fontSize: 11, color: '#64748B' }}
          >
            {timeAgo(offer.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isNew && (
            <span
              className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase"
              style={{ background: 'rgba(54,231,161,0.2)', color: '#36E7A1', letterSpacing: '0.05em', fontFamily: 'var(--font-mono), monospace' }}
            >
              NEW
            </span>
          )}
        </div>
      </div>

      {/* Two-column: GIVES (left) | VS | RECEIVES (right) */}
      <div className="flex items-start gap-3">
        {/* Left: what they get (you give) */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#64748B', fontWeight: 500 }}>
              {offer.opponent_name ? `${offer.opponent_name}` : 'Team Alpha'}
            </span>
            <br />
            <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 9, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Receives
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {offer.give.length === 0 ? (
              <span style={{ fontSize: 12, color: '#475569' }}>No assets listed</span>
            ) : (
              offer.give.map((a) => <AssetChip key={a.player_id} asset={a} />)
            )}
          </div>
        </div>

        {/* VS divider */}
        <div
          className="flex items-center justify-center shrink-0 rounded-full mt-6"
          style={{ width: 28, height: 28, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>VS</span>
        </div>

        {/* Right: what you get (they give) */}
        <div className="flex-1 min-w-0">
          <div className="mb-1.5">
            <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
              Team You
            </span>
            <br />
            <span style={{ fontFamily: 'var(--font-body), Inter, sans-serif', fontSize: 9, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Receives
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            {offer.receive.length === 0 ? (
              <span style={{ fontSize: 12, color: '#475569' }}>No assets listed</span>
            ) : (
              offer.receive.map((a) => <AssetChip key={a.player_id} asset={a} />)
            )}
          </div>
        </div>

        {/* TRE edge */}
        <div className="shrink-0 mt-2">
          <TreEdge offer={offer} />
        </div>
      </div>
    </div>
  );
}
