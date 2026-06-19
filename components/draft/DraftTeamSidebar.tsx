'use client';

import type { DraftConfig, DraftPickRecord } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';

interface DraftTeamSidebarProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
}

export default function DraftTeamSidebar({ config, picks }: DraftTeamSidebarProps) {
  const bySlot = new Map<number, DraftPickRecord[]>();
  for (const p of picks) {
    if (!bySlot.has(p.slot)) bySlot.set(p.slot, []);
    bySlot.get(p.slot)!.push(p);
  }

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden border-r border-border bg-surface/40">
      <div className="shrink-0 border-b border-border px-2 py-2">
        <div className="font-figtree text-[9px] font-bold uppercase tracking-[1.5px] text-muted">
          Teams
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:thin]">
        {config.teamOrder.map((team) => {
          const teamPicks = bySlot.get(team.slot) ?? [];
          const isUser = team.isUser;
          return (
            <div
              key={team.slot}
              className={`border-b border-border/50 px-2 py-2 ${isUser ? 'bg-boom/[0.04]' : ''}`}
            >
              <div
                className={`mb-1.5 truncate font-figtree text-[10px] font-bold ${
                  isUser ? 'text-boom' : 'text-text'
                }`}
              >
                {team.name}
              </div>
              {teamPicks.length === 0 ? (
                <div className="font-mono text-[8px] text-muted/60">No picks yet</div>
              ) : (
                teamPicks.map((pk) => (
                  <div key={pk.overall} className="mb-0.5 flex items-start gap-1">
                    <span className="w-4 shrink-0 font-mono text-[7px] text-muted">{pk.round}</span>
                    <span
                      className="min-w-0 flex-1 truncate font-figtree text-[9px] leading-tight"
                      style={{ color: positionColor(pk.player.position) }}
                    >
                      {pk.player.name}
                    </span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
