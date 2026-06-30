'use client';

import Link from 'next/link';
import type { PortfolioHeroOpportunity, PortfolioHeroRisk } from '@/lib/exposure/types';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import { positionAccent } from '@/lib/exposure/utils';

function RiskBadge({ level }: { level: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const styles =
    level === 'HIGH'
      ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]'
      : level === 'MEDIUM'
        ? 'border-hold/40 bg-hold/10 text-hold'
        : 'border-boom/40 bg-boom/10 text-boom';
  const label =
    level === 'HIGH' ? 'HIGH CONCENTRATION' : level === 'MEDIUM' ? 'MODERATE' : 'DIVERSIFIED';
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${styles} border`}>
      {label}
    </span>
  );
}

export default function PortfolioHeroCards({
  opportunity,
  risk,
}: {
  opportunity: PortfolioHeroOpportunity | null;
  risk: PortfolioHeroRisk | null;
}) {
  if (!opportunity && !risk) return null;

  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      {opportunity && (
        <div
          className="rounded-lg border border-border bg-surface p-4"
          style={{
            borderLeftWidth: 3,
            borderLeftColor: '#36E7A1',
            boxShadow: 'inset 3px 0 12px -4px rgba(54,231,161,0.35)',
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-boom">
            Biggest Portfolio Edge
          </div>
          <div className="mt-3 flex items-start gap-3">
            <PlayerAvatar
              playerId={opportunity.playerId}
              name={opportunity.fullName}
              size={48}
              fallbackColor={positionAccent(opportunity.position)}
            />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[14px] text-text">{opportunity.fullName}</div>
              <div className="font-mono text-[11px] text-muted">
                {opportunity.position} · {opportunity.team}
              </div>
            </div>
          </div>
          <div className="mt-3 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted">Owned</span>
              <span className="text-text">0 leagues</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">BOB Rank</span>
              <span className="text-boom">{opportunity.bobRankLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Market Rank</span>
              <span className="text-text">
                {opportunity.marketRank != null ? `#${opportunity.marketRank}` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Portfolio Impact</span>
              <span className="text-boom">+{opportunity.portfolioImpact}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Target League</span>
              <span className="truncate text-text">{opportunity.targetLeague}</span>
            </div>
          </div>
          <div className="mt-1 font-mono text-[9px] text-muted">Estimated impact</div>
          <Link
            href={`/trade?target=${opportunity.playerId}&league=${opportunity.targetLeagueId}`}
            className="mt-3 inline-block font-mono text-[11px] uppercase text-boom hover:underline"
          >
            Find Trade →
          </Link>
        </div>
      )}

      {risk && (
        <div
          className="rounded-lg border border-border bg-surface p-4"
          style={{
            borderLeftWidth: 3,
            borderLeftColor: '#A78BFA',
            boxShadow: 'inset 3px 0 12px -4px rgba(167,139,250,0.35)',
          }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-bust">
            Portfolio Warning
          </div>
          <div className="mt-3 flex items-start gap-3">
            <PlayerAvatar
              playerId={risk.playerId}
              name={risk.fullName}
              size={48}
              fallbackColor={positionAccent(risk.position)}
            />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[14px] text-text">{risk.fullName}</div>
              <div className="font-mono text-[11px] text-muted">
                {risk.position} · {risk.team}
              </div>
            </div>
            <RiskBadge level={risk.riskLevel} />
          </div>
          <div className="mt-3 space-y-1 font-mono text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted">Owned</span>
              <span className="text-text">
                {risk.leagueCount} league{risk.leagueCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Portfolio Exposure</span>
              <span className="text-bust">{risk.portfolioPct}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Verdict</span>
              <span style={{ color: risk.marketVerdict.color }}>
                {formatMarketVerdictLabel(risk.marketVerdict.verdict)}
              </span>
            </div>
          </div>
          <p className="mt-3 font-mono text-[10px] leading-relaxed text-muted">
            Single injury affects {risk.portfolioPct}% of portfolio value across{' '}
            {risk.leagueCount} leagues.
          </p>
        </div>
      )}
    </div>
  );
}
