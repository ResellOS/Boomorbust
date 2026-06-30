import Image from 'next/image';
import type { ExposureTopbarStats } from '@/lib/exposure/types';

interface ExposureTopBarProps {
  stats: ExposureTopbarStats;
}

function riskColor(risk: string): string {
  if (risk === 'HIGH') return '#EF4444';
  if (risk === 'MEDIUM') return '#FBBF24';
  return '#36E7A1';
}

function gradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#36E7A1';
  if (grade.startsWith('B')) return '#FBBF24';
  if (grade === '—') return '#64748B';
  return '#EF4444';
}

function formatUpdated(minutes: number): string {
  if (minutes <= 0) return 'Just now';
  return `${minutes} min ago`;
}

export default function ExposureTopBar({ stats }: ExposureTopBarProps) {
  const items = [
    {
      label: 'Total Asset Value',
      value: stats.totalAssetValue.toLocaleString(),
      sub: 'TFO × 100 proxy',
      color: 'text-text',
    },
    {
      label: 'Leagues',
      value: String(stats.leaguesConnected),
      sub: 'All synced',
      color: 'text-text',
    },
    {
      label: 'Championship Odds',
      value: `${stats.championshipOdds}%`,
      sub: 'Estimated',
      color: 'text-boom',
    },
    {
      label: 'Portfolio Risk',
      value: stats.portfolioRisk,
      sub: 'Concentration scan',
      color: '',
      style: { color: riskColor(stats.portfolioRisk) },
    },
    {
      label: 'Largest Position',
      value: stats.largestPosition,
      sub: 'By TFO weight',
      color: 'text-text',
    },
    {
      label: 'Portfolio Grade',
      value: stats.portfolioGrade,
      sub: 'vs pool average',
      color: '',
      style: { color: gradeColor(stats.portfolioGrade) },
    },
    {
      label: 'Last Updated',
      value: formatUpdated(stats.lastUpdatedMinutes),
      sub: 'Live sync',
      color: 'text-text',
      small: true,
    },
  ];

  return (
    <header className="col-span-1 md:col-span-2 row-start-1 grid h-[66px] border-b border-border bg-surface grid-cols-1 md:grid-cols-[215px_1fr]">
      <div className="hidden md:flex items-center justify-center overflow-hidden border-r border-border bg-bg px-3.5">
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
      <div className="flex overflow-x-auto scrollbar-hide md:grid md:grid-cols-7">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex min-w-[115px] shrink-0 flex-col justify-center border-r border-border px-3 last:border-r-0 md:min-w-0 md:px-[12px]"
          >
            <div className="whitespace-nowrap text-[9px] uppercase tracking-wide text-muted">
              {item.label}
            </div>
            <div
              className={`mt-px font-mono leading-none ${item.color} ${
                item.small ? 'text-sm' : 'text-lg'
              }`}
              style={item.style}
            >
              {item.value}
            </div>
            <div className="mt-0.5 text-[10px] text-muted">{item.sub}</div>
          </div>
        ))}
      </div>
    </header>
  );
}
