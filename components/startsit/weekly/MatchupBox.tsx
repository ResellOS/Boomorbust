'use client';

import Link from 'next/link';
import CountUpNumber from './CountUpNumber';
import type { LeagueMatchupView, PortfolioMatchupSummary } from '@/lib/startsit/types';

interface MatchupBoxProps {
  mode: 'league' | 'portfolio';
  matchup: LeagueMatchupView | null;
  portfolio: PortfolioMatchupSummary | null;
  fadeKey: string;
}

function TeamBlock({
  label,
  score,
  winPct,
  syncing,
}: {
  label: string;
  score: number;
  winPct: number | null;
  syncing?: boolean;
}) {
  return (
    <div className="flex-1 text-center">
      <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface2 font-mono text-[10px] text-muted">
        ⬡
      </div>
      <div className="font-mono text-[10px] uppercase text-text">{label}</div>
      <div className="font-mono text-[18px] text-boom">
        <CountUpNumber value={score} resetKey={`${label}-${score}`} decimals={1} suffix=" pts" />
      </div>
      {syncing ? (
        <div className="font-mono text-[9px] text-hold">Opponent projection syncing</div>
      ) : winPct != null ? (
        <div className="font-mono text-[10px] text-muted">
          <CountUpNumber value={winPct} resetKey={`${label}-wp`} suffix="% win" />
        </div>
      ) : null}
    </div>
  );
}

export default function MatchupBox({ mode, matchup, portfolio, fadeKey }: MatchupBoxProps) {
  if (mode === 'portfolio' && portfolio) {
    return (
      <div
        key={fadeKey}
        className="rounded-md border border-border bg-surface p-3 transition-opacity duration-300"
      >
        <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
          Portfolio Matchup Summary
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-[10px]">
          <div>
            <div className="text-[8px] uppercase text-muted">Total Projected</div>
            <div className="text-[16px] text-boom">
              <CountUpNumber
                value={portfolio.totalProjectedPoints}
                resetKey={fadeKey}
                decimals={1}
              />
            </div>
          </div>
          <div>
            <div className="text-[8px] uppercase text-muted">Active Leagues</div>
            <div className="text-[16px] text-text">{portfolio.leagueCount}</div>
          </div>
          {portfolio.biggestEdge && (
            <div className="col-span-2">
              <div className="text-[8px] uppercase text-muted">Biggest Edge</div>
              <div className="text-[11px] text-boom">{portfolio.biggestEdge}</div>
            </div>
          )}
          {portfolio.closestMatchup && (
            <div>
              <div className="text-[8px] uppercase text-muted">Closest Matchup</div>
              <div className="text-[11px] text-hold">{portfolio.closestMatchup}</div>
            </div>
          )}
          {portfolio.highestRiskMatchup && (
            <div>
              <div className="text-[8px] uppercase text-muted">Highest Risk</div>
              <div className="text-[11px] text-bust">{portfolio.highestRiskMatchup}</div>
            </div>
          )}
        </div>
        <Link
          href="/dashboard"
          className="mt-2 inline-block font-mono text-[9px] text-boom hover:underline"
        >
          View All Matchups →
        </Link>
      </div>
    );
  }

  if (!matchup) return null;

  return (
    <div
      key={fadeKey}
      className="rounded-md border border-border bg-surface p-3 transition-opacity duration-300"
    >
      <div className="font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
        Your Projected Matchup
      </div>
      <div className="mt-0.5 font-mono text-[10px] text-muted">
        {matchup.leagueName} · Week {matchup.week}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <TeamBlock
          label={matchup.yourTeamName}
          score={matchup.yourProjected}
          winPct={matchup.yourWinPct}
        />
        <div className="font-mono text-[11px] uppercase text-muted">vs</div>
        <TeamBlock
          label={matchup.opponentTeamName ?? 'Opponent'}
          score={matchup.opponentProjected ?? 0}
          winPct={matchup.opponentWinPct}
          syncing={matchup.syncing}
        />
      </div>

      {!matchup.syncing && matchup.projectedMargin != null && (
        <div className="mt-2 flex justify-between border-t border-border/60 pt-2 font-mono text-[10px]">
          <span className="text-muted">Projected Margin</span>
          <span className="text-boom">
            {matchup.projectedMargin > 0 ? '+' : ''}
            {matchup.projectedMargin.toFixed(1)}
          </span>
        </div>
      )}
      {matchup.impliedTotal != null && (
        <div className="flex justify-between font-mono text-[10px]">
          <span className="text-muted">Implied Total</span>
          <span className="text-text">{matchup.impliedTotal.toFixed(1)}</span>
        </div>
      )}

      {matchup.positionBreakdown.some((p) => p.you > 0) && (
        <div className="mt-2 border-t border-border/60 pt-2">
          <div className="mb-1 font-mono text-[8px] uppercase text-muted">Position Breakdown</div>
          <div className="grid grid-cols-4 gap-1">
            {matchup.positionBreakdown.map((p) => (
              <div key={p.slot} className="rounded bg-surface2/60 px-1 py-0.5 text-center">
                <div className="font-mono text-[7px] text-muted">{p.slot}</div>
                <div className="font-mono text-[9px] text-boom">{p.you.toFixed(1)}</div>
                <div className="font-mono text-[7px] text-muted">
                  {p.opp != null ? p.opp.toFixed(1) : '—'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        href={`/dashboard/league/${matchup.leagueId}`}
        className="mt-2 inline-block font-mono text-[9px] text-boom hover:underline"
      >
        View Matchup Analysis →
      </Link>
    </div>
  );
}
