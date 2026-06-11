import Image from 'next/image';
import type { ExposureTopbarStats } from '@/lib/exposure/types';

interface ExposureTopBarProps {
  stats: ExposureTopbarStats;
}

export default function ExposureTopBar({ stats }: ExposureTopBarProps) {
  const items = [
    {
      label: 'Total Players Tracked',
      value: String(stats.totalPlayersTracked),
      sub: 'Across All Leagues',
      color: 'text-text',
    },
    {
      label: 'High Exposure (3+ Leagues)',
      value: String(stats.highExposureCount),
      sub: `${stats.highExposurePct.toFixed(1)}% of Portfolio`,
      color: 'text-boom',
    },
    {
      label: 'Danger Zone (5+ Leagues)',
      value: String(stats.dangerZoneCount),
      sub: `${stats.dangerZonePct.toFixed(1)}% of Portfolio`,
      color: 'text-[#ef4444]',
    },
    {
      label: 'Portfolio Concentration',
      value: `${Math.round(stats.portfolioConcentration)}%`,
      sub: stats.concentrationLabel,
      color: 'text-hold',
    },
    {
      label: 'Leagues Analyzed',
      value: String(stats.leaguesAnalyzed),
      sub: 'All Connected',
      color: 'text-text',
    },
  ];

  return (
    <header
      className="col-span-2 grid border-b border-border bg-surface"
      style={{ gridTemplateColumns: '215px 1fr', height: 66 }}
    >
      <div
        className="flex items-center justify-center overflow-hidden border-r border-border bg-bg px-3.5"
      >
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
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex flex-col justify-center border-r border-border px-[22px] last:border-r-0"
          >
            <div className="text-[8px] uppercase tracking-wide text-muted whitespace-nowrap">
              {item.label}
            </div>
            <div className={`mt-px font-mono text-lg leading-none ${item.color}`}>
              {item.value}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{item.sub}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
