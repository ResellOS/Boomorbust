'use client';

import PortfolioExposurePanel from './PortfolioExposurePanel';
import BobRecordWidget from './BobRecordWidget';
import type { ExposedPlayerRow, NoExposureRow } from '@/lib/dashboard/portfolioExposure';

interface RightPanelProps {
  mostExposed: ExposedPlayerRow[];
  noExposure: NoExposureRow[];
}

export default function RightPanel({ mostExposed, noExposure }: RightPanelProps) {
  return (
    <div className="flex min-h-0 flex-col gap-2 overflow-y-auto border-l border-[#1e2640] bg-[#0a0d14] p-[11px] lg:h-full lg:overflow-hidden">
      <PortfolioExposurePanel mostExposed={mostExposed} noExposure={noExposure} />
      <BobRecordWidget />
    </div>
  );
}
