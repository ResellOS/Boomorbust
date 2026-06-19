'use client';

import Link from 'next/link';
import type { MissingEliteAsset } from '@/lib/exposure/types';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import { positionAccent } from '@/lib/exposure/utils';

export default function MissingEliteSection({ assets }: { assets: MissingEliteAsset[] }) {
  if (assets.length === 0) return null;

  return (
    <section className="mb-4 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        You Don&apos;t Own
      </div>
      <p className="mb-3 font-mono text-[10px] text-muted">
        High-value players not in your portfolio
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {assets.map((a) => (
          <div
            key={a.playerId}
            className="flex min-w-[160px] shrink-0 flex-col rounded-md border border-border/60 bg-surface2/40 p-3"
          >
            <PlayerAvatar
              playerId={a.playerId}
              name={a.fullName}
              size={40}
              fallbackColor={positionAccent(a.position)}
            />
            <div className="mt-2 font-mono text-[11px] text-text">{a.fullName}</div>
            <div className="font-mono text-[9px] text-muted">
              {a.position} · BOB {a.tfoScore.toFixed(1)}
            </div>
            <div className="mt-1 font-mono text-[9px] text-boom">
              +{a.portfolioImpact}% est. impact
            </div>
            <Link
              href={`/trade?target=${a.playerId}`}
              className="mt-2 font-mono text-[9px] uppercase text-boom hover:underline"
            >
              Find Trade →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
