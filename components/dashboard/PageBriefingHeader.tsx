'use client';

interface PageBriefingHeaderProps {
  contextLabel: string;
  isAll: boolean;
}

export default function PageBriefingHeader({ contextLabel, isAll }: PageBriefingHeaderProps) {
  return (
    <div className="px-0.5">
      <h1 className="font-figtree text-[18px] font-semibold tracking-[0.3px] text-[#e8ecf4] md:text-[20px]">
        Front Office Command Center
      </h1>
      <p className="mt-0.5 font-mono text-[10px] text-[#6b7a99]">
        Your daily dynasty briefing
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
