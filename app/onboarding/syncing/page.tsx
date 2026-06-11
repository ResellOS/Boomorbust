'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import WarRoomLoader from '@/components/WarRoomLoader';
import { markSyncComplete } from '@/lib/sync/autoSync';

const MIN_DISPLAY_MS = 15_000;
const LEAGUE_IDS_KEY = 'bob:onboarding_league_ids';

const SYNC_STAGES = [
  'CONNECTING TO SLEEPER...',
  'IMPORTING LEAGUES...',
  'SCANNING ROSTERS...',
  'ANALYZING PLAYERS...',
  'CALCULATING DYNASTY SCORES...',
  'BUILDING YOUR EDGE...',
];

const ANALYSIS_STAGES = [
  'CROSS-REFERENCING TRADE HISTORY...',
  'MAPPING LEAGUE TENDENCIES...',
  'CALIBRATING DYNASTY SCORES...',
  'IDENTIFYING MARKET INEFFICIENCIES...',
  'SCANNING WAIVER WIRE OPPORTUNITIES...',
  'CALCULATING YOUR EDGE...',
  'FINALIZING WAR ROOM...',
];

interface SyncStatus {
  stage?: string;
  progress?: number;
  dataReady?: boolean;
  leagueCount?: number;
  playerCount?: number;
}

export default function SyncingPage() {
  const router = useRouter();

  const [displayProgress, setDisplayProgress] = useState(2);
  const [statusText, setStatusText] = useState(SYNC_STAGES[0]);
  const [ready, setReady] = useState(false);
  const [mega, setMega] = useState(false);

  const syncDoneRef = useRef(false);
  const minElapsedRef = useRef(false);
  const apiProgressRef = useRef(0);
  const finishedRef = useRef(false);
  const startedAtRef = useRef(Date.now());

  // Kick off the sync + poll status + drive progress/status loops.
  useEffect(() => {
    let cancelled = false;
    startedAtRef.current = Date.now();

    // 1. Fire the actual sync.
    (async () => {
      let leagueIds: string[] = [];
      try {
        const raw = sessionStorage.getItem(LEAGUE_IDS_KEY);
        if (raw) leagueIds = JSON.parse(raw) as string[];
      } catch {
        /* none stored */
      }

      try {
        const res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(leagueIds.length > 0 ? { league_ids: leagueIds } : {}),
        });
        if (res.status === 401) {
          router.replace('/auth/login');
          return;
        }
        if (res.ok) markSyncComplete();
      } catch {
        /* status polling below still resolves completion */
      } finally {
        if (!cancelled) {
          syncDoneRef.current = true;
          try {
            sessionStorage.removeItem(LEAGUE_IDS_KEY);
          } catch {
            /* ignore */
          }
        }
      }
    })();

    // 2. Poll sync status every second.
    const poll = setInterval(async () => {
      try {
        const res = await fetch('/api/sync/status', { credentials: 'include' });
        if (!res.ok) return;
        const data = (await res.json()) as SyncStatus;
        if (typeof data.progress === 'number') apiProgressRef.current = data.progress;
        if (data.dataReady || data.progress === 100) {
          apiProgressRef.current = 100;
        }
      } catch {
        /* keep animating */
      }
    }, 1000);

    // 3. Minimum display timer.
    const minTimer = setTimeout(() => {
      minElapsedRef.current = true;
    }, MIN_DISPLAY_MS);

    // 4. Progress animation loop.
    const progressTick = setInterval(() => {
      if (finishedRef.current) return;
      setDisplayProgress((cur) => {
        const elapsed = Date.now() - startedAtRef.current;

        if (syncDoneRef.current || apiProgressRef.current >= 100) {
          if (!minElapsedRef.current) {
            // Fill to 95 quickly, then crawl toward 99 during the hold.
            if (cur < 95) return Math.min(95, cur + 4);
            return Math.min(99, cur + 0.12);
          }
          return cur; // completion handler snaps to 100
        }

        // Sync still running: blend time-based easing with real API progress, cap 90.
        const timeTarget = Math.min(85, (elapsed / 1000) * 9);
        const apiTarget = apiProgressRef.current * 0.9;
        const target = Math.min(90, Math.max(timeTarget, apiTarget));
        return cur < target ? Math.min(target, cur + 2.5) : cur;
      });
    }, 100);

    // 5. Completion checker — both sync done AND 15s elapsed.
    const completionTick = setInterval(() => {
      if (finishedRef.current) return;
      if ((syncDoneRef.current || apiProgressRef.current >= 100) && minElapsedRef.current) {
        finishedRef.current = true;
        setDisplayProgress(100);
        setMega(true);
        setReady(true);
        setTimeout(() => {
          if (!cancelled) router.replace('/dashboard');
        }, 1000);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearInterval(poll);
      clearInterval(progressTick);
      clearInterval(completionTick);
      clearTimeout(minTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Status message cycling: sync stages first, analysis stages during the hold.
  useEffect(() => {
    let idx = 0;
    let inAnalysis = false;

    const tick = setInterval(() => {
      if (finishedRef.current) return;

      if (syncDoneRef.current && !inAnalysis) {
        inAnalysis = true;
        idx = 0;
      }

      const list = inAnalysis ? ANALYSIS_STAGES : SYNC_STAGES;
      setStatusText(list[Math.min(idx, list.length - 1)]);
      if (idx < list.length - 1) idx += 1;
    }, 2000);

    return () => clearInterval(tick);
  }, []);

  return (
    <WarRoomLoader
      progress={displayProgress}
      status={statusText}
      ready={ready}
      mega={mega}
    />
  );
}
