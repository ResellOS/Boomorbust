'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
  signals: SignalCounts;
  exposureWarnings: ExposureWarning[];
  overvalued: OvervaluedAsset[];
}

const CIRCUMFERENCE = 2 * Math.PI * 44;

function donutArc(count: number, total: number): number {
  if (total <= 0) return 0;
  return (count / total) * CIRCUMFERENCE;
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

export default function RightPanel({ signals, exposureWarnings, overvalued }: RightPanelProps) {
  const { boom, hold, bust, total } = signals;
  const boomArc = donutArc(boom, total);
  const holdArc = donutArc(hold, total);
  const bustArc = donutArc(bust, total);
  const boomPct = total > 0 ? ((boom / total) * 100).toFixed(1) : '0.0';
  const holdPct = total > 0 ? ((hold / total) * 100).toFixed(1) : '0.0';
  const bustPct = total > 0 ? ((bust / total) * 100).toFixed(1) : '0.0';

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
      <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
        <div className="shrink-0 border-b border-border bg-bg px-[13px] py-2">
          <span className="font-figtree text-[9.5px] font-bold uppercase tracking-[1.5px] text-text">
            Boom / Hold / Bust Signals
          </span>
        </div>
        <div className="flex-1 overflow-hidden p-3">
          <div className="relative mx-auto mb-3.5 h-[130px] w-[130px]">
            <svg viewBox="0 0 120 120" className="h-full w-full">
              <circle cx={60} cy={60} r={44} fill="none" stroke="#141929" strokeWidth={18} />
              {boomArc > 0 && (
                <circle
                  cx={60}
                  cy={60}
                  r={44}
                  fill="none"
                  stroke="#36E7A1"
                  strokeWidth={18}
                  strokeDasharray={`${boomArc} ${CIRCUMFERENCE - boomArc}`}
                  strokeDashoffset={0}
                  transform="rotate(-90 60 60)"
                />
              )}
              {holdArc > 0 && (
                <circle
                  cx={60}
                  cy={60}
                  r={44}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth={18}
                  strokeDasharray={`${holdArc} ${CIRCUMFERENCE - holdArc}`}
                  strokeDashoffset={-boomArc}
                  transform="rotate(-90 60 60)"
                />
              )}
              {bustArc > 0 && (
                <circle
                  cx={60}
                  cy={60}
                  r={44}
                  fill="none"
                  stroke="#A78BFA"
                  strokeWidth={18}
                  strokeDasharray={`${bustArc} ${CIRCUMFERENCE - bustArc}`}
                  strokeDashoffset={-(boomArc + holdArc)}
                  transform="rotate(-90 60 60)"
                />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-figtree text-[30px] font-bold leading-none text-text">
                {total}
              </div>
              <div className="mt-0.5 font-mono text-[9px] text-muted">Total</div>
            </div>
          </div>
          {[
            { label: 'BOOM', count: boom, pct: boomPct, color: '#36E7A1', textClass: 'text-boom' },
            { label: 'HOLD', count: hold, pct: holdPct, color: '#FBBF24', textClass: 'text-hold' },
            { label: 'BUST', count: bust, pct: bustPct, color: '#A78BFA', textClass: 'text-bust' },
          ].map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between border-b border-border/40 py-1.5 last:border-b-0"
            >
              <div className="flex items-center gap-[7px]">
                <div className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                <span className={`font-figtree text-[13px] font-bold ${row.textClass}`}>
                  {row.label}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-[10px] text-text">{row.count} players</span>
                <span className="font-mono text-[10px] text-muted">{row.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

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
