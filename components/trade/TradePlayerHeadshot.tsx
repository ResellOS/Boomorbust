'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function TradePlayerHeadshot({
  playerId,
  name,
  size = 64,
}: {
  playerId: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full border border-[#1e2640] bg-[#141929]"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={name}
          width={size}
          height={size}
          unoptimized
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full items-center justify-center font-mono text-xs text-[#6b7a99]">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}
