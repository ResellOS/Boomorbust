import Image from 'next/image';
import type { StartSitTopbar } from '@/lib/startsit/types';

interface StartSitTopBarProps {
  stats: StartSitTopbar;
  isOffseason?: boolean;
}

function formatUpdated(minutes: number): string {
  if (minutes <= 0) return 'Just now';
  return `${minutes} min ago`;
}

function formatGain(pts: number): string {
  if (pts <= 0) return '—';
  return `+${pts.toFixed(1)} pts`;
}

export default function StartSitTopBar({ stats, isOffseason = false }: StartSitTopBarProps) {
  const preseason = isOffseason || stats.confidenceLevel === 'Preseason';
  const decisionsCount = stats.decisionsToday ?? stats.thisWeekCalls;

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
      sub: preseason ? 'Tracking begins Week 1' : 'Verified Performance',
      color: 'text-boom',
    },
    {
      label: 'Decisions Today',
      value: String(decisionsCount),
      sub: preseason ? 'Preseason projections' : 'Lineup changes identified',
      color: 'text-text',
    },
    {
      label: 'Expected Gain',
      value: formatGain(stats.expectedGain ?? 0),
      sub: preseason ? 'If all calls followed' : 'Projected edge',
      color: 'text-boom',
    },
    {
      label: 'Confidence Level',
      value: preseason ? 'Preseason' : stats.confidenceLevel,
      sub: preseason ? '2025 data · builds Week 1' : 'Model consensus',
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
    <header className="col-span-1 md:col-span-2 row-start-1 grid h-[58px] border-b border-border bg-surface grid-cols-1 md:grid-cols-[215px_1fr]">
      <div className="hidden md:flex items-center border-r border-border px-3">
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
      <div className="flex overflow-x-auto scrollbar-hide md:grid md:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-[110px] shrink-0 flex-col justify-center border-r border-border px-3 last:border-r-0 md:min-w-0 md:px-[14px]"
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
