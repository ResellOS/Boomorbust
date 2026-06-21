'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Info } from 'lucide-react';
import { EMPIRE_RATING_TOOLTIP } from '@/lib/dashboard/empireRating';

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

  return (
    <header className="col-span-1 md:col-span-2 row-start-1 grid h-[66px] border-b border-border bg-bg grid-cols-1 md:grid-cols-[215px_1fr]">
      <div className="hidden md:flex items-center justify-center overflow-hidden bg-bg px-1.5 py-1 border-r border-[#1e2640]">
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={203}
          height={58}
          unoptimized
          className="h-full w-full object-contain"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.2) saturate(1.3) contrast(1.1)',
            transform: 'scale(1.08)',
          }}
        />
      </div>

      <div className="flex min-w-0 items-stretch overflow-x-auto scrollbar-hide">
        <Stat label={strengthLabel} value={primaryStrength} accent />
        <Stat label="Today's Priorities" value={String(todaysPriorities)} />
        <Stat label="Leagues" value={String(leagueCount)} accent />
        <Stat
          label="Trade Offers"
          value={String(tradeOffers)}
          sub={pendingOffers > 0 ? `${pendingOffers} pending` : undefined}
          hold={pendingOffers > 0}
        />
        <PortfolioStrengthStat value={portfolioStrength} delta={portfolioDelta} />
      </div>
    </header>
  );
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
        className="mb-[3px] flex items-center gap-1 font-figtree text-[10px] uppercase tracking-[1.2px] text-muted"
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
            <span className="font-mono text-[11px] tabular-nums" style={{ color: deltaColor }}>
              {deltaLabel}
            </span>
            <span className="font-mono text-[8px] text-muted">vs last sync</span>
          </div>
        )}
      </div>
      <div className="font-mono text-[8px] text-muted/80">Dynasty asset score</div>
      <div
        className={`absolute left-2 top-[58px] z-50 w-[260px] rounded-[7px] border border-border bg-surface px-3 py-2.5 font-figtree text-[11px] leading-relaxed text-muted ${
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

function Stat({
  label,
  value,
  sub,
  accent,
  hold,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  hold?: boolean;
}) {
  const color = accent ? 'text-boom' : hold ? 'text-hold' : 'text-text';
  return (
    <div className="flex min-w-[100px] shrink-0 flex-col justify-center border-r border-border px-3 py-1.5 last:border-r-0 md:px-[18px]">
      <div className="mb-[3px] font-figtree text-[10px] uppercase tracking-[1.2px] text-muted">{label}</div>
      <div
        className={`font-mono text-[22px] font-semibold leading-none tracking-[-0.5px] ${color}`}
        style={accent ? GLOW : undefined}
      >
        {value}
      </div>
      {sub ? <div className="mt-0.5 font-mono text-[8px] text-hold">{sub}</div> : null}
    </div>
  );
}
