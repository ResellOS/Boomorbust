interface StartSitFooterProps {
  seasonRecord: string;
  winRate: number;
  weekCalls: number;
  leagueCount: number;
  nflWeek: number;
  lastRunMinutes?: number;
}

export default function StartSitFooter({
  seasonRecord,
  winRate,
  weekCalls,
  leagueCount,
  nflWeek,
  lastRunMinutes = 8,
}: StartSitFooterProps) {
  return (
    <footer
      className="col-span-1 md:col-span-2 row-start-3 hidden md:flex h-7 shrink-0 items-center justify-between border-t border-border bg-surface px-3.5"
    >
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wide text-muted">
        <span className="h-[5px] w-[5px] rounded-full bg-boom" />
        Engine Status <span className="text-boom">Optimal</span>
        <span>· Last run: {lastRunMinutes} min ago</span>
      </div>
      <div className="text-[8px] uppercase tracking-wide text-muted">
        Season Record <span className="text-boom">{seasonRecord}</span>
        <span> · {winRate}% Win Rate</span>
      </div>
      <div className="text-[8px] uppercase tracking-wide text-muted">
        Week {nflWeek === 0 ? 'Preseason' : nflWeek} Calls <span className="text-boom">{weekCalls}</span>
        <span> · {nflWeek === 0 ? 'Preseason Mode' : 'High Confidence'}</span>
      </div>
      <div className="flex items-center gap-1 text-[8px] uppercase tracking-wide text-muted">
        League Sync <span className="text-boom">{leagueCount}/{leagueCount}</span>
        <span className="ml-1 h-[5px] w-[5px] rounded-full bg-boom" />
        All Connected
      </div>
    </footer>
  );
}
