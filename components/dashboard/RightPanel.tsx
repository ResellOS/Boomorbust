'use client';

import PortfolioExposurePanel from './PortfolioExposurePanel';
import LeagueIntelSpotlight from './LeagueIntelSpotlight';
import type { ExposedPlayerRow } from '@/lib/dashboard/portfolioExposure';
import type { LeagueIntelSpotlight as LeagueIntelData } from '@/lib/dashboard/leagueIntel';

interface RightPanelProps {
  mostExposed: ExposedPlayerRow[];
  leagueIntel: LeagueIntelData | null;
  leagueIntelHref?: string;
}

export default function RightPanel({ mostExposed, leagueIntel, leagueIntelHref }: RightPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto border-l border-[#1e2640] bg-[#0a0d14] p-[11px] lg:h-full lg:overflow-hidden">
      <PortfolioExposurePanel mostExposed={mostExposed} />
      <LeagueIntelSpotlight data={leagueIntel} intelHref={leagueIntelHref} />
    </div>
  );
}
