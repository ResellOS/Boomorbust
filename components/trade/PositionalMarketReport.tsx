'use client';

import type { MarketTemperatureRow } from '@/lib/trade/types';

const FALLBACK: MarketTemperatureRow[] = [
  { position: 'QB', status: 'Market Cooling', icon: '↓' },
  { position: 'RB', status: 'Overpriced', icon: '↑' },
  { position: 'WR', status: 'Strong Buy Window', icon: '↓' },
  { position: 'TE', status: 'Neutral', icon: '→' },
];

const REC: Record<string, string> = {
  QB: 'Buy window opening',
  RB: 'Wait or sell',
  WR: 'Values depressed',
  TE: 'Steady pricing',
};

export default function PositionalMarketReport({
  rows,
  onPositionClick,
}: {
  rows: MarketTemperatureRow[];
  onPositionClick?: (position: string) => void;
}) {
  const data = rows.length > 0 ? rows : FALLBACK;

  return (
    <section className="rounded-[10px] border border-[#1e2640] bg-[#0f1420] px-3 py-2.5">
      <h3 className="font-figtree text-[10px] uppercase tracking-[1.5px] text-[#e8ecf4]">
        Positional Market Report
      </h3>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.map((row) => (
          <button
            key={row.position}
            type="button"
            onClick={() => onPositionClick?.(row.position)}
            className="dash-clickable-row rounded-md border border-[#1e2640]/60 bg-[#141929]/50 px-2 py-2 text-left"
          >
            <div className="font-mono text-[8px] uppercase text-[#6b7a99]">{row.position}</div>
            <div className="mt-0.5 flex items-center gap-1 font-figtree text-[10px] text-[#e8ecf4]">
              <span className="text-boom">{row.icon}</span>
              {row.status}
            </div>
            <div className="mt-0.5 font-mono text-[7px] text-[#8b9bb8]">
              {REC[row.position] ?? 'Monitor pricing'}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
