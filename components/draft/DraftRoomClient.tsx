'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  ChatMessage,
  DraftConfig,
  DraftGradeSummary,
  DraftLeague,
  DraftPhase,
  DraftPickRecord,
  DraftSessionSummary,
  DraftablePlayer,
} from '@/lib/draft/types';
import type { OwnedPick } from '@/lib/trade/types';
import { defaultDraftConfig, pickTimerSeconds } from '@/lib/draft/defaults';
import {
  bestAvailable,
  initPickOwnership,
  randomCpuChat,
  slotForOverall,
  slotOnClock,
  summarizeDraft,
} from '@/lib/draft/engine';
import { computeTierBreaks } from '@/lib/draft/tiers';
import DraftSetup from './DraftSetup';
import DraftLanding from './DraftLanding';
import DraftBoardMatrix from './DraftBoardMatrix';
import DraftWarRoomHeader from './DraftWarRoomHeader';
import DraftWarRoomRightRail from './DraftWarRoomRightRail';
import DraftTrendsFooter from './DraftTrendsFooter';
import DraftScoutingCard from './DraftScoutingCard';
import DraftPlayerPool from './DraftPlayerPool';
import DraftComplete from './DraftComplete';
import DraftTradeModal from './DraftTradeModal';
import { normalizeDraftConfig } from '@/lib/draft/normalizeConfig';
import { safeTotalPicks } from '@/lib/draft/safeDisplay';

interface DraftRoomClientProps {
  pool: DraftablePlayer[];
  scoringContext: 'dynasty' | 'redraft';
  sessions: DraftSessionSummary[];
  leagues: DraftLeague[];
  ownedPicksByLeague: Record<string, OwnedPick[]>;
}

const CPU_DELAY_MS = 650;

function takenSet(picks: DraftPickRecord[]): Set<string> {
  return new Set(picks.map((p) => p.player.playerId));
}

export default function DraftRoomClient({
  pool,
  scoringContext,
  sessions: initialSessions,
  leagues,
  ownedPicksByLeague,
}: DraftRoomClientProps) {
  const [phase, setPhase] = useState<DraftPhase>('landing');
  const [config, setConfig] = useState<DraftConfig>(defaultDraftConfig());
  const [picks, setPicks] = useState<DraftPickRecord[]>([]);
  const pickSeconds = pickTimerSeconds(config.pickTimer) || 60;
  const [clock, setClock] = useState(pickSeconds);
  const [summary, setSummary] = useState<DraftGradeSummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [queue, setQueue] = useState<DraftablePlayer[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<DraftablePlayer | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [pickOwnership, setPickOwnership] = useState<Map<number, number>>(() =>
    initPickOwnership(defaultDraftConfig()),
  );
  const [tradeTargetSlot, setTradeTargetSlot] = useState<number | null>(null);
  const [sessions] = useState(initialSessions);
  const [landingTab, setLandingTab] = useState<'mocks' | 'capital'>('mocks');
  const [draftStartedAt, setDraftStartedAt] = useState<number | null>(null);

  const normalizedConfig = useMemo(() => normalizeDraftConfig(config), [config]);

  const sessionIdRef = useRef<string | null>(null);
  const picksRef = useRef<DraftPickRecord[]>([]);
  const lastFilledRef = useRef(0);
  const chatCounter = useRef(0);

  useEffect(() => {
    picksRef.current = picks;
  }, [picks]);

  const filteredPool = useMemo(() => {
    if (config.playerPool === 'rookies') return pool.filter((p) => p.isRookie);
    if (config.playerPool === 'vets') return pool.filter((p) => !p.isRookie);
    return pool;
  }, [pool, config.playerPool]);

  const tierBreaks = useMemo(() => computeTierBreaks(filteredPool), [filteredPool]);
  const total = safeTotalPicks(normalizedConfig);
  const currentOverall = Math.max(1, picks.length + 1);

  const slotOpts = useMemo(
    () => ({
      thirdRoundReversal: normalizedConfig.thirdRoundReversal,
      linear: normalizedConfig.draftOrderType === 'linear',
    }),
    [normalizedConfig.thirdRoundReversal, normalizedConfig.draftOrderType],
  );

  const currentSlot = slotOnClock(currentOverall, normalizedConfig, pickOwnership);
  const isUserTurn = phase === 'drafting' && currentSlot === normalizedConfig.yourPick;
  const bobTop = useMemo(
    () => bestAvailable(filteredPool, takenSet(picks)),
    [filteredPool, picks],
  );

  const enrichPicks = useCallback(
    (raw: DraftPickRecord[]): DraftPickRecord[] =>
      raw.map((pk) => {
        const fromPool = pool.find((p) => p.playerId === pk.player?.playerId);
        const player = fromPool ?? {
          ...pk.player,
          tfoScore: pk.player?.tfoScore ?? 0,
          bobRank: pk.player?.bobRank ?? 999,
          marketRank: pk.player?.marketRank ?? 999,
          adp: pk.player?.adp ?? 999,
        };
        return { ...pk, player };
      }),
    [pool],
  );

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

  const pushChat = useCallback((slot: number, teamName: string, text: string) => {
    chatCounter.current += 1;
    setChat((c) => [
      ...c.slice(-40),
      { id: String(chatCounter.current), slot, teamName, text, ts: Date.now() },
    ]);
  }, []);

  const makePick = useCallback(
    (player: DraftablePlayer, isUser: boolean) => {
      const prev = picksRef.current;
      const overall = prev.length + 1;
      if (overall > total) return;
      if (overall <= lastFilledRef.current) return;
      const taken = takenSet(prev);
      if (taken.has(player.playerId)) return;
      lastFilledRef.current = overall;

      const top = bestAvailable(filteredPool, taken);
      const { round } = slotForOverall(overall, normalizedConfig.teams, slotOpts);
      const slot = slotOnClock(overall, normalizedConfig, pickOwnership);
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
      setQueue((q) => q.filter((x) => x.playerId !== player.playerId));

      if (!isUser) {
        const team = normalizedConfig.teamOrder.find((t) => t.slot === slot);
        if (Math.random() < 0.35) {
          pushChat(slot, team?.name ?? `Team ${slot}`, randomCpuChat(slot, team?.name ?? ''));
        }
      }
    },
    [filteredPool, normalizedConfig, pickOwnership, slotOpts, total, logPick, pushChat],
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
          draftName: config.draftName,
        }),
      }).catch((err) => console.error('[draft] complete failed:', err));
    }
  }, [config.draftName]);

  useEffect(() => {
    if (phase !== 'drafting') return;
    if (currentOverall > total) {
      finalize();
      return;
    }

    const userTurn = currentSlot === normalizedConfig.yourPick;

    if (userTurn) {
      setClock(pickSeconds);
      const iv = setInterval(() => {
        setClock((c) => {
          if (c <= 1) {
            clearInterval(iv);
            if (config.cpuAutopick) {
              const top = bestAvailable(filteredPool, takenSet(picksRef.current));
              if (top) makePick(top, true);
            }
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(iv);
    }

    const t = setTimeout(() => {
      const top = bestAvailable(filteredPool, takenSet(picksRef.current));
      if (top) makePick(top, false);
    }, CPU_DELAY_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOverall, phase, currentSlot]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    const nextConfig = normalizeDraftConfig(config);
    setConfig(nextConfig);
    setPicks([]);
    picksRef.current = [];
    lastFilledRef.current = 0;
    setSummary(null);
    setQueue([]);
    setChat([]);
    setPickOwnership(initPickOwnership(nextConfig));
    setDraftStartedAt(Date.now());
    try {
      const res = await fetch('/api/draft/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nextConfig, scoringContext, draftName: nextConfig.draftName }),
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

  const handleNewMock = useCallback((type: 'startup' | 'rookie' | 'redraft') => {
    const base = defaultDraftConfig();
    if (type === 'rookie') {
      setConfig({
        ...base,
        draftType: 'rookie',
        draftName: 'Rookie Mock Draft',
        playerPool: 'rookies',
        rounds: 4,
      });
    } else if (type === 'redraft') {
      setConfig({
        ...base,
        draftType: 'redraft',
        draftName: 'Redraft Mock',
        scoring: 'ppr',
        rounds: 15,
        playerPool: 'all',
      });
    } else {
      setConfig({ ...base, draftType: 'startup', draftName: 'Startup Mock Draft' });
    }
    setPhase('setup');
  }, []);

  const handleRestart = useCallback(() => {
    setPhase('landing');
    setPicks([]);
    picksRef.current = [];
    lastFilledRef.current = 0;
    setSummary(null);
    sessionIdRef.current = null;
    setConfig(defaultDraftConfig());
    setQueue([]);
    setSelectedPlayer(null);
  }, []);

  const addToQueue = useCallback((p: DraftablePlayer) => {
    setQueue((q) => (q.some((x) => x.playerId === p.playerId) ? q : [...q, p]));
    setWatchlist((w) => new Set(w).add(p.playerId));
  }, []);

  const removeFromQueue = useCallback((playerId: string) => {
    setQueue((q) => q.filter((x) => x.playerId !== playerId));
  }, []);

  const userPicks = useMemo(() => picks.filter((p) => p.isUser), [picks]);

  return (
    <>
      <header
        className="col-span-4 flex items-center justify-between border-b border-border bg-bg px-4"
        style={{
          height: phase === 'landing' || phase === 'drafting' ? 0 : 56,
          gridColumn: '1 / -1',
          overflow: 'hidden',
          borderBottomWidth: phase === 'landing' || phase === 'drafting' ? 0 : 1,
        }}
      >
        {phase !== 'landing' && phase !== 'drafting' && (
        <>
        <div>
          <div className="font-figtree text-[16px] font-extrabold text-text">
            {phase === 'complete' ? 'DRAFT COMPLETE' : 'DRAFT ROOM'}
          </div>
          <div className="font-mono text-[9px] text-muted">Mock smarter · Draft better</div>
        </div>
        {phase === 'complete' && summary && (
          <TopStat label="Grade" value={summary.grade} tone="boom" />
        )}
        </>
        )}
      </header>

      {phase === 'landing' && (
        <main className="col-span-4 min-h-0 overflow-hidden" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
          <DraftLanding
            sessions={sessions}
            leagues={leagues}
            ownedPicksByLeague={ownedPicksByLeague}
            activeTab={landingTab}
            onTabChange={setLandingTab}
            onNewStartup={() => handleNewMock('startup')}
            onNewRookie={() => handleNewMock('rookie')}
            onNewRedraft={() => handleNewMock('redraft')}
            onOpenSettings={() => setPhase('setup')}
            onResume={(id) => {
              void fetch(`/api/draft/resume?id=${id}`)
                .then((r) => r.json())
                .then((data) => {
                  const nextConfig = normalizeDraftConfig(data.config as DraftConfig);
                  const restored = enrichPicks((data.picks as DraftPickRecord[]) ?? []);
                  setConfig(nextConfig);
                  setPicks(restored);
                  picksRef.current = restored;
                  lastFilledRef.current = restored.length;
                  setPickOwnership(initPickOwnership(nextConfig));
                  sessionIdRef.current = id;
                  setDraftStartedAt(Date.now());
                  setPhase('drafting');
                })
                .catch(console.error);
            }}
          />
        </main>
      )}

      {phase === 'setup' && (
        <main className="col-span-4 min-h-0 overflow-y-auto" style={{ gridColumn: '1 / -1', gridRow: 2 }}>
          <DraftSetup
            config={config}
            onChange={(next) => setConfig((c) => ({ ...c, ...next }))}
            onStart={handleStart}
            starting={starting}
          />
        </main>
      )}

      {phase === 'drafting' && (
        <div
          className="col-span-4 flex min-h-0 flex-col overflow-hidden"
          style={{ gridColumn: '1 / -1', gridRow: 2 }}
        >
          <DraftWarRoomHeader
            config={normalizedConfig}
            currentOverall={currentOverall}
            currentSlot={currentSlot}
            clock={clock}
            poolCount={filteredPool.filter((p) => !takenSet(picks).has(p.playerId)).length}
            userPickCount={userPicks.length}
            onSettings={() => setPhase('setup')}
            onLeave={() => setShowLeaveConfirm(true)}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <DraftBoardMatrix
                config={normalizedConfig}
                picks={picks}
                currentOverall={currentOverall}
                onCellClick={(pk) => {
                  if (pk?.player) setSelectedPlayer(pk.player);
                }}
              />
              <div className="hidden shrink-0 border-t border-border p-2 md:block">
                <DraftScoutingCard
                  player={selectedPlayer}
                  pool={filteredPool}
                  currentOverall={currentOverall}
                  draftType={normalizedConfig.draftType}
                  onDraft={(p) => makePick(p, true)}
                  onQueue={addToQueue}
                  isUserTurn={isUserTurn}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col border-t border-border">
                <DraftPlayerPool
                  pool={filteredPool}
                  taken={takenSet(picks)}
                  tierBreaks={tierBreaks}
                  isUserTurn={isUserTurn}
                  currentOverall={currentOverall}
                  bobTopId={bobTop?.playerId ?? null}
                  onPick={(p) => makePick(p, true)}
                  onQueue={addToQueue}
                  watchlist={watchlist}
                  selectedId={selectedPlayer?.playerId}
                  onSelect={setSelectedPlayer}
                />
              </div>
            </div>
            <DraftWarRoomRightRail
              pool={filteredPool}
              picks={picks}
              config={normalizedConfig}
              tierBreaks={tierBreaks}
              currentOverall={currentOverall}
              currentSlot={currentSlot}
              isUserTurn={isUserTurn}
              clock={clock}
              queue={queue}
              chat={chat}
              onDraft={(p) => makePick(p, true)}
              onRemoveQueue={removeFromQueue}
              onViewAnalysis={setSelectedPlayer}
            />
          </div>
          <DraftTrendsFooter
            config={normalizedConfig}
            picks={picks}
            currentOverall={currentOverall}
            chat={chat}
            pool={filteredPool}
            taken={takenSet(picks)}
            watchlist={watchlist}
            onSelectPlayer={setSelectedPlayer}
          />

          {showLeaveConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-sm rounded-lg border border-border bg-[#0f1420] p-4">
                <div className="font-mono text-[12px] uppercase text-text">Leave Draft Room?</div>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  Mock progress is saved if a session exists. You can resume from the lobby.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLeaveConfirm(false)}
                    className="flex-1 rounded border border-border py-2 font-mono text-[10px] uppercase text-muted"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowLeaveConfirm(false);
                      setPhase('landing');
                    }}
                    className="flex-1 rounded bg-[#7c3aed] py-2 font-mono text-[10px] uppercase text-white"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'complete' && summary && (
        <DraftComplete
          summary={summary}
          config={config}
          onRestart={handleRestart}
          allPicks={picks}
        />
      )}

      {tradeTargetSlot != null && (
        <DraftTradeModal
          config={config}
          picks={picks}
          pickOwnership={pickOwnership}
          targetSlot={tradeTargetSlot}
          pool={filteredPool}
          onClose={() => setTradeTargetSlot(null)}
          onApply={(nextOwnership, message) => {
            setPickOwnership(nextOwnership);
            pushChat(
              tradeTargetSlot,
              config.teamOrder.find((t) => t.slot === tradeTargetSlot)?.name ?? `Team ${tradeTargetSlot}`,
              message,
            );
            setTradeTargetSlot(null);
          }}
        />
      )}

      <footer
        className="col-span-4 flex items-center gap-4 border-t border-border/50 bg-bg px-4 font-mono text-[7.5px] uppercase tracking-wide text-muted"
        style={{
          height: phase === 'drafting' ? 0 : 28,
          gridColumn: '1 / -1',
          overflow: 'hidden',
          borderTopWidth: phase === 'drafting' ? 0 : 1,
        }}
      >
        {phase !== 'drafting' && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-boom" />
              Engine Optimal
            </span>
            <span>Pool {filteredPool.length}</span>
          </>
        )}
      </footer>
    </>
  );
}

function TopStat({
  label,
  value,
  tone,
  color,
}: {
  label: string;
  value: string;
  tone?: 'boom';
  color?: string;
}) {
  return (
    <div className="text-right">
      <div className="font-mono text-[7px] uppercase tracking-wide text-muted">{label}</div>
      <div
        className={`font-mono text-[14px] ${tone === 'boom' ? 'text-boom' : color ? '' : 'text-text'}`}
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
