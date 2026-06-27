'use client';

import type { ChatMessage, DraftConfig, DraftPickRecord, DraftablePlayer } from '@/lib/draft/types';
import { computeDraftDynamics } from '@/lib/draft/analyst';
import { slotForOverall } from '@/lib/draft/engine';
import { abbrevName, safePickLabel, safeTeams, safeTotalPicks } from '@/lib/draft/safeDisplay';
import { trendingDown, trendingUp } from '@/lib/draft/warRoomUi';

interface DraftTrendsFooterProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
  currentOverall: number;
  chat: ChatMessage[];
  pool: DraftablePlayer[];
  taken: Set<string>;
  watchlist: Set<string>;
  onSelectPlayer?: (player: DraftablePlayer) => void;
}

export default function DraftTrendsFooter({
  config,
  picks,
  currentOverall,
  chat,
  pool,
  taken,
  watchlist,
  onSelectPlayer,
}: DraftTrendsFooterProps) {
  const teams = safeTeams(config);
  const total = safeTotalPicks(config);
  const dynamics = computeDraftDynamics(picks, pool, taken, currentOverall);
  const posRun = dynamics.find((d) => d.kind === 'position_run');
  const valueAlert = dynamics.find((d) => d.kind === 'value');
  const up = trendingUp(pool, taken, 3);
  const down = trendingDown(pool, taken, 3);
  const targets = pool.filter((p) => watchlist.has(p.playerId) && !taken.has(p.playerId)).slice(0, 3);

  const slotOpts = {
    thirdRoundReversal: config.thirdRoundReversal,
    linear: config.draftOrderType === 'linear',
  };

  const nextPicks = Array.from({ length: Math.min(5, total - picks.length) }, (_, i) => {
    const overall = picks.length + 1 + i;
    const { slot } = slotForOverall(overall, teams, slotOpts);
    const team = config.teamOrder.find((t) => t.slot === slot);
    return {
      overall,
      label: safePickLabel(overall, teams),
      team: team?.name?.slice(0, 10) ?? `T${slot}`,
    };
  });

  return (
    <div className="shrink-0 border-t border-border bg-[#0a0d14] px-3 py-2 md:px-4">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-5">
        <Panel title="Draft Trending Up">
          {up.length === 0 ? (
            <Empty>No trends yet — board balanced</Empty>
          ) : (
            up.map(({ player, delta }) => (
              <TrendRow
                key={player.playerId}
                name={player.name}
                detail={`+${delta} vs market`}
                up
                onClick={() => onSelectPlayer?.(player)}
              />
            ))
          )}
        </Panel>

        <Panel title="Draft Trending Down">
          {down.length === 0 ? (
            <Empty>No fallers flagged</Empty>
          ) : (
            down.map(({ player, delta }) => (
              <TrendRow
                key={player.playerId}
                name={player.name}
                detail={`-${delta} vs BOB`}
                onClick={() => onSelectPlayer?.(player)}
              />
            ))
          )}
        </Panel>

        <Panel title="My Targets">
          {targets.length === 0 ? (
            <Empty>Queue empty — click + on a player</Empty>
          ) : (
            targets.map((p) => (
              <TrendRow
                key={p.playerId}
                name={p.name}
                detail={`${p.position} · ${p.tfoScore.toFixed(1)}`}
                onClick={() => onSelectPlayer?.(p)}
              />
            ))
          )}
        </Panel>

        <Panel title="League Settings">
          <div className="space-y-0.5 font-mono text-[9px] text-muted">
            <div>{config.draftType} · {teams} teams</div>
            <div>{config.rounds} rounds · {config.draftOrderType}</div>
            <div>Timer: {config.pickTimer === 'none' ? 'Off' : `${config.pickTimer}s`}</div>
            <div>{config.superflex ? 'Superflex' : '1QB'} · Mock</div>
          </div>
        </Panel>

        <Panel title="Draft Queue / Feed">
          <div className="font-mono text-[9px] text-muted">
            {chat.length > 0 ? (
              <span className="text-text">{chat[chat.length - 1]!.teamName}: {chat[chat.length - 1]!.text}</span>
            ) : posRun && posRun.kind === 'position_run' ? (
              <span className="text-hold">{posRun.position} run — {posRun.count} in last {posRun.window}</span>
            ) : valueAlert && valueAlert.kind === 'value' ? (
              <span className="text-boom">
                Value: {abbrevName(valueAlert.player.name)} (+{valueAlert.margin})
              </span>
            ) : (
              'Assistant scanning board…'
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {nextPicks.map((p) => (
              <span
                key={p.overall}
                className="rounded border border-border bg-[#141929] px-1 py-0.5 font-mono text-[7px] text-text"
              >
                {p.label} {p.team}
              </span>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border/60 bg-[#0f1420] p-2">
      <div className="mb-1 font-mono text-[7px] uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[9px] text-muted">{children}</p>;
}

function TrendRow({
  name,
  detail,
  up,
  onClick,
}: {
  name: string;
  detail: string;
  up?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-0.5 flex w-full items-center justify-between border-none bg-transparent p-0 text-left font-mono text-[9px] hover:text-boom"
    >
      <span className="truncate text-text">{name.split(' ').pop()}</span>
      <span className={up ? 'text-boom' : 'text-bust'}>{detail}</span>
    </button>
  );
}
