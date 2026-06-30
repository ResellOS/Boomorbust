'use client';

import { useMemo, useState } from 'react';
import { Settings, Zap, Brain, Trophy, Clock, MoreHorizontal } from 'lucide-react';
import type { DraftSessionSummary, DraftLeague } from '@/lib/draft/types';
import type { OwnedPick } from '@/lib/trade/types';
import {
  computeLobbyStats,
  computePopularFormat,
  currentPickLabel,
  formatDraftFormat,
  formatRelativeTime,
  formatSessionDate,
} from '@/lib/draft/lobbyUi';
import DraftCapitalView from './DraftCapitalView';

interface DraftLandingProps {
  sessions: DraftSessionSummary[];
  leagues: DraftLeague[];
  ownedPicksByLeague: Record<string, OwnedPick[]>;
  activeTab: 'mocks' | 'capital';
  onTabChange: (tab: 'mocks' | 'capital') => void;
  onNewStartup: () => void;
  onNewRookie: () => void;
  onNewRedraft: () => void;
  onOpenSettings: () => void;
  onResume: (sessionId: string) => void;
}

export default function DraftLanding({
  sessions,
  leagues,
  ownedPicksByLeague,
  activeTab,
  onTabChange,
  onNewStartup,
  onNewRookie,
  onNewRedraft,
  onOpenSettings,
  onResume,
}: DraftLandingProps) {
  const inProgress = sessions.filter((s) => s.status === 'in_progress');
  const completed = sessions.filter((s) => s.status === 'completed');
  const [sessionTab, setSessionTab] = useState<'progress' | 'completed'>('progress');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const stats = useMemo(() => computeLobbyStats(sessions), [sessions]);
  const popular = useMemo(() => computePopularFormat(sessions), [sessions]);
  const visibleSessions = sessionTab === 'progress' ? inProgress : completed;

  if (activeTab === 'capital') {
    return (
      <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col gap-5 overflow-y-auto px-4 py-6 md:px-6 md:py-8 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-figtree text-[26px] font-extrabold uppercase tracking-[-0.5px] text-text md:text-[32px]">
              Draft Capital HQ
            </h1>
            <p className="mt-1 font-mono text-[12px] text-muted">
              Pick inventory across all leagues — trade from strength.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onTabChange('mocks')}
            className="shrink-0 rounded border border-border bg-[#0f1420] px-3 py-1.5 font-mono text-[11px] text-muted hover:text-text"
          >
            ← Draft Room
          </button>
        </div>
        <DraftCapitalView leagues={leagues} ownedPicksByLeague={ownedPicksByLeague} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[1500px] flex-col overflow-y-auto px-4 py-5 md:px-6 md:py-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-figtree text-[28px] font-extrabold uppercase tracking-[-0.5px] text-text md:text-[36px]">
            Draft Room
          </h1>
          <p className="mt-1 font-mono text-[13px] text-muted">Mock smarter. Draft better.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-[#0f1420] px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-boom" />
            <span className="font-mono text-[11px] uppercase tracking-wide text-text">
              BOB Status: <span className="text-boom">Online</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-[#0f1420] px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-muted transition-colors hover:text-text"
          >
            <Settings className="h-3.5 w-3.5" strokeWidth={2} />
            Draft Settings
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start">
        {/* Main column */}
        <div className="min-w-0 flex-1 space-y-6">
          {/* Mode cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StartupModeCard onStart={onNewStartup} />
            <RookieModeCard onStart={onNewRookie} />
            <RedraftModeCard onStart={onNewRedraft} />
            <CapitalModeCard onEnter={() => onTabChange('capital')} />
          </div>

          {/* Sessions table */}
          <div className="overflow-hidden rounded-[10px] border border-border bg-[#0f1420]">
            <div className="flex gap-1 border-b border-border px-4 pt-3">
              {(
                [
                  { id: 'progress' as const, label: 'In Progress', count: inProgress.length },
                  { id: 'completed' as const, label: 'Completed', count: completed.length },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSessionTab(t.id)}
                  className={`cursor-pointer border-b-2 px-3 pb-2.5 font-mono text-[12px] uppercase tracking-wide transition-colors ${
                    sessionTab === t.id
                      ? 'border-boom text-boom'
                      : 'border-transparent text-muted hover:text-text'
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            {visibleSessions.length === 0 ? (
              <div className="px-4 py-10 text-center font-mono text-[12px] text-muted">
                No {sessionTab === 'progress' ? 'in-progress' : 'completed'} drafts yet.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[720px] border-collapse">
                    <thead>
                      <tr className="border-b border-border font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
                        <th className="px-4 py-2.5 text-left font-normal">Mock Draft</th>
                        <th className="px-3 py-2.5 text-left font-normal">Format</th>
                        <th className="px-3 py-2.5 text-left font-normal">Teams</th>
                        <th className="px-3 py-2.5 text-left font-normal">Rounds</th>
                        <th className="px-3 py-2.5 text-left font-normal">Pick</th>
                        <th className="px-3 py-2.5 text-left font-normal">Started</th>
                        <th className="px-3 py-2.5 text-left font-normal">Status</th>
                        <th className="px-4 py-2.5 text-right font-normal" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSessions.map((s) => (
                        <SessionRow
                          key={s.id}
                          session={s}
                          menuOpen={menuOpenId === s.id}
                          onToggleMenu={() => setMenuOpenId(menuOpenId === s.id ? null : s.id)}
                          onResume={() => onResume(s.id)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile stacked cards */}
                <div className="space-y-2 p-3 md:hidden">
                  {visibleSessions.map((s) => (
                    <MobileSessionCard key={s.id} session={s} onResume={() => onResume(s.id)} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Trends strip */}
          <TrendsStrip popular={popular} />
        </div>

        {/* Right rail */}
        <aside className="w-full shrink-0 space-y-3 xl:w-[280px]">
          <InsightCard />
          <StatCard
            label="Mocks Completed"
            value={stats.mocksCompleted30d > 0 ? String(stats.mocksCompleted30d) : '—'}
            sub="Last 30 days"
            sparkline={stats.mocksSparkline}
          />
          <StatCard
            label="Avg Finish"
            value={stats.avgFinish}
            sub={stats.avgFinishPct !== '—' ? `Top ${stats.avgFinishPct}` : '—'}
            accent="bust"
          />
          <StatCard
            label="Draft IQ"
            value={stats.draftIq}
            sub={stats.draftIqLabel}
            accent="hold"
            icon={<Brain className="h-4 w-4 text-hold" strokeWidth={2} />}
          />
          <DominateCard />
        </aside>
      </div>
    </div>
  );
}

function StartupModeCard({ onStart }: { onStart: () => void }) {
  return (
    <div
      className="relative flex min-h-[200px] flex-col rounded-[12px] border-2 border-boom/40 bg-[#0f1420] p-5"
      style={{ boxShadow: '0 0 24px rgba(54,231,161,0.12)' }}
    >
      <span className="absolute right-4 top-4 rounded border border-boom/30 bg-boom/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-boom">
        Popular
      </span>
      <div className="font-figtree text-[18px] font-bold text-text">Startup Mock</div>
      <p className="mt-1 font-mono text-[11px] text-muted">Full dynasty startup</p>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
        <span>12 Teams</span>
        <span>15 Rounds</span>
        <span className="text-boom">BOB Assistant</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-auto cursor-pointer rounded-md bg-boom px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-bg transition-opacity hover:opacity-90"
      >
        Start Mock Draft →
      </button>
    </div>
  );
}

function RookieModeCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="relative flex min-h-[200px] flex-col rounded-[12px] border border-[#A78BFA]/30 bg-[#0f1420] p-5">
      <div className="font-figtree text-[18px] font-bold text-text">Rookie Mock</div>
      <p className="mt-1 font-mono text-[11px] text-muted">Rookie-only mock draft</p>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
        <span>12 Teams</span>
        <span>4 Rounds</span>
        <span className="text-[#A78BFA]">College Pool</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-auto cursor-pointer rounded-md border border-[#A78BFA]/50 bg-[#7c3aed]/15 px-4 py-3 font-mono text-[12px] uppercase tracking-wide text-[#A78BFA] transition-opacity hover:opacity-90"
      >
        Start Rookie Mock →
      </button>
    </div>
  );
}

function RedraftModeCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col rounded-[12px] border border-[#22D3EE]/25 bg-[#0f1420] p-5">
      <div className="font-figtree text-[18px] font-bold text-text">Redraft Mock</div>
      <p className="mt-1 font-mono text-[11px] text-muted">Season-long redraft simulator</p>
      <div className="mt-4 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
        <span>10–12 Teams</span>
        <span>15 Rounds</span>
        <span className="text-[#22D3EE]">Weekly Upside</span>
      </div>
      <button
        type="button"
        onClick={onStart}
        className="mt-auto w-fit cursor-pointer font-mono text-[12px] uppercase tracking-wide text-[#22D3EE] hover:underline"
      >
        Start Redraft Mock →
      </button>
    </div>
  );
}

function CapitalModeCard({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col rounded-[12px] border border-[#22D3EE]/25 bg-[#0f1420] p-5 md:col-span-2 xl:col-span-1">
      <div className="font-figtree text-[18px] font-bold text-text">Draft Capital HQ</div>
      <p className="mt-1 font-mono text-[11px] text-muted">Pick inventory & trade value center</p>
      <button
        type="button"
        onClick={onEnter}
        className="mt-auto w-fit cursor-pointer font-mono text-[12px] uppercase tracking-wide text-[#22D3EE] hover:underline"
      >
        Enter HQ →
      </button>
    </div>
  );
}

function SessionRow({
  session: s,
  menuOpen,
  onToggleMenu,
  onResume,
}: {
  session: DraftSessionSummary;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onResume: () => void;
}) {
  const fmt = formatDraftFormat(s);
  const pickLabel = currentPickLabel(s);
  const started = formatRelativeTime(s.createdAt);
  const isProgress = s.status === 'in_progress';

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border bg-[#141929]">
            <Zap className="h-3.5 w-3.5 text-boom" strokeWidth={2} />
          </div>
          <div>
            <div className="font-figtree text-[13px] text-text">{s.draftName || 'Startup Mock Draft'}</div>
            <div className="font-mono text-[10px] text-muted">
              {s.teams} teams · {s.rounds} rounds · {formatSessionDate(s.createdAt)}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] ${
            fmt === 'SF'
              ? 'border-bust/30 bg-bust/10 text-bust'
              : 'border-hold/30 bg-hold/10 text-hold'
          }`}
        >
          {fmt}
        </span>
      </td>
      <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-text">{s.teams}</td>
      <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-text">{s.rounds}</td>
      <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-boom">{pickLabel}</td>
      <td className="px-3 py-3 font-mono text-[11px] text-muted">{started}</td>
      <td className="px-3 py-3">
        {s.grade ? (
          <span className="font-mono text-[14px] text-boom">{s.grade}</span>
        ) : isProgress ? (
          <span className="font-mono text-[10px] uppercase text-muted">Live</span>
        ) : (
          <span className="font-mono text-[10px] text-muted">Done</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {isProgress && (
            <button
              type="button"
              onClick={onResume}
              className="cursor-pointer rounded border border-boom/30 bg-boom/10 px-3 py-1.5 font-mono text-[10px] uppercase text-boom hover:bg-boom/20"
            >
              Resume
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={onToggleMenu}
              className="cursor-pointer rounded border border-border p-1.5 text-muted hover:text-text"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={2} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[120px] rounded border border-border bg-[#0f1420] py-1 shadow-none">
                {isProgress && (
                  <button
                    type="button"
                    onClick={() => {
                      onResume();
                      onToggleMenu();
                    }}
                    className="block w-full px-3 py-1.5 text-left font-mono text-[11px] text-text hover:bg-white/[0.04]"
                  >
                    Resume
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function MobileSessionCard({
  session: s,
  onResume,
}: {
  session: DraftSessionSummary;
  onResume: () => void;
}) {
  const fmt = formatDraftFormat(s);
  return (
    <div className="rounded-[8px] border border-border bg-[#141929] p-3">
      <div className="font-figtree text-[14px] text-text">{s.draftName || 'Startup Mock Draft'}</div>
      <div className="mt-1 font-mono text-[10px] text-muted">
        {s.teams} teams · {s.rounds} rounds · {formatSessionDate(s.createdAt)}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px]">
        <span className="rounded border border-border px-2 py-0.5 text-muted">{fmt}</span>
        <span className="text-boom">Pick {currentPickLabel(s)}</span>
        <span className="text-muted">{formatRelativeTime(s.createdAt)}</span>
      </div>
      {s.status === 'in_progress' && (
        <button
          type="button"
          onClick={onResume}
          className="mt-3 w-full cursor-pointer rounded bg-boom py-2 font-mono text-[11px] uppercase text-bg"
        >
          Resume
        </button>
      )}
    </div>
  );
}

function TrendsStrip({ popular }: { popular: ReturnType<typeof computePopularFormat> }) {
  return (
    <div className="rounded-[10px] border border-border bg-[#0f1420] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">Popular Format</div>
          <div className="mt-1 font-figtree text-[14px] text-text">
            {popular?.label ?? 'Startup · 12 Teams · 15 Rounds · 1QB'}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 font-mono text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" strokeWidth={2} />
            Average Time: —
          </span>
          <span>Most Common Pick: —</span>
          <span>QB Taken in Rd 1: —</span>
          <span>RB Taken in Rd 1: —</span>
        </div>
        <button
          type="button"
          disabled
          className="shrink-0 font-mono text-[11px] uppercase text-muted"
        >
          View Draft Trends →
        </button>
      </div>
    </div>
  );
}

function InsightCard() {
  return (
    <div className="rounded-[10px] border border-[#FBBF24]/25 bg-[#141929] p-4">
      <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FBBF24]">
        <Zap className="h-3.5 w-3.5" strokeWidth={2} />
        BOB Insight
      </div>
      <p className="font-figtree text-[13px] leading-relaxed text-text">
        The best dynasty managers test. You compete. We give you the edge.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  sparkline,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: 'boom' | 'bust' | 'hold';
  sparkline?: number[];
  icon?: React.ReactNode;
}) {
  const subColor =
    accent === 'bust' ? 'text-bust' : accent === 'hold' ? 'text-hold' : 'text-muted';
  const max = sparkline ? Math.max(...sparkline, 1) : 1;

  return (
    <div className="rounded-[10px] border border-border bg-[#0f1420] p-4">
      <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div>
          <div className="font-mono text-[28px] leading-none tabular-nums text-text">{value}</div>
          <div className={`mt-1 font-mono text-[11px] ${subColor}`}>{sub}</div>
        </div>
        {icon}
        {sparkline && sparkline.some((n) => n > 0) && (
          <div className="flex h-8 items-end gap-0.5">
            {sparkline.map((n, i) => (
              <div
                key={i}
                className="w-2 rounded-sm bg-boom/40"
                style={{ height: `${Math.max(4, (n / max) * 32)}px` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DominateCard() {
  return (
    <div
      className="rounded-[10px] border border-[#FBBF24]/20 bg-[#141929] p-4"
      style={{ boxShadow: '0 0 16px rgba(251,191,36,0.06)' }}
    >
      <div className="mb-2 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[1.5px] text-[#FBBF24]">
        <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
        Dominate Draft Day
      </div>
      <p className="font-figtree text-[12px] leading-relaxed text-muted">
        Use draft capital, rankings, and BOB insights to build championship rosters.
      </p>
      <button
        type="button"
        className="mt-3 font-mono text-[11px] uppercase text-[#FBBF24] hover:underline"
      >
        View All Tools →
      </button>
    </div>
  );
}
