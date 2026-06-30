'use client';

interface ExposureFooterProps {
  leagueCount: number;
  playerCount: number;
  totalAssetValue: number;
}

export default function ExposureFooter({
  leagueCount,
  playerCount,
  totalAssetValue,
}: ExposureFooterProps) {
  return (
    <footer
      className="col-span-1 md:col-span-2 row-start-3 hidden md:grid border-t border-border/50 bg-bg/[0.98]"
      style={{ gridTemplateColumns: 'repeat(3, 1fr)', height: 28 }}
    >
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px] text-[11px] text-muted">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-boom" />
        Engine Status <span className="ml-1 text-boom">Live</span>
      </div>
      <div className="flex h-full items-center border-r border-border/40 px-[18px] font-mono text-[11px] text-muted">
        Portfolio Value <span className="ml-1 text-boom">{totalAssetValue.toLocaleString()}</span>
        <span className="ml-1">· {playerCount} multi-league</span>
      </div>
      <div className="flex h-full items-center px-[18px] text-[11px] text-muted">
        League Sync{' '}
        <span className="ml-1 text-boom">{leagueCount}</span>
        <span className="ml-1.5 inline-block h-[5px] w-[5px] rounded-full bg-boom" />
        <span className="ml-1">Connected</span>
      </div>
    </footer>
  );
}
