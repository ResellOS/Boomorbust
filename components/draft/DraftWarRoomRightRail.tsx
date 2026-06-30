'use client';

import type {
  ChatMessage,
  DraftConfig,
  DraftPickRecord,
  DraftablePlayer,
  TierBreak,
} from '@/lib/draft/types';
import DraftAssistantPanel from './DraftAssistantPanel';
import DraftRightPanel from './DraftRightPanel';
import { fmtClock, safePickLabel, safeTeams } from '@/lib/draft/safeDisplay';
import {
  needsLabel,
  pickConfidence,
  teamNeedsDetailed,
  draftStrategySummary,
  positionTierGroups,
  teamOnClockName,
  currentRound,
} from '@/lib/draft/warRoomUi';
import { bestAvailable, positionalNeed } from '@/lib/draft/engine';
import { tierBreakStatus } from '@/lib/draft/analyst';
import PlayerAvatar from '@/components/players/PlayerAvatar';
import CountUpNumber from '@/components/startsit/weekly/CountUpNumber';

interface DraftWarRoomRightRailProps {
  pool: DraftablePlayer[];
  picks: DraftPickRecord[];
  config: DraftConfig;
  tierBreaks: TierBreak[];
  currentOverall: number;
  currentSlot: number;
  isUserTurn: boolean;
  clock: number;
  queue: DraftablePlayer[];
  chat: ChatMessage[];
  onDraft: (player: DraftablePlayer) => void;
  onRemoveQueue: (playerId: string) => void;
  onViewAnalysis: (player: DraftablePlayer) => void;
}

export default function DraftWarRoomRightRail({
  pool,
  picks,
  config,
  tierBreaks,
  currentOverall,
  currentSlot,
  isUserTurn,
  clock,
  queue,
  chat,
  onDraft,
  onRemoveQueue,
  onViewAnalysis,
}: DraftWarRoomRightRailProps) {
  const teams = safeTeams(config);
  const taken = new Set(picks.map((p) => p.player.playerId));
  const userRoster = picks.filter((p) => p.isUser).map((p) => p.player);
  const bobPick = bestAvailable(pool, taken);
  const needs = teamNeedsDetailed(userRoster, config.superflex);
  const tierStatus = tierBreakStatus(pool, taken, tierBreaks);
  const round = currentRound(currentOverall, config);
  const strategy = draftStrategySummary(config, userRoster, tierStatus, round);
  const conf = bobPick ? pickConfidence(bobPick, currentOverall, tierStatus) : 0;
  const focusPos = bobPick?.position ?? 'RB';
  const tiers = positionTierGroups(pool, taken, focusPos, tierBreaks);

  return (
    <aside className="flex min-h-0 w-full flex-col overflow-hidden border-l border-border bg-[#0f1420] md:w-[320px] lg:w-[340px]">
      {/* On The Clock */}
      <section className="shrink-0 border-b border-border p-3">
        <div className="font-mono text-[9px] uppercase tracking-[1.5px] text-boom">On The Clock</div>
        <div className="mt-1 font-mono text-[13px] uppercase text-text">
          {teamOnClockName(config, currentSlot)}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="font-mono text-[11px] text-muted">Pick {safePickLabel(currentOverall, teams)}</div>
            <div className="font-mono text-[26px] tabular-nums leading-none text-boom">
              {fmtClock(clock)}
            </div>
          </div>
          {isUserTurn && (
            <span className="rounded border border-boom/40 bg-boom/10 px-2 py-0.5 font-mono text-[9px] uppercase text-boom">
              Your Pick
            </span>
          )}
        </div>
        <div className="mt-2 font-mono text-[10px] text-muted">
          Needs: <span className="text-text">{needsLabel(needs)}</span>
        </div>
        {bobPick && (
          <button
            type="button"
            onClick={() => onViewAnalysis(bobPick)}
            className="mt-2 flex w-full items-center gap-2 rounded border border-border bg-[#141929] p-2 text-left hover:border-boom/30"
          >
            <PlayerAvatar playerId={bobPick.playerId} name={bobPick.name} size={32} />
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[9px] uppercase text-muted">Best Available</div>
              <div className="truncate font-mono text-[11px] text-text">{bobPick.name}</div>
              <div className="font-mono text-[10px] text-boom">
                TFO {bobPick.tfoScore.toFixed(1)} · BPA #{bobPick.bobRank}
              </div>
            </div>
          </button>
        )}
        <div className="mt-2 flex items-center justify-between font-mono text-[10px]">
          <span className="text-muted">Pick Confidence</span>
          <span className="text-boom">
            <CountUpNumber value={conf} resetKey={`${currentOverall}-${bobPick?.playerId}`} suffix="%" />
          </span>
        </div>
      </section>

      {/* BOB Assistant — compact embed */}
      <div className="min-h-0 max-h-[340px] shrink-0 overflow-hidden border-b border-border">
        <DraftAssistantPanel
          pool={pool}
          picks={picks}
          config={config}
          tierBreaks={tierBreaks}
          currentOverall={currentOverall}
          isUserTurn={isUserTurn}
          onDraft={onDraft}
          onViewAnalysis={onViewAnalysis}
          compact
        />
      </div>

      {/* Team Needs */}
      <section className="shrink-0 border-b border-border p-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">Team Needs</div>
        <div className="grid grid-cols-2 gap-1.5">
          {needs.map((n) => (
            <div
              key={n.position}
              className="rounded border border-border/60 bg-[#141929] px-2 py-1 font-mono text-[10px]"
            >
              <span className="text-text">{n.position}</span>
              <span
                className="ml-1"
                style={{
                  color: n.level === 'High' ? '#36E7A1' : n.level === 'Medium' ? '#FBBF24' : '#64748B',
                }}
              >
                {n.level}
              </span>
              <span className="float-right text-muted">×{n.depth}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Draft Strategy */}
      <section className="shrink-0 border-b border-border p-3">
        <div className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">Draft Strategy</div>
        <div className="font-mono text-[11px] text-boom">{strategy.strategy}</div>
        <div className="mt-1 font-mono text-[10px] text-muted">
          Round Focus: <span className="text-text">{strategy.roundFocus}</span>
        </div>
        <div className="mt-1 font-mono text-[10px] text-hold">{strategy.tierBreak}</div>
        <div className="mt-1 font-mono text-[9px] text-muted">
          Approach: {strategy.approach} · Need: {positionalNeed(userRoster, config.superflex)}
        </div>
      </section>

      {/* Position Tiers */}
      {tiers.length > 0 && bobPick && (
        <section className="shrink-0 border-b border-border p-3">
          <div className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
            Position Tier — {focusPos}
          </div>
          {tiers.map((g) => (
            <div key={g.tier} className="mb-2">
              <div className="font-mono text-[9px] text-boom">Tier {g.tier}</div>
              {g.players.map((p, i) => (
                <div key={p.name} className="flex justify-between font-mono text-[10px] text-muted">
                  <span>
                    {i + 1}. {p.name.split(' ').pop()}
                  </span>
                  <span className="text-text">{p.score.toFixed(1)}</span>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}

      {/* Queue + Chat */}
      <div className="min-h-[160px] flex-1 overflow-hidden">
        <DraftRightPanel
          queue={queue}
          userPicks={picks.filter((p) => p.isUser)}
          chat={chat}
          onRemoveQueue={onRemoveQueue}
          onDraftFromQueue={onDraft}
          isUserTurn={isUserTurn}
        />
      </div>
    </aside>
  );
}
