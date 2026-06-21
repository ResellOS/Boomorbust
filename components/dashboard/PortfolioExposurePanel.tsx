'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { ExposedPlayerRow, NoExposureRow } from '@/lib/dashboard/portfolioExposure';

const RISK_COLOR: Record<ExposedPlayerRow['riskLevel'], string> = {
  High: '#EF4444',
  Medium: '#FBBF24',
  Low: '#36E7A1',
};

export default function PortfolioExposurePanel({
  mostExposed,
  noExposure,
}: {
  mostExposed: ExposedPlayerRow[];
  noExposure: NoExposureRow[];
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420]">
      <div className="shrink-0 border-b border-[#1e2640]/80 px-3 py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Exposure Risks
        </span>
      </div>
      <div className="px-3 py-2.5">
        {mostExposed.length === 0 ? (
          <p className="font-figtree text-[10px] text-[#6b7a99]">No meaningful portfolio concentration risks.</p>
        ) : (
          mostExposed.slice(0, 5).map((row) => (
            <div
              key={row.playerId}
              className="flex items-start gap-2 border-b border-[#1e2640]/40 py-2 last:border-b-0"
            >
              <PlayerAvatar playerId={row.playerId} name={row.playerName} size={28} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-figtree text-[11px] text-[#e8ecf4]">{row.playerName}</span>
                  <span className="font-mono text-[8px] tabular-nums text-[#6b7a99]">{row.leagueCount} leagues</span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[8px] uppercase" style={{ color: RISK_COLOR[row.riskLevel] }}>
                    Risk: {row.riskLevel}
                  </span>
                  <span className="font-mono text-[8px] text-[#6b7a99]">{row.riskReason}</span>
                </div>
              </div>
            </div>
          ))
        )}

        {noExposure.length > 0 ? (
          <>
            <div className="mb-2 mt-3 border-t border-[#1e2640]/60 pt-3">
              <span className="font-figtree text-[9px] uppercase tracking-[1.2px] text-[#e8ecf4]">
                Zero Exposure Targets
              </span>
            </div>
            {noExposure.slice(0, 2).map((row) => (
              <div
                key={row.playerId}
                className="flex items-center justify-between gap-2 border-b border-[#1e2640]/40 py-1.5 last:border-b-0"
              >
                <span className="truncate font-figtree text-[11px] text-[#e8ecf4]">{row.playerName}</span>
                <span className="font-mono text-[9px] tabular-nums text-boom">
                  BOB {row.bobRating.toFixed(0)}
                </span>
              </div>
            ))}
          </>
        ) : null}

        <Link
          href="/exposure"
          className="mt-2 block font-mono text-[9px] text-boom no-underline hover:underline"
        >
          View Exposure Report →
        </Link>
      </div>
    </div>
  );
}
