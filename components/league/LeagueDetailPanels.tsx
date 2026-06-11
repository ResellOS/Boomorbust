import Link from 'next/link';
import type { LeagueDetailData } from '@/lib/league/types';
import { VERDICT_BADGE_CLASS } from '@/lib/players/utils';
import PlayerAvatar from '@/components/players/PlayerAvatar';

function TfoCircle({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(100, score) / 100) * circ;
  return (
    <div className="relative h-[110px] w-[110px] shrink-0">
      <svg width={110} height={110} viewBox="0 0 110 110" aria-hidden>
        <circle cx={55} cy={55} r={r} fill="none" stroke="#1e2640" strokeWidth={6} />
        <circle
          cx={55}
          cy={55}
          r={r}
          fill="none"
          stroke="#36E7A1"
          strokeWidth={6}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-2xl leading-none text-boom">{score.toFixed(1)}</div>
        <div className="mt-0.5 text-center text-[8px] leading-snug tracking-wide text-muted">
          TFO TEAM
          <br />
          SCORE
        </div>
      </div>
    </div>
  );
}

function tendencyClass(t: string): string {
  if (t === 'Very Active') return 'bg-[rgba(239,68,68,0.08)] text-[#ef4444]';
  if (t === 'Active') return 'bg-boom/[0.08] text-boom';
  if (t === 'Selective') return 'bg-hold/[0.08] text-hold';
  if (t === 'Passive') return 'bg-muted/15 text-muted';
  return 'bg-bust/[0.08] text-bust';
}

function aggressionClass(a: string): string {
  if (a === 'Very High') return 'bg-[rgba(239,68,68,0.15)] font-semibold text-[#ef4444]';
  if (a === 'High') return 'bg-[rgba(239,68,68,0.1)] text-[#ef4444]';
  if (a === 'Medium') return 'bg-hold/[0.08] text-hold';
  return 'bg-muted/12 text-muted';
}

export default function LeagueDetailPanels({ data }: { data: LeagueDetailData }) {
  const { header, yourTeam, leagueIntel, standings, tradeTargets, managerTargets, signals, settings } =
    data;

  const headerStats = [
    { label: 'Team Grade', val: header.teamGrade, sub: String(header.teamGradeNumeric), grade: true },
    { label: 'TFO Team Score', val: header.tfoTeamScore.toFixed(1), sub: header.tfoPercentile, boom: true },
    { label: 'Contender Score', val: `${header.contenderScore}%`, sub: header.contenderLabel, boom: true },
    { label: 'Roster Construction', val: header.rosterConstruction, sub: header.rosterConstructionPct, elite: true },
    { label: 'Last Updated', val: header.lastUpdated, sub: 'Live Sync', small: true },
  ];

  return (
    <>
      <div className="flex shrink-0 items-center border-b border-border px-[18px] py-2.5">
        <Link
          href="/dashboard"
          className="mr-4 flex shrink-0 items-center gap-1 text-[11px] text-muted no-underline hover:text-text"
        >
          ← LEAGUE DETAIL
        </Link>
        <div className="mr-5 flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-boom to-bust text-xs font-bold text-bg">
            {header.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text">{header.name}</span>
              <span className="rounded-[3px] border border-boom/20 bg-boom/10 px-2 py-0.5 text-[9px] font-medium text-boom">
                {header.badge}
              </span>
            </div>
            <div className="mt-px text-[9px] text-muted">{header.subtitle}</div>
          </div>
        </div>
        <div className="ml-auto flex items-center">
          {headerStats.map((s) => (
            <div key={s.label} className="flex flex-col border-l border-border px-[18px]">
              <div className="text-[8px] uppercase tracking-wide text-muted">{s.label}</div>
              <div
                className={`mt-px font-mono ${
                  s.grade ? 'text-[22px] text-boom' : s.small ? 'text-sm text-text' : 'text-base text-boom'
                } ${s.elite ? 'text-boom' : ''}`}
              >
                {s.val}
              </div>
              <div className="text-[9px] text-muted">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[18px] py-3.5 [scrollbar-width:thin]">
        <div className="mb-3 grid grid-cols-3 gap-3">
          {/* YOUR TEAM */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">Your Team</div>
              <div className="text-[9px] text-muted">Roster overview with TFO scores and analysis</div>
            </div>
            <div className="p-3">
              <div className="mb-2.5 grid grid-cols-[114px_1fr] items-center gap-3.5">
                <TfoCircle score={yourTeam.tfoTeamScore} />
                <div>
                  {[
                    ['Record', yourTeam.record, 'text-boom'],
                    ['Points For', yourTeam.pointsFor.toFixed(1), 'text-boom'],
                    ['Projected Finish', String(yourTeam.projectedFinish), 'text-boom'],
                    ['Playoff Odds', `${yourTeam.playoffOdds}%`, 'text-boom'],
                    ['Championship Odds', `${yourTeam.championshipOdds}%`, 'text-hold'],
                  ].map(([l, v, c]) => (
                    <div key={String(l)} className="flex justify-between border-b border-border/50 py-[3px] last:border-b-0">
                      <span className="text-[9px] text-muted">{l}</span>
                      <span className={`font-mono text-[9px] ${c}`}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-2.5 grid grid-cols-2 gap-2">
                <div>
                  <div className="mb-1 text-[8px] font-semibold uppercase text-boom">Roster Strengths</div>
                  {yourTeam.strengths.map((s) => (
                    <div key={s} className="mb-0.5 flex items-center gap-1 text-[9px] text-muted">
                      <span className="h-[5px] w-[5px] rounded-full bg-boom" />
                      {s}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="mb-1 text-[8px] font-semibold uppercase text-[#ef4444]">Needs Attention</div>
                  {yourTeam.needsAttention.map((s) => (
                    <div key={s} className="mb-0.5 flex items-center gap-1 text-[9px] text-muted">
                      <span className="h-[5px] w-[5px] rounded-full bg-[#ef4444]" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mb-1.5 text-[8px] uppercase tracking-wide text-muted">Top Players by TFO Score</div>
              {yourTeam.topPlayers.map((p) => (
                <div key={p.playerId} className="flex items-center gap-1.5 border-b border-border/40 py-1 last:border-b-0">
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={20} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-text">{p.fullName}</div>
                    <div className="text-[8px] text-muted">
                      {p.position} · {p.team}
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-text">{p.tfoScore.toFixed(1)}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[7px] font-semibold ${VERDICT_BADGE_CLASS[p.verdict]}`}>
                    {p.verdict}
                  </span>
                </div>
              ))}
              <Link href="/players" className="mt-1.5 block text-[9px] text-boom no-underline hover:underline">
                View Full Roster →
              </Link>
            </div>
          </div>

          {/* LEAGUE INTEL */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">League Intel (LI)</div>
              <div className="text-[9px] text-muted">Know your league. Know your opponents.</div>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['Manager', 'LI', 'Trade', 'Draft', 'Agg', 'Overpays For'].map((h) => (
                      <th key={h} className="border-b border-border px-1 py-1 text-left text-[8px] uppercase tracking-wide text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leagueIntel.map((row) => (
                    <tr key={row.managerId} className="hover:bg-white/[0.01]">
                      <td className="border-b border-border/40 px-1 py-1 text-[9px] text-text">
                        {row.handle}
                        {row.isYou && <span className="ml-1 text-[7px] text-boom">(You)</span>}
                      </td>
                      <td className="border-b border-border/40 px-1 py-1">
                        <span className={`font-mono text-[10px] ${row.liScore >= 65 ? 'text-boom' : row.liScore >= 50 ? 'text-hold' : 'text-muted'}`}>
                          {row.liScore}
                        </span>
                      </td>
                      <td className="border-b border-border/40 px-1 py-1">
                        <span className={`rounded px-1 py-0.5 text-[7px] ${tendencyClass(row.tradeTendency)}`}>
                          {row.tradeTendency}
                        </span>
                      </td>
                      <td className="border-b border-border/40 px-1 py-1 text-[8px] text-muted">{row.draftStyle}</td>
                      <td className="border-b border-border/40 px-1 py-1">
                        <span className={`rounded px-1 py-0.5 text-[7px] ${aggressionClass(row.aggression)}`}>
                          {row.aggression}
                        </span>
                      </td>
                      <td className="border-b border-border/40 px-1 py-1 text-[8px] text-muted">{row.overpaysFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* STANDINGS */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">
                Standings &amp; Projections
              </div>
            </div>
            <div className="overflow-x-auto p-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    {['#', 'Team', 'Record', 'PF', 'Proj', 'Odds'].map((h) => (
                      <th key={h} className="border-b border-border px-1 py-1 text-left text-[8px] uppercase tracking-wide text-muted">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => (
                    <tr key={row.handle} className={row.isYou ? 'bg-boom/[0.03]' : 'hover:bg-white/[0.01]'}>
                      <td className="border-b border-border/40 px-1 py-1">
                        <span className={`font-mono text-[10px] ${row.rank <= 2 ? 'text-boom' : 'text-muted'}`}>
                          {row.rank}
                        </span>
                      </td>
                      <td className="border-b border-border/40 px-1 py-1 text-[9px] text-text">
                        {row.handle}
                        {row.isYou ? ' (You)' : ''}
                      </td>
                      <td className="border-b border-border/40 px-1 py-1 font-mono text-[9px]">{row.record}</td>
                      <td className="border-b border-border/40 px-1 py-1 font-mono text-[9px] text-muted">
                        {row.pointsFor}
                      </td>
                      <td className="border-b border-border/40 px-1 py-1 font-mono text-[9px] text-muted">
                        {row.projectedFinish}
                      </td>
                      <td className={`border-b border-border/40 px-1 py-1 font-mono text-[9px] ${row.playoffOdds >= 70 ? 'text-boom' : row.playoffOdds >= 40 ? 'text-hold' : 'text-muted'}`}>
                        {row.playoffOdds}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* TRADE OPPORTUNITIES */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">Trade Opportunities</div>
              <div className="text-[9px] text-muted">Target these players. Approach these managers.</div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-3">
              <div>
                <div className="mb-1.5 text-[8px] uppercase tracking-wide text-muted">Best Players to Target</div>
                {tradeTargets.map((t) => (
                  <div key={t.playerId} className="flex items-center gap-1.5 border-b border-border/40 py-1 last:border-b-0">
                    <PlayerAvatar playerId={t.playerId} name={t.fullName} size={20} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] text-text">{t.fullName}</div>
                      <div className="text-[7px] text-muted">
                        {t.position} · {t.team} · {t.ownerHandle}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-boom">{t.tfoScore.toFixed(1)}</span>
                  </div>
                ))}
                <Link href="/trade" className="mt-1.5 block text-[9px] text-boom no-underline">
                  View All Targets →
                </Link>
              </div>
              <div>
                <div className="mb-1.5 text-[8px] uppercase tracking-wide text-muted">
                  Managers to Approach <span className="text-boom">LI</span>
                </div>
                {managerTargets.map((m) => (
                  <div key={m.handle} className="flex gap-1.5 border-b border-border/40 py-1 last:border-b-0">
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] text-text">{m.handle}</div>
                      <div className="text-[8px] leading-snug text-muted">{m.note}</div>
                    </div>
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-boom">{m.liScore}</span>
                  </div>
                ))}
                <Link href="/trade" className="mt-1.5 block text-[9px] text-boom no-underline">
                  Trade Finder →
                </Link>
              </div>
            </div>
          </div>

          {/* SIGNALS */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">League-Specific Signals</div>
              <div className="text-[9px] text-muted">Insights tailored to your league settings.</div>
            </div>
            <div className="p-3">
              {signals.map((s) => (
                <div key={s.name} className="flex gap-2 border-b border-border/40 py-1.5 last:border-b-0">
                  <span className="text-sm">{s.icon}</span>
                  <div>
                    <div className="text-[10px] font-medium text-text">{s.name}</div>
                    <div className="text-[9px] leading-snug text-muted">{s.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SETTINGS */}
          <div className="overflow-hidden rounded-md border border-border bg-surface">
            <div className="border-b border-border px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-text">League Settings</div>
            </div>
            <div className="p-3">
              {Object.entries(settings).map(([key, val]) => (
                <div key={key} className="flex justify-between border-b border-border/40 py-1 last:border-b-0">
                  <span className="text-[9px] capitalize text-muted">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className="max-w-[180px] text-right text-[9px] text-text">{val}</span>
                </div>
              ))}
              <Link href="/settings" className="mt-2 block text-[9px] text-boom no-underline">
                Edit League Settings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
