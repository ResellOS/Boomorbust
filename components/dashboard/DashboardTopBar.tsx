'use client';

import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { EMPIRE_RATING_TOOLTIP } from '@/lib/dashboard/empireRating';
import StatBar, { type StatBarCell } from '@/components/common/StatBar';

export interface DashboardTopBarProps {
  leagueCount: number;
  tradeOffers: number;
  pendingOffers: number;
  todaysPriorities: number;
  portfolioStrength: number;
  portfolioDelta: number | null;
  strengthLabel?: string;
  strengthDisplay?: string;
}

const GLOW = { textShadow: '0 0 9px rgba(54,231,161,0.45)' } as const;

export default function DashboardTopBar({
  leagueCount,
  tradeOffers,
  pendingOffers,
  todaysPriorities,
  portfolioStrength,
  portfolioDelta,
  strengthLabel = 'Portfolio Strength',
  strengthDisplay,
}: DashboardTopBarProps) {
  const primaryStrength = strengthDisplay ?? portfolioStrength.toFixed(1);

  const cells: StatBarCell[] = [
    { label: strengthLabel, value: primaryStrength, tone: 'boom', glow: true },
    { label: "Today's Priorities", value: todaysPriorities },
    { label: 'Leagues', value: leagueCount, tone: 'boom', glow: true },
    {
      label: 'Trade Offers',
      value: tradeOffers,
      tone: pendingOffers > 0 ? 'hold' : 'text',
      sub:
        pendingOffers > 0 ? (
          <span className="text-hold">{pendingOffers} pending</span>
        ) : undefined,
    },
    { raw: <PortfolioStrengthStat value={portfolioStrength} delta={portfolioDelta} /> },
  ];

  return <StatBar cells={cells} />;
}

function PortfolioStrengthStat({ value, delta }: { value: number; delta: number | null }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const deltaColor = delta != null && delta > 0 ? '#36E7A1' : '#A78BFA';
  const deltaLabel = delta != null ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}` : null;

  return (
    <div
      ref={rootRef}
      className="group relative flex min-w-[120px] shrink-0 flex-col justify-center border-r border-border px-3 py-1.5 last:border-r-0 md:min-w-[140px] md:px-[18px]"
    >
      <button
        type="button"
        className="mb-[3px] flex items-center gap-1 font-figtree text-[11px] uppercase tracking-[1.2px] text-muted"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Empire Rating info"
      >
        Empire Rating
        <Info className="h-3 w-3 opacity-60" strokeWidth={2} />
      </button>
      <div className="flex items-baseline gap-2">
        <div className="font-mono text-[22px] font-semibold leading-none tracking-[-0.5px] text-boom" style={GLOW}>
          {value.toFixed(1)}
        </div>
        {deltaLabel != null && (
          <div className="flex flex-col leading-none">
            <span className="font-mono text-[12px] tabular-nums" style={{ color: deltaColor }}>
              {deltaLabel}
            </span>
            <span className="font-mono text-[9px] text-muted">vs last sync</span>
          </div>
        )}
      </div>
      <div className="font-mono text-[9px] text-muted/80">Dynasty asset score</div>
      <div
        className={`absolute left-2 top-[58px] z-50 w-[260px] rounded-[7px] border border-border bg-surface px-3 py-2.5 font-figtree text-[12px] leading-relaxed text-muted ${
          open ? 'block' : 'hidden md:group-hover:block'
        }`}
        role="tooltip"
      >
        {EMPIRE_RATING_TOOLTIP.split('\n\n').map((block, i) => (
          <p key={i} className={i > 0 ? 'mt-2' : undefined}>
            {block}
          </p>
        ))}
      </div>
    </div>
  );
}
