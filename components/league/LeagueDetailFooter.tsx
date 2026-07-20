import { formatMinutesAgo } from '@/lib/utils/format';

interface LeagueDetailFooterProps {
  playersTracked: number;
  boomPlayers: number;
  bustPlayers: number;
  avgDynastyRating: number;
  lastUpdatedMinutes: number;
  leagueCount: number;
}

function FooterItem({
  icon,
  iconBg,
  iconBorder,
  value,
  valueClass = 'text-boom',
  label,
  sub,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconBorder: string;
  value: string | number;
  valueClass?: string;
  label: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[14px]"
        style={{ background: iconBg, border: `1px solid ${iconBorder}` }}
      >
        {icon}
      </div>
      <div>
        <div className={`font-mono text-[14px] font-medium ${valueClass}`}>{value}</div>
        <div className="text-[9px] text-muted">{label}</div>
        {sub ? <div className="text-[9px] text-muted">{sub}</div> : null}
      </div>
    </div>
  );
}

export default function LeagueDetailFooter({
  playersTracked,
  boomPlayers,
  bustPlayers,
  avgDynastyRating,
  lastUpdatedMinutes,
  leagueCount,
}: LeagueDetailFooterProps) {
  const boomPct = playersTracked > 0 ? ((boomPlayers / playersTracked) * 100).toFixed(1) : '0';
  const bustPct = playersTracked > 0 ? ((bustPlayers / playersTracked) * 100).toFixed(1) : '0';

  return (
    <footer className="flex h-[52px] shrink-0 items-center justify-around border-t border-border bg-surface px-[18px]">
      <FooterItem
        icon="👥"
        iconBg="rgba(54,231,161,0.1)"
        iconBorder="rgba(54,231,161,0.2)"
        value={playersTracked.toLocaleString()}
        label="Players Tracked"
        sub="NFL + College"
      />
      <div className="h-6 w-px bg-border" />
      <FooterItem
        icon="⚡"
        iconBg="rgba(54,231,161,0.1)"
        iconBorder="rgba(54,231,161,0.2)"
        value={boomPlayers}
        label="Boom Players"
        sub={`Top ${boomPct}%`}
      />
      <div className="h-6 w-px bg-border" />
      <FooterItem
        icon="📉"
        iconBg="rgba(167,139,250,0.1)"
        iconBorder="rgba(167,139,250,0.2)"
        value={bustPlayers}
        valueClass="text-[#ef4444]"
        label="Bust Players"
        sub={`Bottom ${bustPct}%`}
      />
      <div className="h-6 w-px bg-border" />
      <FooterItem
        icon="📊"
        iconBg="rgba(251,191,36,0.1)"
        iconBorder="rgba(251,191,36,0.2)"
        value={avgDynastyRating > 0 ? avgDynastyRating.toFixed(1) : '—'}
        valueClass="text-text"
        label="Avg Dynasty Rating"
        sub="Your roster avg"
      />
      <div className="h-6 w-px bg-border" />
      <FooterItem
        icon="🕐"
        iconBg="rgba(107,122,153,0.1)"
        iconBorder="rgba(107,122,153,0.2)"
        value={formatMinutesAgo(lastUpdatedMinutes)}
        valueClass="text-text"
        label="Last Updated"
        sub="BOB Engine sync"
      />
      <div className="h-6 w-px bg-border" />
      <FooterItem
        icon={<span className="h-2 w-2 rounded-full bg-boom shadow-[0_0_6px_#36E7A1]" />}
        iconBg="rgba(54,231,161,0.1)"
        iconBorder="rgba(54,231,161,0.2)"
        value={`${leagueCount}/${leagueCount}`}
        label="League Sync"
        sub="All Connected"
      />
    </footer>
  );
}
