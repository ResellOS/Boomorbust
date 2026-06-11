'use client';

import { useEffect, useState } from 'react';

interface FooterProps {
  leagueCount: number;
  edgeOpportunities: number;
  lastRunMinutes?: number;
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function Footer({
  leagueCount,
  edgeOpportunities,
  lastRunMinutes = 8,
}: FooterProps) {
  const [countdown, setCountdown] = useState(23 * 60 + 41);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 24 * 60));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <footer
      className="col-span-2 row-start-3 grid border-t border-border/50 bg-bg/[0.98]"
      style={{ gridTemplateColumns: 'repeat(4, 1fr)', height: 28 }}
    >
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <span className="h-1.5 w-1.5 shrink-0 animate-dashboard-pulse rounded-full bg-boom" />
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Engine Status
          </div>
          <div className="font-figtree text-sm font-bold text-boom">Optimal</div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">
          Last run: {lastRunMinutes} min ago
        </span>
      </div>
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Data Accuracy
          </div>
          <div className="font-figtree text-sm font-bold text-text">99.2%</div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">
          Next update in {formatCountdown(countdown)}
        </span>
      </div>
      <div className="flex h-full items-center gap-2 border-r border-border/40 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Edge Opportunities
          </div>
          <div className="font-figtree text-sm font-bold text-boom">{edgeOpportunities}</div>
        </div>
        <span className="ml-1.5 font-mono text-[7.5px] text-muted">
          High-Value Targets Available
        </span>
      </div>
      <div className="flex h-full items-center gap-2 px-[18px]">
        <div>
          <div className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            League Sync
          </div>
          <div className="font-figtree text-sm font-bold text-boom">
            {leagueCount}/{leagueCount}
          </div>
        </div>
        <div className="ml-1.5 flex items-center gap-[5px]">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-boom" />
          <span className="font-mono text-[7.5px] text-muted">All Connected</span>
        </div>
      </div>
    </footer>
  );
}
