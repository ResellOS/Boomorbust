import Image from 'next/image';
import type { PerformanceStats } from '@/lib/performance/types';
import { fmtPct } from '@/lib/performance/utils';

interface PerformanceTopBarProps {
  stats: PerformanceStats;
}

export default function PerformanceTopBar({ stats }: PerformanceTopBarProps) {
  const hasData = stats.hasSeasonData;

  const items = hasData
    ? [
        {
          label: 'Total Calls Tracked',
          value: String(stats.totalCalls),
          sub: 'Logged recommendations',
          color: 'text-text',
        },
        {
          label: 'BOB Accuracy',
          value: fmtPct(stats.bobAccuracy),
          sub: 'Correct calls',
          color: 'text-boom',
        },
        {
          label: 'Consensus Accuracy',
          value: fmtPct(stats.consensusAccuracy),
          sub: 'FantasyPros baseline',
          color: stats.consensusAccuracy != null ? 'text-bust' : 'text-muted',
        },
        {
          label: 'Edge',
          value:
            stats.edge != null
              ? `${stats.edge >= 0 ? '+' : ''}${stats.edge.toFixed(1)}%`
              : '--',
          sub: 'BOB vs consensus',
          color:
            stats.edge != null && stats.edge > 0
              ? 'text-boom'
              : stats.edge != null && stats.edge < 0
                ? 'text-bust'
                : 'text-muted',
        },
      ]
    : [
        {
          label: 'Total Calls',
          value: '0',
          sub: 'Season starts Week 1',
          color: 'text-text',
        },
        {
          label: 'Accuracy',
          value: '--',
          sub: 'Tracking begins Week 1',
          color: 'text-muted',
        },
        {
          label: 'vs Consensus',
          value: '--',
          sub: 'FantasyPros baseline ready',
          color: 'text-muted',
        },
        {
          label: 'Edge',
          value: '--',
          sub: 'Builds over the season',
          color: 'text-muted',
        },
      ];

  return (
    <header
      className="grid border-b border-border bg-surface"
      style={{ gridTemplateColumns: '215px 1fr', height: 66 }}
    >
      <div className="flex items-center justify-center overflow-hidden border-r border-border bg-bg px-3.5">
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={203}
          height={58}
          unoptimized
          className="h-[42px] w-auto object-contain"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.2) saturate(1.3) contrast(1.1)',
            transform: 'scale(1.08)',
            transformOrigin: 'center',
          }}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center border-r border-border px-[18px] last:border-r-0"
          >
            <div className="font-mono text-[7.5px] uppercase tracking-[1.5px] text-muted">
              {item.label}
            </div>
            <div
              className={`font-mono text-[22px] font-normal leading-none tracking-[-0.5px] md:text-[26px] ${item.color}`}
            >
              {item.value}
            </div>
            <div className="mt-0.5 font-mono text-[7.5px] text-muted">{item.sub}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
