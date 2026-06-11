import Image from 'next/image';
import type { PlayerHubStats } from '@/lib/players/types';

interface PlayerHubTopBarProps {
  stats: PlayerHubStats;
}

function formatLastUpdated(minutes: number): string {
  if (minutes <= 0) return 'Just now';
  if (minutes === 1) return '1 min ago';
  return `${minutes} min ago`;
}

export default function PlayerHubTopBar({ stats }: PlayerHubTopBarProps) {
  const boomPct =
    stats.playersTracked > 0
      ? ((stats.boomPlayers / stats.playersTracked) * 100).toFixed(1)
      : '0.0';
  const bustPct =
    stats.playersTracked > 0
      ? ((stats.bustPlayers / stats.playersTracked) * 100).toFixed(1)
      : '0.0';

  const items = [
    {
      label: 'Players Tracked',
      value: stats.playersTracked.toLocaleString(),
      desc: 'Across All Leagues',
      color: 'text-text',
      small: false,
    },
    {
      label: 'Boom Players',
      value: String(stats.boomPlayers),
      desc: `Top ${boomPct}%`,
      color: 'text-boom',
      small: false,
    },
    {
      label: 'Bust Players',
      value: String(stats.bustPlayers),
      desc: `Bottom ${bustPct}%`,
      color: 'text-bust',
      small: false,
    },
    {
      label: 'Avg Dynasty Rating',
      value: stats.avgDynastyRating.toFixed(1),
      desc: 'vs League Avg 50.1',
      color: 'text-boom',
      small: false,
    },
    {
      label: 'Last Updated',
      value: formatLastUpdated(stats.lastUpdatedMinutes),
      desc: 'Next update in 22:41',
      color: 'text-text',
      small: true,
    },
  ] as const;

  return (
    <header
      className="col-span-2 grid border-b border-border bg-bg"
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
            transformOrigin: 'center',
          }}
        />
      </div>
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center border-r border-border px-[18px] py-1.5 last:border-r-0"
          >
            <div className="mb-[3px] font-mono text-[7.5px] uppercase tracking-[1.5px] text-muted">
              {item.label}
            </div>
            <div
              className={`font-figtree font-normal leading-none tracking-[-0.5px] ${item.color} ${
                item.small ? 'text-xl' : 'text-[26px]'
              }`}
            >
              {item.value}
            </div>
            <div className="mt-0.5 font-mono text-[7.5px] text-muted">{item.desc}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
