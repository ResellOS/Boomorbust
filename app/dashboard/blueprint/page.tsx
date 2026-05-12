'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useDashboardLeagueStore } from '@/store/dashboardLeagueStore';
import type {
  BlueprintData,
  RosterRisk,
  RosterStrength,
  Recommendation,
  TradeTarget,
  YearOutlook,
  TeamGrade,
  RiskSeverity,
} from '@/app/api/dashboard/blueprint/route';

// ─── Design tokens ────────────────────────────────────────────────────────────

const MONO = { fontFamily: 'var(--font-mono-tactical, "JetBrains Mono", monospace)' };
const GLASS = {
  background: 'rgba(255,255,255,0.04)',
  backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.08)',
};
const POS_COLOR: Record<string, string> = {
  QB: '#FBBF24',
  RB: '#36E7A1',
  WR: '#22D3EE',
  TE: '#A78BFA',
  PICK: '#64748B',
};
const GRADE_COLOR: Record<TeamGrade, string> = {
  'DYNASTY ELITE': '#36E7A1',
  CONTENDER: '#22D3EE',
  TRANSITIONING: '#FBBF24',
  REBUILDING: '#A78BFA',
  RELOAD: '#F97316',
};
const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#FBBF24',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SkeletonBlock({ h = 'h-24', className = '' }: { h?: string; className?: string }) {
  return (
    <div
      className={`rounded-xl animate-pulse ${h} ${className}`}
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] tracking-[0.18em] uppercase text-white/30 mb-3"
      style={MONO}
    >
      {children}
    </p>
  );
}

function StrengthBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100);
  const color = score >= 75 ? '#36E7A1' : score >= 60 ? '#22D3EE' : score >= 45 ? '#FBBF24' : '#EF4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-1.5 rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }}
        />
      </div>
      <span className="text-[11px] tabular-nums" style={{ ...MONO, color }}>
        {score}
      </span>
    </div>
  );
}

function GradeBadge({ grade }: { grade: TeamGrade }) {
  const color = GRADE_COLOR[grade];
  return (
    <span
      className="px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider"
      style={{
        ...MONO,
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        boxShadow: `0 0 8px ${color}30`,
      }}
    >
      {grade}
    </span>
  );
}

function PosBadge({ pos }: { pos: string }) {
  const color = POS_COLOR[pos] ?? '#64748B';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px] font-bold"
      style={{ ...MONO, color, background: `${color}20`, border: `1px solid ${color}35` }}
    >
      {pos}
    </span>
  );
}

function TFOGradePill({ grade }: { grade: string | null }) {
  if (!grade) return null;
  const colors: Record<string, string> = {
    ELITE: '#36E7A1',
    'HIGH VALUE': '#22D3EE',
    VIABLE: '#FBBF24',
    SPECULATIVE: '#F97316',
    AVOID: '#EF4444',
  };
  const c = colors[grade] ?? '#64748B';
  return (
    <span
      className="px-1.5 py-0.5 rounded text-[9px]"
      style={{ ...MONO, color: c, background: `${c}15`, border: `1px solid ${c}30` }}
    >
      {grade}
    </span>
  );
}

// ─── Year Outlook Card ────────────────────────────────────────────────────────

function YearOutlookCard({ outlook }: { outlook: YearOutlook }) {
  const scoreColor =
    outlook.strength_score >= 75
      ? '#36E7A1'
      : outlook.strength_score >= 60
        ? '#22D3EE'
        : outlook.strength_score >= 45
          ? '#FBBF24'
          : '#EF4444';

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={GLASS}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-white/40 uppercase tracking-widest" style={MONO}>
          Year {outlook.year}
        </span>
        <span
          className="text-[20px] font-bold tabular-nums"
          style={{ ...MONO, color: scoreColor, textShadow: `0 0 12px ${scoreColor}60` }}
        >
          {outlook.strength_score}
        </span>
      </div>

      <StrengthBar score={outlook.strength_score} />

      <p className="text-[11px] text-white/60 leading-relaxed" style={MONO}>
        {outlook.verdict}
      </p>

      {outlook.key_strengths.length > 0 && (
        <div className="space-y-1">
          {outlook.key_strengths.map((s, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: '#36E7A1' }}>▲</span>
              <span className="text-[10px] text-white/50">{s}</span>
            </div>
          ))}
        </div>
      )}

      {outlook.key_risks.length > 0 && (
        <div className="space-y-1">
          {outlook.key_risks.map((r, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[10px] mt-0.5" style={{ color: '#EF4444' }}>▼</span>
              <span className="text-[10px] text-white/50">{r}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Risk Card ────────────────────────────────────────────────────────────────

function RiskCard({ risk }: { risk: RosterRisk }) {
  const sevColor = SEVERITY_COLOR[risk.severity];
  const typeLabel: Record<string, string> = {
    AGE_CLIFF: 'AGE CLIFF',
    INJURY_HISTORY: 'MED RISK',
    SCHEME_INSTABILITY: 'SCHEME',
    DECLINING_TFO: 'TFO TREND',
  };
  return (
    <div
      className="rounded-xl p-4 flex gap-3 items-start"
      style={{ ...GLASS, borderLeft: `2px solid ${sevColor}50` }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[12px] font-semibold text-white truncate">{risk.name}</span>
          <PosBadge pos={risk.position} />
          <span
            className="px-1.5 py-0.5 rounded text-[9px] font-bold"
            style={{ ...MONO, color: sevColor, background: `${sevColor}18`, border: `1px solid ${sevColor}35` }}
          >
            {typeLabel[risk.risk_type] ?? risk.risk_type}
          </span>
        </div>
        <p className="text-[10px] text-white/40" style={MONO}>
          {risk.risk_label}
        </p>
      </div>
      <span
        className="text-[10px] font-bold shrink-0 px-2 py-1 rounded"
        style={{ ...MONO, color: sevColor, background: `${sevColor}18` }}
      >
        {risk.severity}
      </span>
    </div>
  );
}

// ─── Strength Card ────────────────────────────────────────────────────────────

function StrengthCard({ strength }: { strength: RosterStrength }) {
  return (
    <div className="rounded-xl p-4 flex gap-3 items-start" style={{ ...GLASS, borderLeft: '2px solid rgba(54,231,161,0.35)' }}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[12px] font-semibold text-white truncate">{strength.name}</span>
          <PosBadge pos={strength.position} />
          <TFOGradePill grade={strength.tfo_grade} />
        </div>
        <p className="text-[10px] text-white/40" style={MONO}>
          {strength.why}
        </p>
      </div>
      {strength.tfo_score != null && (
        <span
          className="text-[18px] font-bold shrink-0 tabular-nums"
          style={{ ...MONO, color: '#36E7A1' }}
        >
          {Math.round(strength.tfo_score)}
        </span>
      )}
    </div>
  );
}

// ─── Recommendation Card ─────────────────────────────────────────────────────

function RecommendationCard({ rec, idx }: { rec: Recommendation; idx: number }) {
  const actionColors: Record<string, string> = {
    SELL: '#EF4444',
    TARGET: '#36E7A1',
    HOLD: '#22D3EE',
    EXTEND: '#FBBF24',
  };
  const color = actionColors[rec.action] ?? '#64748B';
  const href =
    rec.link_type === 'trade_finder'
      ? `/dashboard/trade?${rec.link_query ?? ''}`
      : `/dashboard/lineup`;

  return (
    <Link href={href} className="block group">
      <div
        className="rounded-xl p-4 flex gap-3 items-start transition-all duration-200 group-hover:border-white/20"
        style={GLASS}
      >
        <span
          className="text-[11px] font-bold shrink-0 w-6 h-6 rounded flex items-center justify-center"
          style={{ ...MONO, background: `${color}20`, color }}
        >
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[9px] font-bold tracking-widest"
              style={{ ...MONO, color }}
            >
              {rec.action}
            </span>
            {rec.player_name && (
              <span className="text-[11px] text-white font-semibold">{rec.player_name}</span>
            )}
            {rec.position && !rec.player_name && (
              <PosBadge pos={rec.position} />
            )}
          </div>
          <p className="text-[10px] text-white/45 leading-relaxed" style={MONO}>
            {rec.reasoning}
          </p>
        </div>
        <span className="text-white/20 group-hover:text-white/50 transition-colors shrink-0">›</span>
      </div>
    </Link>
  );
}

// ─── Trade Target Card ────────────────────────────────────────────────────────

function TradeTargetCard({ target }: { target: TradeTarget }) {
  const href = `/dashboard/trade?player=${encodeURIComponent(target.name)}`;
  const posColor = POS_COLOR[target.position] ?? '#64748B';
  const deltaPos = target.bvi_delta != null && target.bvi_delta > 0;

  return (
    <Link href={href} className="block group">
      <div
        className="rounded-xl p-4 flex gap-3 items-start transition-all duration-200 group-hover:border-white/20"
        style={GLASS}
      >
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold"
          style={{ background: `${posColor}20`, color: posColor, border: `1px solid ${posColor}30` }}
        >
          {target.name.split(' ').map((w) => w[0]).join('').slice(0, 2)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-[12px] font-semibold text-white truncate">{target.name}</span>
            <PosBadge pos={target.position} />
            <TFOGradePill grade={target.tfo_grade} />
          </div>
          <p className="text-[10px] text-white/40 mb-1.5" style={MONO}>
            {target.why}
          </p>
          {target.bvi_delta != null && (
            <span
              className="text-[9px] font-bold"
              style={{ ...MONO, color: deltaPos ? '#36E7A1' : '#EF4444' }}
            >
              BVI △{deltaPos ? '+' : ''}{Math.round(target.bvi_delta)} {deltaPos ? 'UNDERVALUED' : 'OVERVALUED'}
            </span>
          )}
        </div>

        {target.tfo_score != null && (
          <div className="text-right shrink-0">
            <div className="text-[16px] font-bold tabular-nums" style={{ ...MONO, color: '#22D3EE' }}>
              {Math.round(target.tfo_score)}
            </div>
            <div className="text-[9px] text-white/30" style={MONO}>TFO</div>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BlueprintPage() {
  const { activeLeagueId } = useDashboardLeagueStore();
  const [data, setData] = useState<BlueprintData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const qs = activeLeagueId ? `?league_id=${activeLeagueId}` : '';
        const res = await fetch(`/api/dashboard/blueprint${qs}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string }).error ?? `HTTP ${res.status}`);
        }
        const json = (await res.json()) as BlueprintData;
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load blueprint');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeLeagueId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Loading skeleton ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: '#0a0d14' }}>
        <BlueprintHeader
          teamName={null}
          leagueName="Loading..."
          managerTitle={null}
          teamGrade={null}
          contentionLabel={null}
          avgTFO={null}
          avgAge={null}
          scoringType="ppr"
          onRefresh={() => void load(true)}
          refreshing={false}
        />
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SkeletonBlock h="h-52" />
            <SkeletonBlock h="h-52" />
            <SkeletonBlock h="h-52" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonBlock h="h-48" />
            <SkeletonBlock h="h-48" />
          </div>
          <SkeletonBlock h="h-36" />
          <SkeletonBlock h="h-36" />
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#0a0d14' }}>
        <p className="text-red-400 text-[13px]" style={MONO}>{error}</p>
        <button
          onClick={() => void load()}
          className="text-[11px] text-red-400/60 underline hover:text-red-400"
          style={MONO}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen" style={{ background: '#0a0d14' }}>
      <BlueprintHeader
        teamName={data.teamName}
        leagueName={data.leagueName}
        managerTitle={data.managerTitle}
        teamGrade={data.teamGrade}
        contentionLabel={data.contentionWindow.label}
        avgTFO={data.avgTFO}
        avgAge={data.avgAge}
        scoringType={data.scoringType}
        onRefresh={() => void load(true)}
        refreshing={refreshing}
      />

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* 3-Year Outlook */}
        <section>
          <SectionLabel>3-Year Outlook</SectionLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.yearOutlook.map((y) => (
              <YearOutlookCard key={y.year} outlook={y} />
            ))}
          </div>
        </section>

        {/* Risks + Strengths */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Risks */}
          <section>
            <SectionLabel>Top Risks</SectionLabel>
            <div className="space-y-3">
              {data.risks.length > 0 ? (
                data.risks.map((r) => <RiskCard key={r.player_id} risk={r} />)
              ) : (
                <div className="rounded-xl p-6 text-center" style={GLASS}>
                  <p className="text-[11px] text-white/30" style={MONO}>No critical risks detected</p>
                </div>
              )}
            </div>
          </section>

          {/* Strengths */}
          <section>
            <SectionLabel>Roster Strengths</SectionLabel>
            <div className="space-y-3">
              {data.strengths.length > 0 ? (
                data.strengths.map((s) => <StrengthCard key={s.player_id} strength={s} />)
              ) : (
                <div className="rounded-xl p-6 text-center" style={GLASS}>
                  <p className="text-[11px] text-white/30" style={MONO}>Build your core to unlock strengths</p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Recommendations */}
        <section>
          <SectionLabel>Offseason Playbook</SectionLabel>
          <div className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} idx={i} />
            ))}
          </div>
        </section>

        {/* Trade Targets */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>Trade Targets</SectionLabel>
            <Link
              href="/dashboard/trade"
              className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
              style={MONO}
            >
              Open Trade Hub →
            </Link>
          </div>
          {data.tradeTargets.length > 0 ? (
            <div className="space-y-3">
              {data.tradeTargets.map((t) => (
                <TradeTargetCard key={t.player_id} target={t} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl p-6 text-center" style={GLASS}>
              <p className="text-[11px] text-white/30" style={MONO}>
                No targets computed yet — TFO cache populates nightly
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Header component ─────────────────────────────────────────────────────────

function BlueprintHeader({
  teamName,
  leagueName,
  managerTitle,
  teamGrade,
  contentionLabel,
  avgTFO,
  avgAge,
  scoringType,
  onRefresh,
  refreshing,
}: {
  teamName: string | null;
  leagueName: string;
  managerTitle: string | null;
  teamGrade: TeamGrade | null;
  contentionLabel: string | null;
  avgTFO: number | null;
  avgAge: number | null;
  scoringType: string;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <div
      className="sticky top-0 z-40 px-4 py-4 border-b"
      style={{
        background: 'rgba(10,13,20,0.92)',
        backdropFilter: 'blur(20px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/dashboard"
              className="text-white/30 hover:text-white/70 transition-colors text-[18px] shrink-0"
            >
              ←
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[16px] font-bold text-white truncate">
                  {teamName ?? 'My Team'}
                </span>
                {teamGrade && <GradeBadge grade={teamGrade} />}
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[11px] text-white/40 truncate" style={MONO}>
                  {leagueName}
                </span>
                {managerTitle && (
                  <>
                    <span className="text-white/20">·</span>
                    <span className="text-[10px] text-amber-400/70" style={MONO}>
                      {managerTitle}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white/70 transition-colors disabled:opacity-40"
            style={{ ...MONO, border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {refreshing ? '...' : '↻ Refresh'}
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex items-center gap-4 flex-wrap">
          {contentionLabel && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/25 uppercase tracking-widest" style={MONO}>
                Window
              </span>
              <span className="text-[11px] font-bold" style={{ ...MONO, color: '#22D3EE' }}>
                {contentionLabel}
              </span>
            </div>
          )}
          {avgTFO != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/25 uppercase tracking-widest" style={MONO}>
                Avg TFO
              </span>
              <span className="text-[11px] font-bold tabular-nums" style={{ ...MONO, color: '#36E7A1' }}>
                {avgTFO}
              </span>
            </div>
          )}
          {avgAge != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/25 uppercase tracking-widest" style={MONO}>
                Avg Age
              </span>
              <span className="text-[11px] font-bold tabular-nums" style={{ ...MONO, color: '#FBBF24' }}>
                {avgAge}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-white/25 uppercase tracking-widest" style={MONO}>
              Scoring
            </span>
            <span className="text-[11px] font-bold uppercase" style={{ ...MONO, color: '#A78BFA' }}>
              {scoringType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
