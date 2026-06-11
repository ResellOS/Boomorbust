import Image from 'next/image';
import type { StartSitTopbar } from '@/lib/startsit/types';

interface StartSitTopBarProps {
  stats: StartSitTopbar;
}

function formatUpdated(minutes: number): string {
  if (minutes <= 0) return 'Just now';
  return `${minutes} min ago`;
}

export default function StartSitTopBar({ stats }: StartSitTopBarProps) {
  const items = [
    {
      label: 'Season Record',
      value: stats.seasonRecord,
      sub: `${stats.seasonWinRate}% Win Rate`,
      color: 'text-text',
    },
    {
      label: 'Win Rate',
      value: `${stats.seasonWinRate}%`,
      sub: 'Verified Performance',
      color: 'text-boom',
    },
    {
      label: "This Week's Calls",
      value: String(stats.thisWeekCalls),
      sub: `${stats.confidenceLevel} Confidence`,
      color: 'text-text',
    },
    {
      label: 'Confidence Level',
      value: stats.confidenceLevel,
      sub: 'Strong Model Consensus',
      color: 'text-boom',
    },
    {
      label: 'Last Updated',
      value: formatUpdated(stats.lastUpdatedMinutes),
      sub: 'Live Data Sync',
      color: 'text-text',
      small: true,
    },
  ];

  return (
    <header
      className="col-span-2 grid border-b border-border bg-surface"
      style={{ gridTemplateColumns: '215px 1fr', height: 58 }}
    >
      <div className="flex items-center border-r border-border px-3">
        <Image
          src="/logo.png"
          alt="Boom or Bust"
          width={180}
          height={42}
          unoptimized
          className="h-[42px] w-auto object-contain"
          style={{
            mixBlendMode: 'screen',
            filter: 'brightness(1.2) saturate(1.3) contrast(1.1)',
            transform: 'scale(1.08)',
          }}
        />
      </div>
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center border-r border-border px-[18px] last:border-r-0"
          >
            <div className="text-[8px] uppercase tracking-wide text-muted whitespace-nowrap">
              {item.label}
            </div>
            <div
              className={`mt-px font-mono leading-none ${item.color} ${
                item.small ? 'text-sm' : 'text-lg'
              }`}
            >
              {item.value}
            </div>
            <div className="mt-px text-[9px] text-muted">{item.sub}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
