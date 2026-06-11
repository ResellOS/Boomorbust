'use client';

interface ExposureFooterProps {
  dangerCount: number;
  leagueCount: number;
  lastRunMinutes?: number;
}

export default function ExposureFooter({
  dangerCount,
  leagueCount,
  lastRunMinutes = 8,
}: ExposureFooterProps) {
  return (
    <footer
      className="col-span-2 row-start-3 grid border-t border-border/50 bg-bg/[0.98]"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', height: 28 }}
    >
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px] text-[10px] text-muted">
        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-boom" />
        Engine Status{' '}
        <span className="ml-1 text-boom">Optimal</span>
        <span className="ml-1">· Last run: {lastRunMinutes} min ago</span>
      </div>
      <div className="flex h-full items-center border-r border-border/40 px-[18px] text-[10px] text-muted">
        Data Accuracy <span className="ml-1 text-boom">99.2%</span>
        <span className="ml-1">· Live Sleeper sync</span>
      </div>
      <div className="flex h-full items-center border-r border-border/40 px-[18px] text-[10px] text-muted">
        Exposure Alerts{' '}
        <span className="ml-1 text-[#ef4444]">{dangerCount}</span>
        <span className="ml-1">· Action Required</span>
      </div>
      <div className="flex h-full items-center px-[18px] text-[10px] text-muted">
        League Sync{' '}
        <span className="ml-1 text-boom">
          {leagueCount}/{leagueCount}
        </span>
        <span className="ml-1.5 inline-block h-[5px] w-[5px] rounded-full bg-boom" />
        <span className="ml-1">All Connected</span>
      </div>
    </footer>
  );
}
