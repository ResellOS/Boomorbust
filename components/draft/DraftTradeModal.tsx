'use client';

import { useMemo, useState } from 'react';
import type {
  DraftConfig,
  DraftPickRecord,
  DraftablePlayer,
  TradeAsset,
  TradeProposal,
} from '@/lib/draft/types';
import {
  evaluateTrade,
  picksForSlot,
  slotForOverall,
  swapPickSlots,
} from '@/lib/draft/engine';

interface DraftTradeModalProps {
  config: DraftConfig;
  picks: DraftPickRecord[];
  pickOwnership: Map<number, number>;
  targetSlot: number;
  pool: DraftablePlayer[];
  onClose: () => void;
  onApply: (ownership: Map<number, number>, message: string) => void;
}

export default function DraftTradeModal({
  config,
  picks,
  pickOwnership,
  targetSlot,
  onClose,
  onApply,
}: DraftTradeModalProps) {
  const [offerPick, setOfferPick] = useState<number | null>(null);
  const [requestPick, setRequestPick] = useState<number | null>(null);
  const [offerPlayerId, setOfferPlayerId] = useState<string | null>(null);
  const [requestPlayerId, setRequestPlayerId] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const userSlot = config.yourPick;
  const userPicks = useMemo(() => picksForSlot(picks, userSlot), [picks, userSlot]);
  const theirPicks = useMemo(() => picksForSlot(picks, targetSlot), [picks, targetSlot]);

  const futurePicks = useMemo(() => {
    const out: { overall: number; round: number; slot: number; owner: number }[] = [];
    const total = config.teams * config.rounds;
    for (let o = picks.length + 1; o <= total; o++) {
      const owner = pickOwnership.get(o) ?? slotForOverall(o, config.teams).slot;
      const { round, slot } = slotForOverall(o, config.teams, {
        thirdRoundReversal: config.thirdRoundReversal,
        linear: config.draftOrderType === 'linear',
      });
      out.push({ overall: o, round, slot, owner });
    }
    return out;
  }, [config, picks.length, pickOwnership]);

  const userFuture = futurePicks.filter((p) => p.owner === userSlot);
  const theirFuture = futurePicks.filter((p) => p.owner === targetSlot);

  function playerValue(p: DraftablePlayer): number {
    return p.tfoScore * 10 + (500 - p.bobRank);
  }

  function pickValue(overall: number): number {
    return Math.max(50, 400 - overall * 2);
  }

  function submit() {
    const offer: TradeAsset[] = [];
    const request: TradeAsset[] = [];

    if (offerPlayerId) {
      const p = userPicks.find((x) => x.player.playerId === offerPlayerId)?.player;
      if (p) offer.push({ kind: 'player', player: p, value: playerValue(p) });
    }
    if (offerPick != null) {
      offer.push({ kind: 'pick', overall: offerPick, value: pickValue(offerPick) });
    }
    if (requestPlayerId) {
      const p = theirPicks.find((x) => x.player.playerId === requestPlayerId)?.player;
      if (p) request.push({ kind: 'player', player: p, value: playerValue(p) });
    }
    if (requestPick != null) {
      request.push({ kind: 'pick', overall: requestPick, value: pickValue(requestPick) });
    }

    if (offer.length === 0 || request.length === 0) {
      setResultMsg('Select assets on both sides.');
      return;
    }

    const proposal: TradeProposal = {
      fromSlot: userSlot,
      toSlot: targetSlot,
      offer,
      request,
    };

    const result = evaluateTrade(proposal);
    setResultMsg(result.message);

    if (result.accepted && offerPick != null && requestPick != null) {
      const next = swapPickSlots(pickOwnership, offerPick, requestPick);
      onApply(next, result.message);
      return;
    }

    if (result.accepted) {
      onApply(new Map(pickOwnership), result.message);
    }
  }

  const teamName =
    config.teamOrder.find((t) => t.slot === targetSlot)?.name ?? `Team ${targetSlot}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-[560px] overflow-y-auto rounded-[12px] border border-border bg-bg p-5 shadow-[0_0_40px_rgba(54,231,161,0.12)]">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="font-figtree text-[16px] font-bold text-text">Propose Trade</div>
            <div className="font-mono text-[10px] text-muted">With {teamName}</div>
          </div>
          <button type="button" onClick={onClose} className="font-mono text-[14px] text-muted hover:text-text">
            ×
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TradeSide
            title="You Give"
            players={userPicks.map((p) => p.player)}
            future={userFuture}
            selectedPlayer={offerPlayerId}
            selectedPick={offerPick}
            onPlayer={setOfferPlayerId}
            onPick={setOfferPick}
          />
          <TradeSide
            title="You Receive"
            players={theirPicks.map((p) => p.player)}
            future={theirFuture}
            selectedPlayer={requestPlayerId}
            selectedPick={requestPick}
            onPlayer={setRequestPlayerId}
            onPick={setRequestPick}
          />
        </div>

        {resultMsg && (
          <p className="mt-3 rounded-[6px] border border-border bg-surface px-3 py-2 font-figtree text-[11px] text-text">
            {resultMsg}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-[8px] bg-boom py-2.5 font-figtree text-[12px] font-bold uppercase text-bg"
          >
            Send Offer
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] border border-border px-4 py-2.5 font-figtree text-[12px] text-muted"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function TradeSide({
  title,
  players,
  future,
  selectedPlayer,
  selectedPick,
  onPlayer,
  onPick,
}: {
  title: string;
  players: DraftablePlayer[];
  future: { overall: number; round: number }[];
  selectedPlayer: string | null;
  selectedPick: number | null;
  onPlayer: (id: string | null) => void;
  onPick: (o: number | null) => void;
}) {
  return (
    <div className="rounded-[8px] border border-border bg-surface/40 p-3">
      <div className="mb-2 font-figtree text-[11px] font-bold uppercase text-muted">{title}</div>
      <div className="mb-2 font-mono text-[8px] uppercase text-muted">Players</div>
      {players.length === 0 ? (
        <div className="mb-2 font-figtree text-[10px] text-muted/70">None drafted</div>
      ) : (
        players.map((p) => (
          <button
            key={p.playerId}
            type="button"
            onClick={() => onPlayer(selectedPlayer === p.playerId ? null : p.playerId)}
            className={`mb-1 block w-full rounded px-2 py-1 text-left font-figtree text-[10px] ${
              selectedPlayer === p.playerId ? 'bg-boom/15 text-boom' : 'text-text hover:bg-white/5'
            }`}
          >
            {p.name} ({p.tfoScore.toFixed(1)})
          </button>
        ))
      )}
      <div className="mb-1 mt-2 font-mono text-[8px] uppercase text-muted">Future Picks</div>
      {future.slice(0, 6).map((fp) => (
        <button
          key={fp.overall}
          type="button"
          onClick={() => onPick(selectedPick === fp.overall ? null : fp.overall)}
          className={`mb-1 block w-full rounded px-2 py-1 text-left font-mono text-[10px] ${
            selectedPick === fp.overall ? 'bg-boom/15 text-boom' : 'text-muted hover:text-text'
          }`}
        >
          R{fp.round} · Pick {fp.overall}
        </button>
      ))}
    </div>
  );
}
