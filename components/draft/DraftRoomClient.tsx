'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  DraftConfig,
  DraftGradeSummary,
  DraftPhase,
  DraftPickRecord,
  DraftablePlayer,
} from '@/lib/draft/types';
import {
  PICK_SECONDS,
  bestAvailable,
  slotForOverall,
  summarizeDraft,
} from '@/lib/draft/engine';
import DraftSetup from './DraftSetup';
import DraftBoard from './DraftBoard';
import DraftAssistantPanel from './DraftAssistantPanel';
import DraftComplete from './DraftComplete';

interface DraftRoomClientProps {
  pool: DraftablePlayer[];
  scoringContext: 'dynasty' | 'redraft';
}

const CPU_DELAY_MS = 650;

const DEFAULT_CONFIG: DraftConfig = {
  draftType: 'startup',
  teams: 12,
  rounds: 5,
  scoring: 'ppr',
  superflex: false,
  yourPick: 1,
};

function takenSet(picks: DraftPickRecord[]): Set<string> {
  return new Set(picks.map((p) => p.player.playerId));
}

export default function DraftRoomClient({
  pool,
  scoringContext,
}: DraftRoomClientProps) {
  const [phase, setPhase] = useState<DraftPhase>('setup');
  const [config, setConfig] = useState<DraftConfig>(DEFAULT_CONFIG);
  const [picks, setPicks] = useState<DraftPickRecord[]>([]);
  const [clock, setClock] = useState(PICK_SECONDS);
  const [summary, setSummary] = useState<DraftGradeSummary | null>(null);
  const [starting, setStarting] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const picksRef = useRef<DraftPickRecord[]>([]);
  const lastFilledRef = useRef(0); // highest overall already drafted

  useEffect(() => {
    picksRef.current = picks;
  }, [picks]);

  const total = config.teams * config.rounds;
  const currentOverall = picks.length + 1;

  const logPick = useCallback(
    (record: DraftPickRecord) => {
      const sessionId = sessionIdRef.current;
      if (!sessionId) return;
      void fetch('/api/draft/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          overall: record.overall,
          round: record.round,
          slot: record.slot,
          isUser: record.isUser,
          playerId: record.player.playerId,
          playerName: record.player.name,
          position: record.player.position,
          tfoScore: record.player.tfoScore,
          bobRank: record.player.bobRank,
          marketRank: record.player.marketRank,
          followedBob: record.followedBob,
          scoringContext,
        }),
      }).catch((err) => console.error('[draft] logPick failed:', err));
    },
    [scoringContext],
  );

  const makePick = useCallback(
    (player: DraftablePlayer, isUser: boolean) => {
      const prev = picksRef.current;
      const overall = prev.length + 1;
      if (overall > total) return;
      if (overall <= lastFilledRef.current) return; // guard double-fire
      const taken = takenSet(prev);
      if (taken.has(player.playerId)) return;
      lastFilledRef.current = overall;

      const top = bestAvailable(pool, taken);
      const { round, slot } = slotForOverall(overall, config.teams);
      const record: DraftPickRecord = {
        overall,
        round,
        slot,
        isUser,
        player,
        bobTopRank: top?.bobRank ?? player.bobRank,
        followedBob: isUser && top?.playerId === player.playerId,
      };
      logPick(record);
      setPicks((curr) => [...curr, record]);
    },
    [pool, config.teams, total, logPick],
  );

  const finalize = useCallback(() => {
    const finalPicks = picksRef.current;
    const result = summarizeDraft(finalPicks);
    setSummary(result);
    setPhase('complete');
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      void fetch('/api/draft/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          grade: result.grade,
          avgTfo: result.avgTfo,
          agreementRate: result.agreementRate,
        }),
      }).catch((err) => console.error('[draft] complete failed:', err));
    }
  }, []);

  // Turn driver — runs the clock for the user, auto-picks for CPU teams.
  useEffect(() => {
    if (phase !== 'drafting') return;
    if (currentOverall > total) {
      finalize();
      return;
    }

    const { slot } = slotForOverall(currentOverall, config.teams);
    const userTurn = slot === config.yourPick;

    if (userTurn) {
      setClock(PICK_SECONDS);
      const iv = setInterval(() => {
        setClock((c) => {
          if (c <= 1) {
            clearInterval(iv);
            const top = bestAvailable(pool, takenSet(picksRef.current));
            if (top) makePick(top, true); // clock expired → auto-pick BOB's top
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(iv);
    }

    const t = setTimeout(() => {
      const top = bestAvailable(pool, takenSet(picksRef.current));
      if (top) makePick(top, false);
    }, CPU_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOverall, phase]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    setPicks([]);
    picksRef.current = [];
    lastFilledRef.current = 0;
    setSummary(null);
    try {
      const res = await fetch('/api/draft/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, scoringContext }),
      });
      const json = (await res.json().catch(() => ({}))) as { sessionId?: string | null };
      sessionIdRef.current = json?.sessionId ?? null;
    } catch (err) {
      console.error('[draft] start failed:', err);
      sessionIdRef.current = null;
    }
    setPhase('drafting');
    setStarting(false);
  }, [config, scoringContext]);

  const handleRestart = useCallback(() => {
    setPhase('setup');
    setPicks([]);
    picksRef.current = [];
    lastFilledRef.current = 0;
    setSummary(null);
    sessionIdRef.current = null;
  }, []);

  const { slot: currentSlot } = slotForOverall(currentOverall, config.teams);
  const isUserTurn = phase === 'drafting' && currentSlot === config.yourPick;
  const round = Math.floor((Math.min(currentOverall, total) - 1) / config.teams) + 1;

  return (
    <>
      {/* Top bar (spans all three columns) */}
      <header
        className="row-start-1 col-span-3 flex items-center justify-between border-b border-border bg-bg px-5"
        style={{ height: 66 }}
      >
        <div>
          <div className="font-figtree text-[18px] font-extrabold tracking-[-0.3px] text-text">
            DRAFT ROOM
          </div>
          <div className="font-figtree text-[10px] text-muted">
            Mock smarter. Draft better.
          </div>
        </div>
        {phase === 'drafting' && (
          <div className="flex items-center gap-6">
            <TopStat label="Pick" value={`${Math.min(currentOverall, total)} / ${total}`} />
            <TopStat label="Round" value={`${round} / ${config.rounds}`} />
            <TopStat
              label="Format"
              value={`${config.teams}T ${config.superflex ? 'SF' : '1QB'}`}
            />
            <TopStat
              label="On Clock"
              value={isUserTurn ? 'YOU' : `Team ${currentSlot}`}
              tone={isUserTurn ? 'boom' : undefined}
            />
          </div>
        )}
        {phase === 'complete' && summary && (
          <div className="flex items-center gap-6">
            <TopStat label="Grade" value={summary.grade} tone="boom" />
            <TopStat label="Avg TFO" value={summary.avgTfo.toFixed(1)} />
          </div>
        )}
      </header>

      {/* Middle — phase-dependent */}
      {phase === 'setup' && (
        <main
          className="row-start-2 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ gridColumn: '2 / -1' }}
        >
          <DraftSetup
            config={config}
            onChange={(next) => setConfig((c) => ({ ...c, ...next }))}
            onStart={handleStart}
            starting={starting}
          />
        </main>
      )}

      {phase === 'drafting' && (
        <>
          <DraftBoard
            pool={pool}
            picks={picks}
            config={config}
            currentOverall={currentOverall}
            totalPicks={total}
            isUserTurn={isUserTurn}
            clock={clock}
            onPick={(p) => {
              if (isUserTurn) makePick(p, true);
            }}
          />
          <DraftAssistantPanel pool={pool} picks={picks} config={config} />
        </>
      )}

      {phase === 'complete' && summary && (
        <DraftComplete summary={summary} config={config} onRestart={handleRestart} />
      )}

      {/* Footer (spans all three columns) */}
      <footer
        className="row-start-3 col-span-3 flex items-center gap-5 border-t border-border/50 bg-bg/[0.98] px-5"
        style={{ height: 28 }}
      >
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-boom" />
          <span className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
            Draft Engine Optimal
          </span>
        </span>
        <span className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
          Context: {scoringContext}
        </span>
        <span className="font-mono text-[7.5px] uppercase tracking-wide text-muted">
          Pool: {pool.length} players
        </span>
        {phase === 'drafting' && (
          <span className="ml-auto font-mono text-[7.5px] uppercase tracking-wide text-muted">
            {picks.length} picks logged
          </span>
        )}
      </footer>
    </>
  );
}

function TopStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'boom';
}) {
  return (
    <div className="text-right">
      <div className="font-mono text-[7.5px] uppercase tracking-[1.5px] text-muted">
        {label}
      </div>
      <div
        className={`font-figtree text-[15px] font-bold leading-tight ${
          tone === 'boom' ? 'text-boom' : 'text-text'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
