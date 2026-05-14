'use client';

import IncomingOffersPanel from '../IncomingOffersPanel';
import SmartCounterPanel from '../SmartCounterPanel';

/**
 * INCOMING OFFERS tab: 53% / 47% columns, gap-4, equal height on lg;
 * mobile stacks (offers first, Smart Counter second).
 */
export default function IncomingOffersTabPanel() {
  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-4">
      <div className="flex min-h-0 w-full min-w-0 flex-col lg:w-[53%] lg:max-w-[53%] lg:shrink-0">
        <IncomingOffersPanel />
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-col lg:w-[47%] lg:max-w-[47%] lg:shrink-0">
        <SmartCounterPanel className="flex h-full min-h-0 w-full flex-col lg:max-w-none" />
      </div>
    </div>
  );
}
