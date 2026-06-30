'use client';

import type { ConcentrationRow } from '@/lib/exposure/types';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import { positionAccent } from '@/lib/exposure/utils';

function RiskPill({ level, label }: { level: string; label: string }) {
  const styles =
    level === 'HIGH'
      ? 'border-[#EF4444]/40 bg-[#EF4444]/10 text-[#EF4444]'
      : level === 'MEDIUM'
        ? 'border-hold/40 bg-hold/10 text-hold'
        : 'border-boom/40 bg-boom/10 text-boom';
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[9px] uppercase ${styles} border`}>
      {label}
    </span>
  );
}

export default function ConcentrationRiskTable({ rows }: { rows: ConcentrationRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="mb-4 rounded-lg border border-border bg-surface px-4 py-6 text-center font-mono text-[12px] text-muted">
        No multi-league concentration yet — players in 2+ leagues appear here.
      </div>
    );
  }

  return (
    <section className="mb-4 overflow-x-auto rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-4 py-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
          Concentration Risk
        </div>
      </div>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr className="border-b border-border font-mono text-[9px] uppercase text-muted">
            {['Player', 'Leagues', 'Portfolio %', 'Risk', 'Verdict'].map((h) => (
              <th key={h} className="px-3 py-2">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.playerId} className="border-b border-border/40 last:border-b-0">
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PlayerAvatar
                    playerId={r.playerId}
                    name={r.fullName}
                    size={28}
                    fallbackColor={positionAccent(r.position)}
                  />
                  <div>
                    <div className="font-mono text-[11px] text-text">{r.fullName}</div>
                    <div className="font-mono text-[9px] text-muted">
                      {r.position} · {r.team}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-text">{r.leagueCount}</td>
              <td className="px-3 py-2.5 font-mono text-[11px] text-boom">{r.portfolioPct}%</td>
              <td className="px-3 py-2.5">
                <RiskPill level={r.riskLevel} label={r.riskBadge} />
              </td>
              <td className="px-3 py-2.5">
                <span
                  className="font-mono text-[10px] uppercase"
                  style={{ color: r.marketVerdict.color }}
                >
                  {formatMarketVerdictLabel(r.marketVerdict.verdict)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
