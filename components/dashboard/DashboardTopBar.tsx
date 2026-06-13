'use client';

import Image from 'next/image';

export interface DashboardTopBarProps {
  leagueCount: number;
  playersRostered: number;
  tradeOffers: number;
  dynastyEdge: number;
  empireRating: number;
  contextLabel: string;
}

const GLOW = { textShadow: '0 0 9px rgba(54,231,161,0.45)' } as const;

export default function DashboardTopBar({
  leagueCount,
  playersRostered,
  tradeOffers,
  dynastyEdge,
  empireRating,
  contextLabel,
}: DashboardTopBarProps) {
  const showEdge = dynastyEdge > 0;

  return (
    <header
      className="col-span-2 row-start-1 grid border-b border-border bg-bg"
      style={{ gridTemplateColumns: '215px 1fr', height: 66 }}
    >
      <div
        className="flex items-center justify-center overflow-hidden bg-bg px-1.5 py-1"
        style={{ borderRight: '1px solid #1e2640' }}
      >
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

      <div className="flex items-stretch">
        <div className="flex min-w-0 flex-col justify-center border-r border-border px-[18px] py-1.5">
          <div
            className="truncate font-figtree text-[16px] font-semibold leading-tight text-text"
            title={contextLabel}
          >
            {contextLabel}
          </div>
        </div>
        <Stat label="Leagues" value={String(leagueCount)} accent />
        <Stat label="Players Rostered" value={String(playersRostered)} />
        <Stat label="Trade Offers" value={String(tradeOffers)} hold />
        {showEdge && <Stat label="Dynasty Edge" value={`+${dynastyEdge.toFixed(1)}`} accent />}
        <Stat
          label="Empire Rating"
          value={empireRating.toFixed(1)}
          accent
          tooltip="Empire Rating — your dynasty portfolio score vs league average. Top 18% of users."
        />
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  accent,
  hold,
  tooltip,
}: {
  label: string;
  value: string;
  accent?: boolean;
  hold?: boolean;
  tooltip?: string;
}) {
  const color = accent ? 'text-boom' : hold ? 'text-hold' : 'text-text';
  return (
    <div className="group relative flex flex-col justify-center border-r border-border px-[18px] py-1.5 last:border-r-0">
      <div className="mb-[3px] font-figtree text-[10px] uppercase tracking-[1.2px] text-muted">{label}</div>
      <div
        className={`font-mono text-[22px] font-semibold leading-none tracking-[-0.5px] ${color}`}
        style={accent ? GLOW : undefined}
      >
        {value}
      </div>
      {tooltip && (
        <div className="pointer-events-none absolute left-2 top-[58px] z-50 hidden w-[230px] rounded-[7px] border border-border bg-surface px-3 py-2 font-figtree text-[11px] leading-snug text-muted shadow-lg group-hover:block">
          {tooltip}
        </div>
      )}
    </div>
  );
}
