'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { ExposurePageData } from '@/lib/exposure/types';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import {
  exposureGroup,
  opportunityFraming,
  positionAccent,
} from '@/lib/exposure/utils';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import PortfolioOverviewCard from '@/components/exposure/PortfolioOverviewCard';
import PortfolioHeroCards from '@/components/exposure/PortfolioHeroCards';
import MissingEliteSection from '@/components/exposure/MissingEliteSection';
import ConcentrationRiskTable from '@/components/exposure/ConcentrationRiskTable';
import VerdictExposureCards from '@/components/exposure/VerdictExposureCards';
import PortfolioSimulator from '@/components/exposure/PortfolioSimulator';

const GROUP_META = {
  opportunity: {
    title: 'Well-Positioned',
    sub: 'BOB rates these multi-league holdings above market',
  },
  neutral: {
    title: 'Hold Steady',
    sub: 'Market and BOB roughly agree on these cross-league shares',
  },
  review: {
    title: 'Review Exposure',
    sub: 'BOB rates these below market — worth a look',
  },
} as const;

function VerdictBadge({
  verdict,
  color,
}: {
  verdict: string;
  color: string;
}) {
  return (
    <span
      className="shrink-0 rounded-[3px] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ color, background: `${color}1a`, border: `1px solid ${color}40` }}
    >
      {formatMarketVerdictLabel(verdict as Parameters<typeof formatMarketVerdictLabel>[0])}
    </span>
  );
}

export default function ExposureClient({ data }: { data: ExposurePageData }) {
  const [search, setSearch] = useState('');
  const { players, overview } = data;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q),
    );
  }, [players, search]);

  const grouped = useMemo(() => {
    const buckets = {
      opportunity: [] as typeof players,
      neutral: [] as typeof players,
      review: [] as typeof players,
    };
    for (const p of filtered) {
      buckets[exposureGroup(p.marketVerdict.verdict)].push(p);
    }
    return buckets;
  }, [filtered]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto px-5 py-4 [scrollbar-width:thin]">
      <div className="mb-4">
        <h1 className="font-mono text-[22px] uppercase tracking-[-0.5px] text-text md:text-[26px]">
          Dynasty Portfolio
        </h1>
        <p className="mt-1 font-mono text-[11px] text-muted">
          Command Center · Overview → Opportunities → Risks → Holdings
        </p>
      </div>

      <PortfolioOverviewCard overview={overview} />
      <PortfolioHeroCards opportunity={data.biggestOpportunity} risk={data.biggestRisk} />
      <MissingEliteSection assets={data.missingElite} />
      <ConcentrationRiskTable rows={data.concentrationRows} />
      <VerdictExposureCards summary={data.verdictSummary} />
      <PortfolioSimulator
        overview={overview}
        ownedPool={data.simulatorPool}
        acquirePool={data.acquirePool}
      />

      {/* Section 8 — Multi-League Holdings (bottom) */}
      <section className="mt-2 border-t border-border pt-4">
        <div className="mb-3">
          <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-muted">
            Multi-League Holdings
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-muted">Context view · grouped by verdict</p>
        </div>

        <div className="mb-4 flex h-9 max-w-md items-center gap-2 rounded-md border border-border bg-surface2 px-3">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={2} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search player, position, team…"
            className="w-full border-none bg-transparent font-mono text-[12px] text-text outline-none placeholder:text-muted"
          />
        </div>

        {players.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center font-mono text-[12px] text-muted">
            No multi-league overlap yet. Players rostered in 2+ leagues appear here.
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center font-mono text-[12px] text-muted">
            No players match your search.
          </div>
        ) : (
          (['opportunity', 'neutral', 'review'] as const).map((key) => {
            const list = grouped[key];
            if (list.length === 0) return null;
            const meta = GROUP_META[key];
            return (
              <section key={key} className="mb-6">
                <div className="mb-2 border-b border-border pb-2">
                  <div className="font-mono text-[11px] uppercase tracking-[1.5px] text-text">
                    {meta.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted">{meta.sub}</div>
                </div>
                <div className="overflow-hidden rounded-[7px] border border-border bg-surface">
                  {list.map((p, idx) => (
                    <div
                      key={p.playerId}
                      className={`flex items-center gap-3 px-3 py-2.5 ${
                        idx < list.length - 1 ? 'border-b border-border/40' : ''
                      }`}
                    >
                      <PlayerAvatar
                        playerId={p.playerId}
                        name={p.fullName}
                        size={36}
                        fallbackColor={positionAccent(p.position)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[13px] text-text">{p.fullName}</span>
                          <span
                            className="font-mono text-[10px] uppercase"
                            style={{ color: positionAccent(p.position) }}
                          >
                            {p.position}
                          </span>
                          <span className="font-mono text-[10px] text-muted">{p.team}</span>
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] text-muted">
                          {opportunityFraming(p)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-[15px] tabular-nums text-text">
                          {p.leagueCount}
                        </div>
                        <div className="font-mono text-[9px] uppercase text-muted">leagues</div>
                      </div>
                      {p.portfolioPct != null && (
                        <div className="shrink-0 text-right">
                          <div className="font-mono text-[12px] text-boom">{p.portfolioPct}%</div>
                          <div className="font-mono text-[9px] text-muted">portfolio</div>
                        </div>
                      )}
                      <VerdictBadge
                        verdict={p.marketVerdict.verdict}
                        color={p.marketVerdict.color}
                      />
                    </div>
                  ))}
                </div>
              </section>
            );
          })
        )}
      </section>
    </div>
  );
}
