'use client';

import Link from 'next/link';
import { exposureHref } from '@/lib/dashboard/dashboardRoutes';
import type { ExposedPlayerRow } from '@/lib/dashboard/portfolioExposure';

const RISK_COLOR: Record<ExposedPlayerRow['riskLevel'], string> = {
  High: '#EF4444',
  Medium: '#FBBF24',
  Low: '#36E7A1',
};

export default function PortfolioExposurePanel({ mostExposed }: { mostExposed: ExposedPlayerRow[] }) {
  const rows = mostExposed.slice(0, 5);
  const hasHighRisk = rows.some((r) => r.riskLevel === 'High');

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[10px] border border-[#1e2640] bg-[#0f1420] ${hasHighRisk ? 'dash-bust-glow' : ''}`}
    >
      <div className="shrink-0 border-b border-[#1e2640]/80 px-3 py-2">
        <span className="font-figtree text-[9.5px] uppercase tracking-[1.5px] text-[#e8ecf4]">
          Exposure Risks
        </span>
      </div>
      <div className="px-3 py-2">
        {rows.length === 0 ? (
          <p className="py-1 font-mono text-[9px] text-[#6b7a99]">No high-risk concentration detected.</p>
        ) : (
          rows.map((row) => (
            <Link
              key={row.playerId}
              href={exposureHref(row.playerId)}
              className="dash-clickable-row flex items-center justify-between gap-2 border-b border-[#1e2640]/40 py-1.5 no-underline last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate font-figtree text-[11px] text-[#e8ecf4]">{row.playerName}</div>
                <div className="font-mono text-[8px] tabular-nums text-[#8b9bb8]">
                  {row.leagueCount} leagues
                  {row.exposurePct > 0 ? ` · ${row.exposurePct}% exposure` : ''}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-mono text-[8px] uppercase" style={{ color: RISK_COLOR[row.riskLevel] }}>
                  Risk: {row.riskLevel}
                </span>
              </div>
            </Link>
          ))
        )}
        <Link
          href="/exposure"
          className="dash-action-btn mt-2 block font-mono text-[9px] text-boom no-underline"
        >
          View Exposure Report →
        </Link>
      </div>
    </div>
  );
}
