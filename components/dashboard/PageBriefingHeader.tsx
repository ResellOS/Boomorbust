'use client';

interface PageBriefingHeaderProps {
  contextLabel: string;
  isAll: boolean;
  viewSubtitle: string;
}

export default function PageBriefingHeader({ contextLabel, isAll, viewSubtitle }: PageBriefingHeaderProps) {
  return (
    <div className="px-0.5">
      <h1 className="font-figtree text-[18px] font-semibold tracking-[0.3px] text-[#e8ecf4] md:text-[20px]">
        Front Office Command Center
      </h1>
      <p className="mt-0.5 font-mono text-[10px] text-[#8b9bb8]">
        Your daily dynasty briefing · {viewSubtitle}
        {!isAll ? (
          <>
            {' '}
            · <span className="text-[#e8ecf4]">{contextLabel}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
