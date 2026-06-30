'use client';

import Link from 'next/link';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import type { WeeklyDecisionCard } from '@/lib/startsit/types';
import { kindStyle } from './decisionStyles';

interface WhyBobPanelProps {
  card: WeeklyDecisionCard | null;
}

export default function WhyBobPanel({ card }: WhyBobPanelProps) {
  if (!card) {
    return (
      <div className="rounded-md border border-border bg-surface p-3">
        <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
          Why BOB Recommends This
        </div>
        <p className="mt-2 font-mono text-[11px] leading-relaxed text-muted">
          Select a decision from the queue to see BOB&apos;s reasoning.
        </p>
      </div>
    );
  }

  const style = kindStyle(card.kind);

  return (
    <div
      className="rounded-md border bg-surface p-3 transition-all duration-200"
      style={{ borderColor: style.border }}
    >
      <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        Why BOB Recommends This
      </div>
      <div className="mt-2 flex items-center gap-2">
        {card.playerId ? (
          <PlayerAvatar playerId={card.playerId} name={card.playerName} size={36} />
        ) : null}
        <div>
          <div className="font-mono text-[13px] uppercase text-text">{card.playerName}</div>
          <div className="font-mono text-[10px] text-muted">
            {card.team} · {card.opponent}
          </div>
        </div>
      </div>
      {card.isPreview && (
        <p className="mt-2 font-mono text-[10px] text-hold">
          Preview card — real recommendations appear Week 1
        </p>
      )}
      <ul className="mt-3 space-y-1">
        {card.whyBullets.slice(0, 6).map((b) => (
          <li key={b} className="flex gap-1.5 font-mono text-[11px] leading-relaxed text-text">
            <span className="shrink-0 text-boom">✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted">
        <span>{card.confidence}% confidence</span>
        {card.impact && <span>{card.impact} impact</span>}
      </div>
      {card.playerId && (
        <Link
          href={`/players?player=${card.playerId}`}
          className="mt-2 inline-block font-mono text-[10px] text-boom hover:underline"
        >
          View Full Analysis →
        </Link>
      )}
    </div>
  );
}
