'use client';

import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { WeeklyDecisionCard } from '@/lib/startsit/types';
import { kindStyle } from './decisionStyles';

interface DecisionQueueProps {
  cards: WeeklyDecisionCard[];
  selectedId: string | null;
  approvedIds: Set<string>;
  ignoredIds: Set<string>;
  showLeagueLabels: boolean;
  onSelect: (card: WeeklyDecisionCard) => void;
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

function DecisionCard({
  card,
  selected,
  approved,
  showLeagueLabels,
  onSelect,
  onApprove,
  onDismiss,
}: {
  card: WeeklyDecisionCard;
  selected: boolean;
  approved: boolean;
  showLeagueLabels: boolean;
  onSelect: () => void;
  onApprove: () => void;
  onDismiss: () => void;
}) {
  const style = kindStyle(card.kind);
  const label =
    card.kind === 'WEATHER'
      ? `WEATHER: ${card.opponent}`
      : card.kind === 'TRADE'
        ? `TRADE for ${card.playerName}`
        : `${card.kind} ${card.playerName}`;

  return (
    <div
      className={`rounded-md border bg-surface transition-all duration-300 ${
        approved ? 'opacity-50 scale-[0.98]' : ''
      } ${selected ? 'ring-1 ring-boom/40' : ''}`}
      style={{
        borderColor: style.border,
        borderLeftWidth: 3,
        borderLeftColor: style.color,
        background: style.bg,
      }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="w-full border-none bg-transparent p-2.5 text-left"
      >
        <div className="flex items-start gap-2">
          {card.playerId ? (
            <PlayerAvatar playerId={card.playerId} name={card.playerName} size={36} />
          ) : (
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface2 font-mono text-[10px] text-muted"
            >
              {card.kind === 'WEATHER' ? '☁' : '—'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className="rounded px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wide"
                style={{ color: style.color, border: `1px solid ${style.border}` }}
              >
                {card.kind}
              </span>
              {card.isPreview && (
                <span className="rounded border border-hold/40 px-1.5 py-0.5 font-mono text-[7px] uppercase text-hold">
                  Preview
                </span>
              )}
              {approved && (
                <span className="font-mono text-[8px] uppercase text-boom">Completed</span>
              )}
            </div>
            <div className="mt-0.5 truncate font-mono text-[11px] uppercase text-text">{label}</div>
            <div className="font-mono text-[9px] text-muted">
              {card.team} · {card.opponent}
              {card.projectedPoints != null && (
                <span className="text-text"> · {card.projectedPoints.toFixed(1)} pts</span>
              )}
            </div>
            {showLeagueLabels && card.leagueName && (
              <div className="mt-0.5 font-mono text-[8px] text-muted">{card.leagueName}</div>
            )}
            <div className="mt-1 flex flex-wrap gap-2 font-mono text-[8px]">
              <span style={{ color: style.color }}>{card.impact} Impact</span>
              <span className="text-muted">{card.confidence}% Confidence</span>
            </div>
          </div>
        </div>
      </button>
      {!approved && !card.isPreview && (
        <div className="flex gap-1 border-t border-border/50 px-2.5 py-1.5">
          <button
            type="button"
            onClick={onApprove}
            className="flex-1 rounded border-none bg-boom/15 py-1 font-mono text-[9px] uppercase text-boom hover:bg-boom/25"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={onSelect}
            className="flex-1 rounded border border-border bg-surface2 py-1 font-mono text-[9px] uppercase text-muted hover:text-text"
          >
            Explain
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded border border-border bg-transparent px-2 py-1 font-mono text-[9px] text-muted hover:text-text"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default function DecisionQueue({
  cards,
  selectedId,
  approvedIds,
  ignoredIds,
  showLeagueLabels,
  onSelect,
  onApprove,
  onDismiss,
}: DecisionQueueProps) {
  const pending = cards.filter((c) => !ignoredIds.has(c.id) && !approvedIds.has(c.id));
  const completed = cards.filter((c) => approvedIds.has(c.id));

  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        Today&apos;s Decisions
      </div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {pending.length === 0 && completed.length === 0 && (
          <p className="rounded-md border border-border bg-surface2/50 p-3 font-mono text-[10px] leading-relaxed text-muted">
            Weekly decisions activate Week 1. Preseason lineup preview will appear here when roster
            data is available.
          </p>
        )}
        {pending.map((card) => (
          <DecisionCard
            key={card.id}
            card={card}
            selected={selectedId === card.id}
            approved={false}
            showLeagueLabels={showLeagueLabels}
            onSelect={() => onSelect(card)}
            onApprove={() => onApprove(card.id)}
            onDismiss={() => onDismiss(card.id)}
          />
        ))}
        {completed.length > 0 && (
          <>
            <div className="pt-1 font-mono text-[8px] uppercase tracking-wide text-muted">
              Completed
            </div>
            {completed.map((card) => (
              <DecisionCard
                key={card.id}
                card={card}
                selected={selectedId === card.id}
                approved
                showLeagueLabels={showLeagueLabels}
                onSelect={() => onSelect(card)}
                onApprove={() => {}}
                onDismiss={() => {}}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
