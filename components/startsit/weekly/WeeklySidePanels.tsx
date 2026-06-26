'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { StartSitRecommendation } from '@/lib/startsit/types';

interface WeeklySidePanelsProps {
  boom: StartSitRecommendation[];
  bust: StartSitRecommendation[];
  weeklyRisks: string[];
  waiverAdd: StartSitRecommendation | null;
  benchRegret: { playerName: string; regretPct: number; threatens: string }[];
  weatherImpact: string;
  onSelectPlayer: (playerId: string) => void;
}

function PanelShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-2.5">
      <div className="mb-1.5 font-mono text-[8px] uppercase tracking-[1.5px] text-muted">
        {title}
      </div>
      {children}
    </div>
  );
}

const TIMELINE = [
  { time: 'Now', label: 'Review lineup' },
  { time: '11:30', label: 'Inactives' },
  { time: '12:15', label: 'Weather update' },
  { time: '12:45', label: 'Final BOB recalc' },
  { time: '1:00', label: 'Kickoff' },
];

export default function WeeklySidePanels({
  boom,
  bust,
  weeklyRisks,
  waiverAdd,
  benchRegret,
  weatherImpact,
  onSelectPlayer,
}: WeeklySidePanelsProps) {
  return (
    <div className="space-y-2">
      <PanelShell title="Boom Candidates">
        {boom.length === 0 ? (
          <p className="font-mono text-[9px] text-muted">No boom signals yet</p>
        ) : (
          <ul className="space-y-1.5">
            {boom.map((p) => (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => onSelectPlayer(p.playerId)}
                  className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
                >
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[9px] uppercase text-text">
                      {p.fullName}
                    </div>
                    <div className="font-mono text-[8px] text-boom">
                      {(p.projectedPoints ?? 0).toFixed(1)} pts · {p.confidence}%
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Bust Risks">
        {bust.length === 0 ? (
          <p className="font-mono text-[9px] text-muted">No bust flags</p>
        ) : (
          <ul className="space-y-1.5">
            {bust.map((p) => (
              <li key={p.playerId}>
                <button
                  type="button"
                  onClick={() => onSelectPlayer(p.playerId)}
                  className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
                >
                  <PlayerAvatar playerId={p.playerId} name={p.fullName} size={24} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-[9px] uppercase text-text">
                      {p.fullName}
                    </div>
                    <div className="font-mono text-[8px] text-bust">
                      Risk {Math.round(100 - p.startScore)}%
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Weekly Risks">
        {weeklyRisks.length === 0 && weatherImpact === 'Low' ? (
          <p className="font-mono text-[9px] text-muted">No major risks flagged</p>
        ) : (
          <ul className="space-y-0.5 font-mono text-[9px] text-muted">
            {weatherImpact !== 'Low' && (
              <li className="text-[#22D3EE]">Weather: {weatherImpact}</li>
            )}
            {weeklyRisks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Waiver Recommendation">
        {waiverAdd ? (
          <div>
            <button
              type="button"
              onClick={() => onSelectPlayer(waiverAdd.playerId)}
              className="flex w-full items-center gap-2 border-none bg-transparent p-0 text-left"
            >
              <PlayerAvatar playerId={waiverAdd.playerId} name={waiverAdd.fullName} size={28} />
              <div>
                <div className="font-mono text-[10px] uppercase text-boom">
                  Add {waiverAdd.fullName}
                </div>
                <div className="font-mono text-[8px] text-muted">
                  {waiverAdd.position} · {waiverAdd.confidence}% conf
                </div>
              </div>
            </button>
            <Link
              href="/dashboard"
              className="mt-1.5 inline-block w-full rounded border border-boom/30 bg-boom/10 py-1 text-center font-mono text-[8px] uppercase text-boom hover:bg-boom/15"
            >
              Approve Move
            </Link>
          </div>
        ) : (
          <p className="font-mono text-[9px] text-muted">No waiver edge this week</p>
        )}
      </PanelShell>

      <PanelShell title="Bench Regret Risk">
        {benchRegret.length === 0 ? (
          <p className="font-mono text-[9px] text-muted">No close bench calls</p>
        ) : (
          <ul className="space-y-1 font-mono text-[9px]">
            {benchRegret.map((b) => (
              <li key={b.playerName} className="flex justify-between gap-2">
                <span className="truncate text-text">{b.playerName}</span>
                <span className="shrink-0 text-hold">{b.regretPct}% vs {b.threatens.split(' ').pop()}</span>
              </li>
            ))}
          </ul>
        )}
      </PanelShell>

      <PanelShell title="Sunday Timeline">
        <div className="flex gap-0.5">
          {TIMELINE.map((t, i) => (
            <div key={t.time} className="flex-1 text-center">
              <div
                className="mx-auto h-1 rounded-full"
                style={{
                  background: i === 0 ? '#36E7A1' : '#1e2640',
                  boxShadow: i === 0 ? '0 0 6px rgba(54,231,161,0.5)' : undefined,
                }}
              />
              <div className="mt-1 font-mono text-[7px] text-muted">{t.time}</div>
              <div className="font-mono text-[6px] leading-tight text-muted">{t.label}</div>
            </div>
          ))}
        </div>
      </PanelShell>
    </div>
  );
}
