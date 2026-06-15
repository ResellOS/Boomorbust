import Image from 'next/image';
import type { TradePageStats } from '@/lib/trade/types';

interface TradeTopBarProps {
  stats: TradePageStats;
}

const CELLS = [
  { key: 'openOffers' as const, label: 'Open Offers', desc: 'Pending Review', color: 'text-boom' },
  { key: 'acceptedThisWeek' as const, label: 'Accepted This Week', desc: 'Last 7 Days', color: 'text-text' },
  { key: 'avgRosterTfo' as const, label: 'Avg Roster TFO', desc: 'Across Rostered', color: 'text-boom', format: (v: number) => (v > 0 ? v.toFixed(1) : '—') },
  { key: 'smartCounterUses' as const, label: 'Smart Counter Uses', desc: 'All Time', color: 'text-hold' },
  { key: 'leaguesActive' as const, label: 'Leagues Active', desc: 'All Connected', color: 'text-text' },
];

export default function TradeTopBar({ stats }: TradeTopBarProps) {
  return (
    <header
      className="col-span-2 grid border-b border-border bg-bg"
      style={{ gridTemplateColumns: '215px 1fr', height: 66 }}
    >
      <div className="flex items-center justify-center overflow-hidden border-r border-border bg-bg px-1.5 py-1">
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
      <div className="grid grid-cols-5">
        {CELLS.map((cell) => {
          const raw = stats[cell.key];
          const display = 'format' in cell && cell.format ? cell.format(raw) : String(raw);
          return (
            <div
              key={cell.key}
              className="flex flex-col justify-center border-r border-border px-[18px] py-1.5 last:border-r-0"
            >
              <div className="mb-[3px] font-mono text-[7.5px] uppercase tracking-[1.5px] text-muted">
                {cell.label}
              </div>
              <div
                className={`font-figtree text-[27px] font-bold leading-none tracking-[-0.5px] ${cell.color}`}
              >
                {display}
              </div>
              <div className="mt-0.5 font-figtree text-[8px] text-muted">{cell.desc}</div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
