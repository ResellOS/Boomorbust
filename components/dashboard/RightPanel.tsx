'use client';

import PortfolioExposurePanel from './PortfolioExposurePanel';
import BobRecordWidget from './BobRecordWidget';
import LeagueIntelSpotlight from './LeagueIntelSpotlight';
import FrontOfficeTasks from './FrontOfficeTasks';
import type { ExposedPlayerRow, NoExposureRow } from '@/lib/dashboard/portfolioExposure';
import type { LeagueIntelSpotlight as LeagueIntelData } from '@/lib/dashboard/leagueIntel';
import type { DailyTask } from '@/lib/dashboard/dailyTasks';
import type { LineupOpportunity } from '@/lib/dashboard/rotation';

interface RightPanelProps {
  mostExposed: ExposedPlayerRow[];
  noExposure: NoExposureRow[];
  leagueIntel: LeagueIntelData | null;
  leagueIntelHref?: string;
  dailyTasks: DailyTask[];
  lineupOpportunity: LineupOpportunity | null;
  showTasksInRail?: boolean;
}

export default function RightPanel({
  mostExposed,
  noExposure,
  leagueIntel,
  leagueIntelHref,
  dailyTasks,
  lineupOpportunity,
  showTasksInRail = true,
}: RightPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto border-l border-[#1e2640] bg-[#0a0d14] p-[11px] lg:h-full lg:overflow-hidden">
      {showTasksInRail ? (
        <FrontOfficeTasks initialTasks={dailyTasks} lineupOpportunity={lineupOpportunity} compact />
      ) : (
        <PortfolioExposurePanel mostExposed={mostExposed} noExposure={noExposure} />
      )}
      <LeagueIntelSpotlight data={leagueIntel} intelHref={leagueIntelHref} />
      {!showTasksInRail ? null : (
        <PortfolioExposurePanel mostExposed={mostExposed} noExposure={noExposure} />
      )}
      <BobRecordWidget />
    </div>
  );
}
