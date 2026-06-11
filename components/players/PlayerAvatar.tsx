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

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-surface2 ${radius} ${borderClass} ${className}`}
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={name}
          width={size}
          height={size}
          unoptimized
          className="absolute inset-0 block h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center font-mono font-normal"
          style={{
            fontSize: Math.max(8, Math.round(size * 0.28)),
            color: fallbackColor,
            background: '#141929',
          }}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}
