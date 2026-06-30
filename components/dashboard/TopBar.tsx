import Image from 'next/image';

export interface TopBarProps {
  leagueCount: number;
  playersRostered: number;
  tradeOffers: number;
  dynastyEdge: number;
  empireRating: number;
}

const STATS = [
  { key: 'leagueCount', label: 'Leagues', desc: 'All Connected', color: 'text-boom' },
  { key: 'playersRostered', label: 'Players Rostered', desc: 'Across All Leagues', color: 'text-text' },
  { key: 'tradeOffers', label: 'Trade Offers', desc: 'Pending', color: 'text-hold' },
  { key: 'dynastyEdge', label: 'Dynasty Edge', desc: 'vs League Avg', color: 'text-boom', prefix: '+' },
  { key: 'empireRating', label: 'Empire Rating', desc: 'Top 18% of Users', color: 'text-boom' },
] as const;

export default function TopBar({
  leagueCount,
  playersRostered,
  tradeOffers,
  dynastyEdge,
  empireRating,
}: TopBarProps) {
  const values: Record<string, number> = {
    leagueCount,
    playersRostered,
    tradeOffers,
    dynastyEdge,
    empireRating,
  };

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
        {STATS.map((stat) => {
          const raw = values[stat.key];
          // Integers render clean; any fractional value (e.g. Empire Rating) rounds to 1 decimal.
          const formatted = Number.isInteger(raw) ? String(raw) : raw.toFixed(1);
          const display =
            'prefix' in stat && stat.prefix
              ? `${stat.prefix}${formatted}`
              : formatted;
          return (
            <div
              key={stat.key}
              className="flex flex-col justify-center border-r border-border px-[18px] py-1.5 last:border-r-0"
            >
              <div className="mb-[3px] font-mono text-[8.5px] uppercase tracking-[1.5px] text-muted">
                {stat.label}
              </div>
              <div
                className={`font-figtree text-[27px] font-bold leading-none tracking-[-0.5px] ${stat.color}`}
              >
                {display}
              </div>
              <div className="mt-0.5 font-figtree text-[9px] text-muted">{stat.desc}</div>
            </div>
          );
        })}
      </div>
    </header>
  );
}
