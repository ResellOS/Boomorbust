'use client';

import { useMemo } from 'react';
import type { DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { draftGradeAnalysis, draftGradeColor } from '@/lib/draft/analyst';
import { positionColor, slotForOverall } from '@/lib/draft/engine';
import { safePickLabel, safeRounds, safeTeams } from '@/lib/draft/safeDisplay';
import PlayerAvatar from '@/components/players/PlayerAvatar';

interface DraftMyTeamPanelProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
}

const STARTER_SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'BN', 'BN', 'BN'] as const;

export default function DraftMyTeamPanel({ config, picks }: DraftMyTeamPanelProps) {
  const userPicks = useMemo(() => picks.filter((p) => p.isUser), [picks]);
  const analysis = useMemo(
    () => draftGradeAnalysis(userPicks, config.superflex),
    [userPicks, config.superflex],
  );
  const teams = safeTeams(config);
  const rounds = safeRounds(config);

  const rosterFilled = useMemo(() => {
    const players = userPicks.map((p) => p.player);
    const slots: ({ label: string; player: (typeof players)[0] | null })[] = [];
    const used = new Set<string>();

    for (const slot of STARTER_SLOTS) {
      let match = players.find((p) => !used.has(p.playerId) && p.position === slot);
      if (!match && slot === 'FLEX') {
        match = players.find(
          (p) => !used.has(p.playerId) && ['RB', 'WR', 'TE'].includes(p.position),
        );
      }
      if (match) used.add(match.playerId);
      slots.push({ label: slot, player: match ?? null });
    }
    return slots;
  }, [userPicks]);

  const upcomingLabels = useMemo(() => {
    const userSlot = config.yourPick;
    const labels: string[] = [];
    const slotOpts = {
      thirdRoundReversal: config.thirdRoundReversal,
      linear: config.draftOrderType === 'linear',
    };
    for (let o = picks.length + 1; o <= teams * rounds && labels.length < 4; o++) {
      const { slot } = slotForOverall(o, teams, slotOpts);
      if (slot === userSlot) labels.push(safePickLabel(o, teams));
    }
    return labels;
  }, [config, picks.length, teams, rounds]);

  return (
    <aside className="flex min-h-0 w-full flex-col overflow-hidden border-r border-border bg-[#0f1420] md:w-[200px]">
      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">My Team</div>
      </div>

      <div className="shrink-0 border-b border-border px-3 py-2">
        <div className="mb-1.5 font-mono text-[9px] uppercase text-muted">Picks</div>
        {userPicks.length === 0 && upcomingLabels.length === 0 ? (
          <div className="font-mono text-[10px] text-muted/60">No picks yet</div>
        ) : (
          <div className="flex flex-wrap gap-1">
            {userPicks.map((pk) => (
              <span
                key={pk.overall}
                className="rounded border border-border bg-[#141929] px-1.5 py-0.5 font-mono text-[9px] text-boom"
              >
                {safePickLabel(pk.overall, teams)}
              </span>
            ))}
            {upcomingLabels.map((l) => (
              <span
                key={l}
                className="rounded border border-border/50 px-1.5 py-0.5 font-mono text-[9px] text-muted"
              >
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 [scrollbar-width:thin]">
        {rosterFilled.map(({ label, player }, i) => (
          <div
            key={`${label}-${i}`}
            className="mb-1.5 flex items-center gap-2 rounded border border-border/40 bg-[#141929]/60 px-2 py-1.5"
          >
            <span className="w-8 shrink-0 font-mono text-[8px] uppercase text-muted">{label}</span>
            {player ? (
              <>
                <PlayerAvatar playerId={player.playerId} name={player.name} size={22} />
                <span
                  className="min-w-0 flex-1 truncate font-mono text-[10px]"
                  style={{ color: positionColor(player.position) }}
                >
                  {player.name}
                </span>
              </>
            ) : (
              <span className="font-mono text-[10px] text-muted/50">—</span>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-3">
        <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">Draft Grade</div>
        <div
          className="mt-1 font-mono text-[32px] leading-none"
          style={{ color: draftGradeColor(analysis.grade) }}
        >
          {analysis.grade}
        </div>
        <div className="font-mono text-[11px] text-muted">{analysis.label}</div>
        <div className="mt-2">
          <div className="font-mono text-[8px] uppercase text-boom">Strengths</div>
          {analysis.strengths.map((s) => (
            <div key={s} className="font-mono text-[9px] text-muted">· {s}</div>
          ))}
        </div>
        <div className="mt-1.5">
          <div className="font-mono text-[8px] uppercase text-bust">Weaknesses</div>
          {analysis.weaknesses.map((w) => (
            <div key={w} className="font-mono text-[9px] text-muted">· {w}</div>
          ))}
        </div>
      </div>
    </aside>
  );
}
