import Image from 'next/image';
import type { TradePageStats } from '@/lib/trade/types';

interface TradeTopBarProps {
  stats: TradePageStats;
}

export default function TradeTopBar({ stats }: TradeTopBarProps) {
  const cells = [
    { label: 'Open Offers', value: String(stats.openOffers), desc: 'Pending Review', color: 'text-boom' },
    { label: 'Accepted This Week', value: String(stats.acceptedThisWeek), desc: 'Last 7 Days', color: 'text-text' },
    {
      label: 'Championship Odds',
      value: stats.championshipOdds > 0 ? `${stats.championshipOdds}%` : '—',
      desc: 'Across Rostered',
      color: 'text-boom',
    },
    {
      label: 'Trade Opportunities',
      value: String(stats.tradeOpportunities),
      desc: 'Available',
      color: 'text-hold',
    },
    { label: 'Leagues Active', value: String(stats.leaguesActive), desc: 'All Connected', color: 'text-text' },
  ];

  return (
    <header className="col-span-1 md:col-span-2 row-start-1 grid h-[66px] border-b border-border bg-bg grid-cols-1 md:grid-cols-[215px_1fr]">
      <div className="hidden md:flex items-center justify-center overflow-hidden border-r border-border bg-bg px-1.5 py-1">
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
          }}
        />
      </div>
      <div className="flex overflow-x-auto scrollbar-hide md:grid md:grid-cols-5">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="flex min-w-[110px] shrink-0 flex-col justify-center border-r border-border px-3 py-1.5 last:border-r-0 md:min-w-0 md:px-[18px]"
          >
            <div className="mb-[3px] font-mono text-[8.5px] uppercase tracking-[1.5px] text-muted">
              {cell.label}
            </div>
            <div className={`font-figtree text-[27px] leading-none tracking-[-0.5px] ${cell.color}`}>
              {cell.value}
            </div>
            <div className="mt-0.5 font-figtree text-[9px] text-muted">{cell.desc}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
