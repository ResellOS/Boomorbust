'use client';

import type { OwnedPick } from '@/lib/trade/types';
import type { DraftLeague } from '@/lib/draft/types';
import {
  computeDraftCapitalStats,
  groupDraftCapitalByLeague,
  pickDisplayTitle,
  pickOwnershipSuffix,
  pickRoundColor,
} from '@/lib/trade/ownedPicks';

interface DraftCapitalViewProps {
  leagues: DraftLeague[];
  ownedPicksByLeague: Record<string, OwnedPick[]>;
}

export default function DraftCapitalView({ leagues, ownedPicksByLeague }: DraftCapitalViewProps) {
  const allPicks = Object.values(ownedPicksByLeague).flat();
  const stats = computeDraftCapitalStats(allPicks);
  const groups = groupDraftCapitalByLeague(leagues, ownedPicksByLeague);

  return (
    <div className="mx-auto flex h-full max-w-[960px] flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6 md:py-8">
      <div>
        <h2 className="font-figtree text-[22px] font-extrabold tracking-[-0.5px] text-text md:text-[28px]">
          Draft Capital
        </h2>
        <p className="mt-1 font-figtree text-[13px] text-muted">
          Your upcoming picks across every synced league — read-only portfolio view.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        <StatCell label="Total Picks" value={String(stats.total)} accent />
        <StatCell label="1st Rounders" value={String(stats.first)} color="#36E7A1" />
        <StatCell label="2nd Rounders" value={String(stats.second)} color="#60a5fa" />
        <StatCell label="3rd Rounders" value={String(stats.third)} color="#FBBF24" />
        <StatCell label="4th Round+" value={String(stats.fourthPlus)} color="#6b7a99" />
      </div>

      {groups.length === 0 ? (
        <div className="rounded-[10px] border border-border bg-surface/40 px-4 py-10 text-center">
          <p className="font-figtree text-[14px] leading-relaxed text-muted">
            No upcoming picks found — picks may have been traded away or leagues haven&apos;t set
            future drafts yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map((league) => (
            <section
              key={league.leagueId}
              className="overflow-hidden rounded-[10px] border border-border bg-surface/50"
            >
              <header className="border-b border-border bg-bg/80 px-4 py-2.5">
                <h3 className="font-figtree text-[14px] font-bold uppercase tracking-[1px] text-text">
                  {league.leagueName}
                </h3>
              </header>

              <div className="flex flex-col gap-4 px-4 py-3">
                {league.seasons.map((seasonGroup) => (
                  <div key={seasonGroup.season}>
                    <div className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[1.5px] text-muted">
                      {seasonGroup.season}
                    </div>
                    <div className="flex flex-col gap-3">
                      {seasonGroup.rounds.map(({ round, picks }) => (
                        <div key={`${seasonGroup.season}-${round}`}>
                          <div
                            className="mb-1.5 font-mono text-[10px] uppercase tracking-wide"
                            style={{ color: pickRoundColor(round) }}
                          >
                            {round >= 4 ? 'Round 4+' : `Round ${round}`}
                          </div>
                          <ul className="flex flex-col gap-1.5">
                            {picks.map((pick) => (
                              <li
                                key={pick.label}
                                className="flex flex-wrap items-baseline justify-between gap-2 rounded-[6px] border border-border/60 bg-bg/40 px-3 py-2"
                              >
                                <span
                                  className="font-figtree text-[13px] font-semibold"
                                  style={{ color: pickRoundColor(pick.round) }}
                                >
                                  {pickDisplayTitle(pick.season, pick.round)}
                                </span>
                                <span className="font-mono text-[11px] text-muted">
                                  {pickOwnershipSuffix(pick.label)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  color,
  accent,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[8px] border border-border bg-surface/60 px-3 py-2.5">
      <div className="font-mono text-[9px] uppercase tracking-[1.2px] text-muted">{label}</div>
      <div
        className="mt-0.5 font-figtree text-[22px] font-bold leading-none tracking-[-0.5px]"
        style={{ color: accent ? '#36E7A1' : color ?? '#e2e8f0' }}
      >
        {value}
      </div>
    </div>
  );
}
