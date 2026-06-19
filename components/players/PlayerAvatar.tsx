'use client';

import { useState } from 'react';
import Image from 'next/image';
import { initials } from '@/lib/players/utils';

interface PlayerAvatarProps {
  playerId: string;
  name: string;
  size?: number;
  borderClass?: string;
  fallbackColor?: string;
  className?: string;
  rounded?: 'full' | 'md';
}

export default function PlayerAvatar({
  playerId,
  name,
  size = 30,
  borderClass = 'border border-border',
  fallbackColor = '#6b7a99',
  className = '',
  rounded = 'full',
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const radius = rounded === 'full' ? 'rounded-full' : 'rounded-[7px]';
  const id = String(playerId ?? '').trim();
  const showImage = !failed && id.length > 0;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden bg-surface2 ${radius} ${borderClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {showImage ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${id}.jpg`}
          alt={name}
          width={size}
          height={size}
          unoptimized
          className="absolute inset-0 h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="relative z-[1] font-mono font-semibold uppercase"
          style={{
            fontSize: Math.max(8, Math.round(size * 0.32)),
            color: fallbackColor,
          }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
