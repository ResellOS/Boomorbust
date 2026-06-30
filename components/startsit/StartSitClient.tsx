'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  DecisionsSummary,
  FlexDecision,
  LineupDecision,
  LineupOptimizer,
  SeasonRecord,
} from '@/lib/startsit/types';
import OffseasonContextBanner from '@/components/startsit/OffseasonContextBanner';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import ConfidenceBadge from '@/components/startsit/ConfidenceBadge';
import RecommendationFeedback from '@/components/feedback/RecommendationFeedback';
import { startSitConfidenceStyle } from '@/lib/ui/labels';

interface StartSitClientProps {
  nflWeek: number;
  isOffseason: boolean;
  leagues: { id: string; name: string }[];
  seasonRecord: SeasonRecord;
  decisions: LineupDecision[];
  decisionsSummary: DecisionsSummary;
  lineupOptimizer: LineupOptimizer;
  flexDecisions: FlexDecision[];
  hasRealData: boolean;
}

const DISMISSED_KEY = 'bob_startsit_dismissed';
const ACCEPTED_KEY = 'bob_startsit_accepted';

function loadIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveIdSet(key: string, ids: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

function ConfidencePill({ tier }: { tier: 'Lean' | 'Strong' | 'Smash' }) {
  const style = startSitConfidenceStyle(tier);
  const bg =
    tier === 'Smash'
      ? 'rgba(54,231,161,0.12)'
      : tier === 'Strong'
        ? 'rgba(34,211,238,0.12)'
        : 'rgba(251,191,36,0.12)';
  const border =
    tier === 'Smash'
      ? 'rgba(54,231,161,0.35)'
      : tier === 'Strong'
        ? 'rgba(34,211,238,0.35)'
        : 'rgba(251,191,36,0.35)';

  return (
    <span
      className="inline-block rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      style={{ color: style.color, background: bg, border: `1px solid ${border}` }}
    >
      {tier}
    </span>
  );
}

function HeroDecisionCard({ decision }: { decision: LineupDecision }) {
  const isStart = decision.variant === 'start';
  const glow = isStart ? '#36E7A1' : '#A78BFA';
  const label = isStart ? 'MUST START' : 'MUST SIT';

  return (
    <div
      className="min-h-[160px] rounded-md border border-border bg-surface p-4"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: glow,
        boxShadow: `inset 3px 0 12px -4px ${glow}40`,
      }}
    >
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[1.5px]" style={{ color: glow }}>
        {label}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2.5">
            <PlayerAvatar
              playerId={decision.startPlayer.playerId}
              name={decision.startPlayer.fullName}
              size={40}
            />
            <div>
              <div className="font-mono text-[14px] uppercase text-text">
                {decision.startPlayer.fullName}
              </div>
              <div className="font-mono text-[11px] text-muted">
                {decision.startPlayer.position} · {decision.startPlayer.team}
              </div>
            </div>
          </div>

          <div className="text-center font-mono text-[11px] uppercase tracking-widest text-muted">
            over
          </div>

          <div className="flex items-center gap-2.5">
            <PlayerAvatar
              playerId={decision.sitPlayer.playerId}
              name={decision.sitPlayer.fullName}
              size={40}
            />
            <div>
              <div className="font-mono text-[14px] uppercase text-text">
                {decision.sitPlayer.fullName}
              </div>
              <div className="font-mono text-[11px] text-muted">
                {decision.sitPlayer.position} · {decision.sitPlayer.team}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:min-w-[140px]">
          <div className="font-mono text-[18px] text-boom">+{decision.edgePts.toFixed(1)}</div>
          <div className="text-[10px] text-muted">Expected Points</div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="font-mono text-[12px] text-text">{decision.confidence}%</span>
            <ConfidenceBadge pct={decision.confidence} />
          </div>
          <div className="mt-2 font-mono text-[10px] text-muted">
            League: {decision.leagueName}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        <div className="mb-1.5 font-mono text-[9px] uppercase tracking-wide text-muted">Why</div>
        <ul className="space-y-0.5">
          {decision.whyBullets.slice(0, 4).map((b) => (
            <li key={b} className="font-mono text-[10px] text-muted">
              • {b}
            </li>
          ))}
        </ul>
        <div className="mt-2 font-mono text-[10px] text-bust/80">
          If ignored: -{decision.edgePts.toFixed(1)} projected points
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wide text-muted">
            Was this call right?
          </span>
          <RecommendationFeedback
            surface="lineup"
            subjectType="lineup_decision"
            subjectId={`${decision.startPlayer.playerId}-${decision.sitPlayer.playerId}`}
            context={{
              variant: decision.variant,
              edgePts: decision.edgePts,
              league: decision.leagueName,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DecisionsTable({
  rows,
  onAccept,
  onIgnore,
  accepted,
  ignored,
}: {
  rows: LineupDecision[];
  onAccept: (id: string) => void;
  onIgnore: (id: string) => void;
  accepted: Set<string>;
  ignored: Set<string>;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="rounded-md border border-border bg-surface px-4 py-8 text-center">
        <p className="font-mono text-[12px] text-muted">No additional decisions to review.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            {['Confidence', 'Decision', 'League', 'Edge', 'Why', 'Action'].map((h) => (
              <th
                key={h}
                className="px-3 py-2 font-mono text-[9px] uppercase tracking-wide text-muted"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const done = accepted.has(d.id) || ignored.has(d.id);
            return (
              <tr
                key={d.id}
                className={`border-b border-border/50 last:border-b-0 ${done ? 'opacity-50' : ''}`}
              >
                <td className="px-3 py-2.5">
                  <ConfidencePill tier={d.confidenceTier} />
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-text">
                  {d.decisionLabel}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-muted">{d.leagueName}</td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-boom">
                  +{d.edgePts.toFixed(1)} pts
                </td>
                <td className="max-w-[180px] px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === d.id ? null : d.id)}
                    className="border-none bg-transparent p-0 text-left font-mono text-[10px] text-muted hover:text-text"
                  >
                    {expanded === d.id
                      ? d.whyBullets.join(' · ')
                      : `${d.whyOneLine.slice(0, 48)}${d.whyOneLine.length > 48 ? '…' : ''}`}
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => onAccept(d.id)}
                      className="rounded border border-boom/30 bg-boom/10 px-2 py-1 font-mono text-[10px] text-boom disabled:opacity-40"
                    >
                      {accepted.has(d.id) ? 'Accepted' : 'Accept'}
                    </button>
                    <button
                      type="button"
                      disabled={done}
                      onClick={() => onIgnore(d.id)}
                      className="rounded border border-border px-2 py-1 font-mono text-[10px] text-muted disabled:opacity-40"
                    >
                      {ignored.has(d.id) ? 'Ignored' : 'Ignore'}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OptimizeModal({
  optimizer,
  onClose,
}: {
  optimizer: LineupOptimizer;
  onClose: () => void;
}) {
  const [showReview, setShowReview] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-md border border-border bg-surface p-5">
        {!showReview ? (
          <>
            <div className="mb-4 font-mono text-[12px] uppercase tracking-wide text-text">
              Lineup Optimizer
            </div>
            <div className="space-y-2 font-mono text-[12px] text-muted">
              <p>
                <span className="text-text">{optimizer.leagueCount}</span> leagues checked
              </p>
              <p>
                <span className="text-boom">{optimizer.changesRecommended}</span> lineup changes
                recommended
              </p>
              <p>
                Potential gain:{' '}
                <span className="text-boom">+{optimizer.totalPotentialGain.toFixed(1)} points</span>
              </p>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowReview(true)}
                className="w-full rounded border-none bg-boom py-2.5 font-mono text-[12px] uppercase tracking-wide text-bg"
              >
                Review Changes →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded border border-border bg-transparent py-2 font-mono text-[11px] text-muted"
              >
                Close
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-3 font-mono text-[12px] uppercase tracking-wide text-text">
              Recommended Changes
            </div>
            <div className="space-y-3">
              {optimizer.leagueChanges.map((lc) => (
                <div key={lc.leagueId} className="rounded border border-border/60 p-3">
                  <div className="mb-2 font-mono text-[11px] text-text">{lc.leagueName}</div>
                  <div className="mb-1 font-mono text-[10px] text-boom">
                    +{lc.potentialGain.toFixed(1)} pts potential
                  </div>
                  <ul className="space-y-1">
                    {lc.decisions.map((d) => (
                      <li key={d.id} className="font-mono text-[10px] text-muted">
                        {d.decisionLabel}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded border border-border bg-transparent py-2 font-mono text-[11px] text-muted"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function FlexDecisionRow({ flex }: { flex: FlexDecision }) {
  const tier = flex.confidenceTier ?? 'Lean';
  return (
    <div className="border-b border-border/50 px-3 py-2.5 last:border-b-0">
      <div className="font-mono text-[11px] text-text">{flex.pickNote}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="font-mono text-[11px] text-boom">+{flex.dynastyEdge.toFixed(1)} projected</span>
        <span className="text-muted">·</span>
        <ConfidencePill tier={tier} />
        <span className="font-mono text-[10px] text-muted">confidence</span>
      </div>
    </div>
  );
}

export default function StartSitClient({
  nflWeek,
  isOffseason,
  leagues,
  seasonRecord,
  decisions: initialDecisions,
  decisionsSummary: _initialSummary,
  lineupOptimizer,
  flexDecisions: initialFlex,
  hasRealData,
}: StartSitClientProps) {
  const router = useRouter();
  const [week, setWeek] = useState(nflWeek);
  const [leagueId, setLeagueId] = useState('all');
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [accepted, setAccepted] = useState<Set<string>>(() => loadIdSet(ACCEPTED_KEY));
  const [ignored, setIgnored] = useState<Set<string>>(() => loadIdSet(DISMISSED_KEY));
  const preseason = isOffseason || nflWeek === 0;

  const { decisions, summary, flexDecisions } = useMemo(() => {
    let decs = [...initialDecisions];
    let flex = [...initialFlex];

    if (leagueId !== 'all') {
      decs = decs.filter((d) => d.leagueId === leagueId);
      flex = flex.filter(
        (f) =>
          f.playerA.leagueIds.includes(leagueId) || f.playerB.leagueIds.includes(leagueId),
      );
    }

    const active = decs.filter((d) => !ignored.has(d.id));
    let high = 0;
    let medium = 0;
    let low = 0;
    let gain = 0;
    for (const d of active) {
      gain += d.edgePts;
      if (d.confidence >= 71) high += 1;
      else if (d.confidence >= 62) medium += 1;
      else low += 1;
    }

    const sum: DecisionsSummary = {
      total: active.length,
      high,
      medium,
      low,
      expectedGain: Math.round(gain * 10) / 10,
      potentialCost: Math.round(gain * 10) / 10,
    };

    return { decisions: active, summary: sum, flexDecisions: flex };
  }, [initialDecisions, initialFlex, leagueId, ignored]);

  const heroDecisions = decisions.slice(0, 3);
  const tableDecisions = decisions.slice(3);

  const handleAccept = useCallback((id: string) => {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIdSet(ACCEPTED_KEY, next);
      return next;
    });
  }, []);

  const handleIgnore = useCallback((id: string) => {
    setIgnored((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveIdSet(DISMISSED_KEY, next);
      return next;
    });
  }, []);

  const handleWeekChange = (delta: number) => {
    const minWeek = preseason ? 0 : 1;
    const next = Math.min(18, Math.max(minWeek, week + delta));
    setWeek(next);
    router.push(`/startsit?week=${next}${leagueId !== 'all' ? `&league=${leagueId}` : ''}`);
  };

  const weekLabel = preseason ? 'WEEK 1' : `WEEK ${week}`;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start justify-between px-[18px] pb-1.5 pt-2.5">
        <div>
          <div className="font-mono text-[22px] uppercase tracking-[-0.5px] text-text">
            Weekly Decisions
          </div>
          <div className="mt-0.5 font-mono text-[12px] text-muted">
            What lineup changes should you make today?
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-[5px] border border-border bg-surface2">
            <button
              type="button"
              onClick={() => handleWeekChange(-1)}
              className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-[14px] text-muted hover:text-text"
            >
              ‹
            </button>
            <span className="flex h-7 items-center border-x border-border px-2.5 font-mono text-[12px] text-text">
              {preseason ? 'Preseason' : `Week ${week}`}
            </span>
            <button
              type="button"
              onClick={() => handleWeekChange(1)}
              className="flex h-7 w-7 items-center justify-center border-none bg-transparent text-[14px] text-muted hover:text-text"
            >
              ›
            </button>
          </div>
          <select
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="h-7 cursor-pointer rounded-[5px] border border-border bg-surface2 px-2.5 font-mono text-[12px] text-text outline-none"
          >
            <option value="all">All Leagues</option>
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <OffseasonContextBanner isOffseason={preseason} />

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] pb-3 [scrollbar-width:thin]">
        {/* Decisions Summary */}
        <div className="mb-3 rounded-md border border-border bg-surface px-4 py-3">
          <div className="font-mono text-[12px] uppercase tracking-wide text-text">
            {weekLabel} Front Office Decisions
          </div>
          {!hasRealData || summary.total === 0 ? (
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
              Preseason Mode — BOB needs scored players in your rosters before lineup decisions
              can be generated. Projections will update as 2026 training camp data arrives. All calls
              are tracked starting Week 1.
            </p>
          ) : (
            <>
              <p className="mt-2 font-mono text-[12px] text-muted">
                {summary.total} decision{summary.total !== 1 ? 's' : ''} identified
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted">
                {summary.high} High Confidence · {summary.medium} Medium · {summary.low} Low
              </p>
              <div className="mt-2 flex flex-wrap gap-4">
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted">Expected gain if followed</div>
                  <div className="font-mono text-[17px] text-boom">+{summary.expectedGain.toFixed(1)} pts</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-muted">Potential cost if ignored</div>
                  <div className="font-mono text-[17px] text-bust/90">-{summary.potentialCost.toFixed(1)} pts</div>
                </div>
              </div>
            </>
          )}
          {preseason && hasRealData && (
            <p className="mt-2 font-mono text-[10px] leading-relaxed text-muted">
              Preseason projections based on 2025 historical data — confidence increases as 2026
              season data arrives.
            </p>
          )}
        </div>

        {/* Must Act — Hero Cards */}
        {heroDecisions.length > 0 && (
          <div className="mb-3 space-y-2.5">
            <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
              Must Act
            </div>
            {heroDecisions.map((d) => (
              <HeroDecisionCard key={d.id} decision={d} />
            ))}
          </div>
        )}

        {/* All Decisions Table */}
        {decisions.length > 0 && (
          <div className="mb-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
              {tableDecisions.length > 0 ? 'All Decisions' : 'Decision Log'}
            </div>
            <DecisionsTable
              rows={tableDecisions.length > 0 ? tableDecisions : heroDecisions}
              onAccept={handleAccept}
              onIgnore={handleIgnore}
              accepted={accepted}
              ignored={ignored}
            />
            {tableDecisions.length > 0 && heroDecisions.length > 0 && (
              <div className="mt-2 text-center">
                <span className="font-mono text-[10px] text-muted">
                  {heroDecisions.length} hero decision{heroDecisions.length !== 1 ? 's' : ''} shown above
                </span>
              </div>
            )}
          </div>
        )}

        {/* Lineup Optimizer */}
        <div className="mb-3 rounded-md border border-border bg-surface px-4 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
            Lineup Optimizer
          </div>
          {hasRealData && lineupOptimizer.optimizedLineupPts > 0 ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-4">
                <div>
                  <div className="font-mono text-[10px] text-muted">Lineup Grade</div>
                  <div className="font-mono text-[28px] text-boom">{lineupOptimizer.grade}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted">Current Lineup Projected</div>
                  <div className="font-mono text-[15px] text-text">
                    {lineupOptimizer.currentLineupPts.toFixed(1)} pts
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted">BOB Optimized Lineup</div>
                  <div className="font-mono text-[15px] text-boom">
                    {lineupOptimizer.optimizedLineupPts.toFixed(1)} pts
                  </div>
                </div>
                <div>
                  <div className="font-mono text-[10px] text-muted">Potential Gain</div>
                  <div className="font-mono text-[15px] text-boom">
                    +{lineupOptimizer.potentialGain.toFixed(1)} pts
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOptimizeModal(true)}
                className="mt-4 w-full rounded border-none bg-boom py-3 font-mono text-[12px] uppercase tracking-wide text-bg sm:w-auto sm:px-8"
              >
                Optimize All Leagues
              </button>
            </>
          ) : (
            <p className="mt-2 font-mono text-[11px] text-muted">
              Optimizer activates once scored roster data is available for your leagues.
            </p>
          )}
        </div>

        {/* Flex Decisions */}
        {flexDecisions.length > 0 && (
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="font-mono text-[11px] uppercase text-hold">Flex Decisions</div>
              <div className="font-mono text-[10px] text-muted">Close calls — BOB breaks the tie</div>
            </div>
            {flexDecisions.map((f) => (
              <FlexDecisionRow key={f.position} flex={f} />
            ))}
          </div>
        )}

        {/* Season record strip (compact) */}
        <div className="mt-3 rounded-md border border-border/60 bg-surface2/40 px-3 py-2">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[10px] text-muted">
            <span>
              Season: {seasonRecord.wins}-{seasonRecord.losses}-{seasonRecord.pushes}
            </span>
            <span>Win Rate: {seasonRecord.winRate}%</span>
            {seasonRecord.totalDecisions === 0 && (
              <Link href="/performance" className="text-boom hover:underline">
                Tracking begins Week 1 →
              </Link>
            )}
          </div>
        </div>
      </div>

      {showOptimizeModal && (
        <OptimizeModal optimizer={lineupOptimizer} onClose={() => setShowOptimizeModal(false)} />
      )}
    </div>
  );
}
