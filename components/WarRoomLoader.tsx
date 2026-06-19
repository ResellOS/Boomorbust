'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import LoaderLogo from '@/components/LoaderLogo';
import LogoStrikeCanvas, { type LogoStrikeCanvasHandle } from '@/components/LogoStrikeCanvas';
import { LOADER_TIMELINE } from '@/lib/loader/timeline';

const LOADER_CSS = `
@keyframes wr-msg-in {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes wr-msg-out {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes wr-storm-drift-a {
  0% { transform: translateX(-4%) translateY(0); opacity: 0.04; }
  50% { opacity: 0.06; }
  100% { transform: translateX(4%) translateY(-1%); opacity: 0.04; }
}
@keyframes wr-storm-drift-b {
  0% { transform: translateX(3%) translateY(1%); opacity: 0.03; }
  50% { opacity: 0.05; }
  100% { transform: translateX(-3%) translateY(0); opacity: 0.03; }
}
@keyframes wr-flash {
  0% { opacity: 0; }
  20% { opacity: 0.16; }
  100% { opacity: 0; }
}
.wr-msg-in { animation: wr-msg-in 350ms ease-out forwards; }
.wr-msg-out { animation: wr-msg-out 350ms ease-out forwards; }
.wr-storm-a { animation: wr-storm-drift-a 18s ease-in-out infinite; }
.wr-storm-b { animation: wr-storm-drift-b 24s ease-in-out infinite reverse; }
.wr-flash { animation: wr-flash 100ms ease-out forwards; }
`;

const LOADING_MESSAGES = [
  'Syncing Sleeper Leagues...',
  'Scanning Trade Market...',
  'Finding Mispriced Assets...',
  'Calculating Dynasty Ratings...',
  'Building Front Office Briefing...',
  'Preparing War Room...',
];

const SYSTEM_STATS = '22 Leagues Connected · 173 Players Indexed · Engine Optimal';
const WAR_ROOM_TEXT = 'ENTERING THE WAR ROOM';
const WAR_ROOM_HOLD_MS = 500;

/** Center of the lightning bolt within the logo asset (normalized). */
const BOLT_ANCHOR_X = 0.5;
const BOLT_ANCHOR_Y = 0.405;

export interface LightningDebugInfo {
  progress: number | null;
  status: string;
  canvasWidth: number;
  canvasHeight: number;
  strikeCount: number;
}

export interface WarRoomLoaderProps {
  progress?: number | null;
  status?: string;
  ready?: boolean;
  mega?: boolean;
  showWarRoomText?: boolean;
  onStrikeComplete?: () => void;
  onDebugUpdate?: (info: LightningDebugInfo) => void;
  forceMegaRef?: MutableRefObject<(() => void) | null>;
}

type StrikePhase = 'idle' | 'charging' | 'strike' | 'flash' | 'activated';

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}

export default function WarRoomLoader({
  progress = null,
  status,
  ready = false,
  mega = false,
  showWarRoomText: showWarRoomTextProp = false,
  onStrikeComplete,
  onDebugUpdate,
  forceMegaRef,
}: WarRoomLoaderProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [msgIndex, setMsgIndex] = useState(0);
  const [msgVisible, setMsgVisible] = useState(false);
  const [strikePhase, setStrikePhase] = useState<StrikePhase>('idle');
  const [warRoomVisible, setWarRoomVisible] = useState(false);

  const logoRef = useRef<HTMLDivElement>(null);
  const strikeCanvasRef = useRef<LogoStrikeCanvasHandle>(null);
  const strikeStarted = useRef(false);
  const strikeCompleteCalled = useRef(false);
  const strikeCountRef = useRef(0);
  const msgStarted = useRef(false);

  const pct = progress == null ? 8 : Math.max(0, Math.min(100, progress));

  const getBoltTarget = useCallback(() => {
    const el = logoRef.current;
    if (!el) {
      return { x: window.innerWidth / 2, y: window.innerHeight * 0.42 };
    }
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width * BOLT_ANCHOR_X,
      y: r.top + r.height * BOLT_ANCHOR_Y,
    };
  }, []);

  const fireCenterStrike = useCallback(() => {
    if (reducedMotion) return;
    const target = getBoltTarget();
    strikeCanvasRef.current?.fireStrike(target.x, target.y);
    strikeCountRef.current += 1;
  }, [getBoltTarget, reducedMotion]);

  const completeSequence = useCallback(() => {
    if (strikeCompleteCalled.current) return;
    strikeCompleteCalled.current = true;
    onStrikeComplete?.();
  }, [onStrikeComplete]);

  const runStrikeSequence = useCallback(() => {
    if (strikeStarted.current) return;
    strikeStarted.current = true;

    if (reducedMotion) {
      setWarRoomVisible(true);
      setStrikePhase('activated');
      window.setTimeout(completeSequence, 600);
      return;
    }

    setStrikePhase('charging');

    const t0 = window.setTimeout(() => {
      setStrikePhase('strike');
      fireCenterStrike();
    }, 120);

    const t1 = window.setTimeout(() => setStrikePhase('flash'), 200);
    const t2 = window.setTimeout(() => {
      setStrikePhase('activated');
      setWarRoomVisible(true);
    }, 280);

    const t3 = window.setTimeout(completeSequence, 280 + WAR_ROOM_HOLD_MS);

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [reducedMotion, fireCenterStrike, completeSequence]);

  useEffect(() => {
    if (forceMegaRef) {
      forceMegaRef.current = () => {
        runStrikeSequence();
      };
    }
    return () => {
      if (forceMegaRef) forceMegaRef.current = null;
    };
  }, [forceMegaRef, runStrikeSequence]);

  useEffect(() => {
    onDebugUpdate?.({
      progress: progress == null ? null : pct,
      status: status ?? LOADING_MESSAGES[msgIndex] ?? '',
      canvasWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      canvasHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
      strikeCount: strikeCountRef.current,
    });
  }, [progress, pct, status, msgIndex, onDebugUpdate]);

  // Begin rotating status text at 300ms
  useEffect(() => {
    if (status != null || msgStarted.current) return undefined;
    const startTimer = window.setTimeout(() => {
      msgStarted.current = true;
      setMsgVisible(true);
    }, LOADER_TIMELINE.TEXT_START_MS);
    return () => window.clearTimeout(startTimer);
  }, [status]);

  // Rotate loading messages every 800ms
  useEffect(() => {
    if (strikePhase !== 'idle' || status != null || !msgStarted.current) return undefined;
    const timer = window.setInterval(() => {
      setMsgVisible(false);
      window.setTimeout(() => {
        setMsgIndex((i) => (i + 1) % LOADING_MESSAGES.length);
        setMsgVisible(true);
      }, 300);
    }, 800);
    return () => window.clearInterval(timer);
  }, [strikePhase, status]);

  // Show war room text from parent timeline or after strike
  useEffect(() => {
    if (showWarRoomTextProp) setWarRoomVisible(true);
  }, [showWarRoomTextProp]);

  // Final strike — deterministic, only when ready
  useEffect(() => {
    const shouldStrike = (ready || mega) && !strikeStarted.current;
    if (!shouldStrike) return undefined;
    return runStrikeSequence();
  }, [ready, mega, runStrikeSequence]);

  const displayStatus = status ?? LOADING_MESSAGES[msgIndex] ?? LOADING_MESSAGES[0]!;

  return (
    <div className="fixed inset-0 z-[9990] flex flex-col items-center justify-center overflow-hidden bg-[#0a0d14]">
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      {/* Storm clouds + radial glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'min(520px, 90vw)',
            height: 'min(520px, 90vw)',
            background:
              'radial-gradient(circle, rgba(54,231,161,0.04) 0%, rgba(124,58,237,0.03) 35%, transparent 65%)',
          }}
        />
        <div
          className="wr-storm-a absolute -left-[10%] top-[8%] h-[45%] w-[120%] rounded-[50%]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(30,40,70,0.85) 0%, transparent 68%)',
            filter: 'blur(48px)',
          }}
        />
        <div
          className="wr-storm-b absolute -right-[8%] top-[18%] h-[38%] w-[95%] rounded-[50%]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(40,30,65,0.8) 0%, transparent 70%)',
            filter: 'blur(56px)',
          }}
        />
      </div>

      {!reducedMotion && <LogoStrikeCanvas ref={strikeCanvasRef} />}

      {strikePhase === 'flash' && (
        <div
          className="wr-flash pointer-events-none absolute inset-0 z-[16]"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(34,211,238,0.12) 100%)',
          }}
          aria-hidden
        />
      )}

      <div className="relative z-20 flex flex-col items-center bg-transparent px-4">
        <LoaderLogo
          ref={logoRef}
          progress={pct}
          strikePhase={strikePhase}
          reducedMotion={reducedMotion}
        />

        <div className="mt-8 flex min-h-[72px] flex-col items-center gap-2">
          {warRoomVisible ? (
            <p
              className="font-mono text-[11px] uppercase text-[#36E7A1] sm:text-[12px]"
              style={{ letterSpacing: '0.28em' }}
              aria-live="polite"
            >
              {WAR_ROOM_TEXT}
            </p>
          ) : strikePhase === 'activated' ? null : (
            <>
              {msgVisible && (
                <p
                  className={`font-mono text-[10px] uppercase text-[#6b7a99] sm:text-[11px] ${msgVisible ? 'wr-msg-in' : 'wr-msg-out'}`}
                  style={{ letterSpacing: '0.22em' }}
                >
                  {displayStatus}
                </p>
              )}

              {msgVisible && pct >= 8 && (
                <p
                  className="font-mono text-[8px] uppercase text-[#6b7a99]/55 sm:text-[9px]"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {SYSTEM_STATS}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
