'use client';

import { useState } from 'react';
import type { ChatMessage, DraftPickRecord, DraftablePlayer } from '@/lib/draft/types';
import { positionColor } from '@/lib/draft/engine';

type Tab = 'queue' | 'roster' | 'chat';

interface DraftRightPanelProps {
  queue: DraftablePlayer[];
  userPicks: DraftPickRecord[];
  chat: ChatMessage[];
  onRemoveQueue: (playerId: string) => void;
  onDraftFromQueue: (player: DraftablePlayer) => void;
  isUserTurn: boolean;
}

function PositionBadge({ position }: { position: string }) {
  return (
    <span
      className="inline-flex h-[16px] min-w-[22px] items-center justify-center rounded-[3px] px-0.5 font-mono text-[8px] font-bold"
      style={{ color: positionColor(position), background: `${positionColor(position)}1a` }}
    >
      {position}
    </span>
  );
}

export default function DraftRightPanel({
  queue,
  userPicks,
  chat,
  onRemoveQueue,
  onDraftFromQueue,
  isUserTurn,
}: DraftRightPanelProps) {
  const [tab, setTab] = useState<Tab>('queue');
  const tabs: { id: Tab; label: string }[] = [
    { id: 'queue', label: 'Queue' },
    { id: 'roster', label: 'Roster' },
    { id: 'chat', label: 'Chat' },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border">
      <div className="flex shrink-0 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 font-figtree text-[10px] font-bold uppercase tracking-wide ${
              tab === t.id ? 'border-b-2 border-boom text-boom' : 'text-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 [scrollbar-width:thin]">
        {tab === 'queue' && (
          <>
            {queue.length === 0 ? (
              <p className="px-1 py-4 text-center font-figtree text-[11px] text-muted">
                Queue empty — click + on a player to add.
              </p>
            ) : (
              queue.map((p) => (
                <div
                  key={p.playerId}
                  className="mb-1 flex items-center gap-2 rounded-[6px] border border-border/60 bg-bg/40 px-2 py-1.5"
                >
                  <PositionBadge position={p.position} />
                  <span className="min-w-0 flex-1 truncate font-figtree text-[11px] text-text">
                    {p.name}
                  </span>
                  <button
                    type="button"
                    disabled={!isUserTurn}
                    onClick={() => onDraftFromQueue(p)}
                    className="font-mono text-[8px] text-boom disabled:opacity-40"
                  >
                    Draft
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveQueue(p.playerId)}
                    className="font-mono text-[8px] text-muted hover:text-bust"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </>
        )}
        {tab === 'roster' && (
          <>
            {userPicks.length === 0 ? (
              <p className="px-1 py-4 text-center font-figtree text-[11px] text-muted">
                Your picks appear here as you draft.
              </p>
            ) : (
              userPicks.map((pk) => (
                <div
                  key={pk.overall}
                  className="mb-1 flex items-center justify-between gap-2 rounded-[6px] border border-border/60 px-2 py-1.5"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[8px] text-muted">
                      {pk.round}.{String(pk.slot).padStart(2, '0')}
                    </span>
                    <PositionBadge position={pk.player.position} />
                    <span className="truncate font-figtree text-[11px] text-text">
                      {pk.player.name}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-boom">
                    {pk.player.tfoScore.toFixed(1)}
                  </span>
                </div>
              ))
            )}
          </>
        )}
        {tab === 'chat' && (
          <div className="flex flex-col gap-2">
            {chat.length === 0 ? (
              <p className="py-4 text-center font-figtree text-[11px] text-muted">
                CPU teams will chat during the draft.
              </p>
            ) : (
              chat.map((m) => (
                <div key={m.id} className="rounded-[6px] bg-bg/50 px-2 py-1.5">
                  <div className="font-figtree text-[10px] font-semibold text-text">
                    {m.teamName}
                  </div>
                  <div className="font-figtree text-[10px] text-muted">{m.text}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
