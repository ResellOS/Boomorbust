'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';

const POS_COLORS: Record<string, string> = {
  QB: '#FEBC2E',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
  K: '#94A3B8',
  DEF: '#94A3B8',
  default: '#475569',
};

export interface PlayerAvatarProps {
  playerId: string;
  playerName: string;
  position: string;
  size?: number;
  /** Use the smaller /thumb/ CDN variant (better for ≤64px circles) */
  thumb?: boolean;
  className?: string;
  style?: CSSProperties;
}

export default function PlayerAvatar({
  playerId,
  playerName,
  position,
  size = 40,
  thumb = false,
  className = '',
  style = {},
}: PlayerAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const color = POS_COLORS[position?.toUpperCase()] ?? POS_COLORS.default;
  const initial = (playerName ?? '?').charAt(0).toUpperCase();

  const baseStyle: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    ...style,
  };

  if (imgError || !playerId) {
    return (
      <div
        className={className}
        style={{
          ...baseStyle,
          background: `${color}18`,
          border: `2px solid ${color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size * 0.38,
          fontWeight: 700,
          color: color,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={thumb
        ? `https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`
        : `https://sleepercdn.com/content/nfl/players/${playerId}.jpg`
      }
      width={size}
      height={size}
      alt={playerName ?? 'Player'}
      className={className}
      style={{
        ...baseStyle,
        objectFit: 'cover',
      }}
      onError={() => setImgError(true)}
    />
  );
}
