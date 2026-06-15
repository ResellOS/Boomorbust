'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import RosterBreakdown from './RosterBreakdown';
import type { RosterBreakdown as RosterBreakdownData } from '@/lib/dashboard/rotation';

export interface SignalCounts {
  boom: number;
  hold: number;
  bust: number;
  total: number;
}

export interface ExposureWarning {
  text: string;
}

export interface OvervaluedAsset {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  delta: number;
}

interface RightPanelProps {
  breakdown: RosterBreakdownData;
  exposureWarnings: ExposureWarning[];
  overvalued: OvervaluedAsset[];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
  return (name.slice(0, 2) || '??').toUpperCase();
}

function PlayerThumb({
  playerId,
  playerName,
  size = 28,
}: {
  playerId: string;
  playerName: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface2"
      style={{ width: size, height: size }}
    >
      {!failed ? (
        <Image
          src={`https://sleepercdn.com/content/nfl/players/thumb/${playerId}.jpg`}
          alt={playerName}
          width={size}
          height={size}
          unoptimized
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="relative z-[1] font-mono text-[9px] font-bold text-muted">
          {initials(playerName)}
        </span>
      )}
    </div>
  );
}

export default function RightPanel({ breakdown, exposureWarnings, overvalued }: RightPanelProps) {
  const defaultWarnings: ExposureWarning[] =
    exposureWarnings.length > 0
      ? exposureWarnings
      : [
          { text: "4 leagues exposed to Ja'Marr Chase" },
          { text: '3 leagues exposed to Marvin Harrison Jr.' },
          { text: '3 leagues exposed to CeeDee Lamb' },
        ];

  return (
    <div className="flex h-full min-h-0 flex-col gap-[9px] overflow-hidden border-l border-border bg-bg p-[11px]">
      <RosterBreakdown breakdown={breakdown} />

      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="shrink-0 border-b border-border bg-bg px-[13px] py-2">
          <span className="font-figtree text-[9.5px] font-bold uppercase tracking-[1.5px] text-text">
            Exposure Risk
          </span>
        </div>
        <div className="px-[13px] py-2.5">
          {defaultWarnings.map((w) => (
            <div
              key={w.text}
              className="flex items-start gap-[7px] border-b border-border/35 py-1.5 font-figtree text-[11px] leading-snug text-text last:border-b-0"
            >
              <span className="shrink-0 pt-px text-[13px] text-hold">⚠</span>
              <span>{w.text}</span>
            </div>
          ))}
          <Link
            href="/exposure"
            className="mt-2 block font-mono text-[9px] text-boom no-underline hover:underline"
          >
            View Full Exposure Report →
          </Link>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="shrink-0 border-b border-border bg-bg px-[13px] py-2">
          <span className="font-figtree text-[10px] font-bold uppercase tracking-[1.5px] text-text">
            Overvalued Assets
          </span>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[13px] py-2">
          {overvalued.length === 0 ? (
            <p className="py-3 font-mono text-[11px] text-muted">
              No meaningful overvalue signals yet — market comparison data syncing.
            </p>
          ) : (
            overvalued.map((asset) => (
              <div
                key={asset.playerId}
                className="flex items-center gap-[9px] border-b border-border/35 py-1.5 last:border-b-0"
              >
                <PlayerThumb playerId={asset.playerId} playerName={asset.playerName} />
                <div className="min-w-0 flex-1">
                  <div className="font-figtree text-[12px] font-semibold text-text">
                    {asset.playerName}
                  </div>
                  <div className="font-mono text-[10px] text-muted">
                    {asset.position} · {asset.team}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-[12px] font-bold text-[#ef4444]">
                    +{asset.delta.toFixed(1)}
                  </div>
                  <div className="font-mono text-[8px] tracking-wide text-[#ef4444]">OVERVALUE</div>
                </div>
              </div>
            ))
          )}
          <Link
            href="/players?sort=overvalued"
            className="mt-2 block font-mono text-[9px] text-boom no-underline hover:underline"
          >
            View Full DPEM Report →
          </Link>
          <div className="mt-2.5 rounded-[7px] border border-muted/15 bg-boom/[0.018] p-[9px] text-center">
            <div className="mb-1 font-mono text-[7px] uppercase tracking-[2px] text-muted/40">
              Sponsored
            </div>
            <div className="font-figtree text-base font-extrabold tracking-wide text-bust/55">
              PRIZEPICKS
            </div>
            <div className="mt-0.5 font-mono text-[7px] text-muted/40">
              Daily Fantasy · Join Free
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
