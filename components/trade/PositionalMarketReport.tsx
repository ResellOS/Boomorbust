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

/** Normalize a market-temperature status into a colored badge. */
function statusBadge(status: string): { label: string; color: string; bg: string } {
  const s = status.toLowerCase();
  if (s.includes('buy')) return { label: 'BUY WINDOW', color: '#36E7A1', bg: 'rgba(54,231,161,0.12)' };
  if (s.includes('hot') || s.includes('overpriced')) {
    return { label: 'HOT', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' };
  }
  if (s.includes('neutral') || s.includes('cooling')) {
    return { label: 'NEUTRAL', color: '#6b7a99', bg: 'rgba(107,122,153,0.12)' };
  }
  return { label: status.toUpperCase(), color: '#8b9bb8', bg: 'rgba(139,155,184,0.12)' };
}

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
      <h3 className="font-figtree text-[11px] uppercase tracking-[1.5px] text-[#e8ecf4]">
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
            <div className="font-mono text-[9px] uppercase text-[#6b7a99]">{row.position}</div>
            {(() => {
              const badge = statusBadge(row.status);
              return (
                <div className="mt-1 flex items-center gap-1">
                  <span style={{ color: badge.color }}>{row.icon}</span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide"
                    style={{ color: badge.color, background: badge.bg }}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })()}
            <div className="mt-1 font-mono text-[8px] text-[#8b9bb8]">
              {REC[row.position] ?? 'Monitor pricing'}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
