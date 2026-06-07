import Link from 'next/link';

export interface League {
  id: string;
  name: string;
  league_type?: string | null;
  status?: string | null;
}

interface SidebarProps {
  leagues: League[];
}

const LEAGUE_DOTS = ['#36E7A1', '#A78BFA'] as const;

function leagueTag(
  league: League,
  index: number,
): { label: string; variant: 'contender' | 'rebuild' | 'redraft' } {
  const type = (league.league_type ?? '').toLowerCase();
  if (type.includes('redraft') || type.includes('best_ball')) {
    return { label: 'Redraft', variant: 'redraft' };
  }
  if (index % 2 === 0) return { label: 'Contender', variant: 'contender' };
  return { label: 'Rebuild', variant: 'rebuild' };
}

export default function Sidebar({ leagues }: SidebarProps) {
  return (
    <aside className="row-start-2 flex flex-col overflow-hidden border-r border-border bg-surface">
      <div className="shrink-0 px-[15px] pb-[3px] pt-[11px] font-figtree text-[11px] font-extrabold uppercase tracking-[1.5px] text-muted">
        My Leagues
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {leagues.map((league, i) => {
          const tag = leagueTag(league, i);
          const dotColor =
            tag.variant === 'contender'
              ? LEAGUE_DOTS[0]
              : tag.variant === 'rebuild'
                ? LEAGUE_DOTS[1]
                : '#6b7a99';
          return (
            <Link
              key={league.id}
              href={`/leagues/${league.id}`}
              className="flex items-center gap-[9px] px-[15px] py-[7px] text-inherit no-underline transition-colors hover:bg-white/[0.025]"
            >
              <div
                className="h-[7px] w-[7px] shrink-0 rounded-full"
                style={{ background: dotColor }}
              />
              <span className="min-w-0 flex-1 truncate font-figtree text-[12.5px] font-medium">
                {league.name}
              </span>
              <span
                className={`shrink-0 whitespace-nowrap rounded-[3px] px-[7px] py-0.5 font-mono text-[8px] font-bold ${
                  tag.variant === 'contender'
                    ? 'bg-boom/10 text-boom'
                    : tag.variant === 'rebuild'
                      ? 'bg-bust/10 text-bust'
                      : 'bg-muted/10 text-muted'
                }`}
              >
                {tag.label}
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mx-2.5 mb-[5px] mt-2 shrink-0 rounded-[7px] border border-muted/15 bg-boom/[0.018] p-[9px] text-center">
        <div className="mb-1 font-mono text-[7px] uppercase tracking-[2px] text-muted/40">
          Sponsored
        </div>
        <div className="font-figtree text-lg font-extrabold tracking-wide text-boom/50">
          UNDERDOG
        </div>
        <div className="mt-0.5 font-mono text-[7px] text-muted/40">Best Ball · $100K Prizes</div>
      </div>
      <div className="mx-2.5 mb-2.5 shrink-0 rounded-lg border border-bust/25 bg-gradient-to-br from-bust/[0.08] to-boom/[0.04] p-3">
        <div className="mb-2 font-figtree text-xs font-extrabold uppercase tracking-wide text-text">
          Unlock Full Power
        </div>
        {[
          'Advanced Trade Finder',
          'Full Player Profiles',
          'Deep Analytics Suite',
          'Priority Support',
          'Unlimited Leagues',
        ].map((feature) => (
          <div
            key={feature}
            className="mb-1 flex items-center gap-2 font-figtree text-[11px] text-muted"
          >
            <div className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border border-boom/40 bg-boom/15 text-[9px] text-boom">
              ✓
            </div>
            {feature}
          </div>
        ))}
        <Link
          href="/pricing"
          className="mt-[9px] block w-full rounded-md bg-boom py-[9px] text-center font-figtree text-xs font-extrabold uppercase tracking-wide text-bg no-underline"
        >
          Upgrade Now
        </Link>
      </div>
    </aside>
  );
}
