'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PlayerAvatarProps {
  playerId: string;
  name: string;
  size?: number;
  borderColor?: string;
  textColor?: string;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ''}${parts[parts.length - 1]?.[0] ?? ''}`.toUpperCase();
  }
  return (name.slice(0, 2) || '??').toUpperCase();
}

export default function PlayerAvatar({
  playerId,
  name,
  size = 34,
  borderColor = '#36E7A1',
  textColor = '#36E7A1',
  className = '',
}: PlayerAvatarProps) {
  const [failed, setFailed] = useState(false);
  const isPick = playerId.startsWith('pick_');

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface2 ${className}`}
      style={{ width: size, height: size, border: `2px solid ${borderColor}` }}
    >
      {!failed && !isPick ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={name}
          width={size}
          height={size}
          unoptimized
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1] font-mono text-[9px] font-bold" style={{ color: textColor }}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}
