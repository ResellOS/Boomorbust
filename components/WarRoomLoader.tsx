'use client';

import { useEffect, useRef, useState } from 'react';

const LOADER_CSS = `
@keyframes wr-bolt-strike {
  0% { stroke-dashoffset: 100; opacity: 1; stroke: #ffffff; }
  37% { stroke-dashoffset: 0; opacity: 1; stroke: #ffffff; }
  60% { stroke-dashoffset: 0; opacity: 0.85; stroke: #36E7A1; }
  100% { stroke-dashoffset: 0; opacity: 0; stroke: #36E7A1; }
}
@keyframes wr-branch-strike {
  0% { stroke-dashoffset: 100; opacity: 0.4; stroke: #ffffff; }
  50% { stroke-dashoffset: 0; opacity: 0.4; stroke: #ffffff; }
  100% { stroke-dashoffset: 0; opacity: 0; stroke: #36E7A1; }
}
@keyframes wr-flash {
  0% { opacity: 0; }
  40% { opacity: var(--flash-max, 0.15); }
  100% { opacity: 0; }
}
@keyframes wr-hud-pulse {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.2; }
}
@keyframes wr-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(260%); }
}
@keyframes wr-ready-in {
  0% { opacity: 0; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.wr-bolt { stroke-dasharray: 100; animation: wr-bolt-strike 800ms ease-out forwards; }
.wr-branch { stroke-dasharray: 100; animation: wr-branch-strike 500ms ease-out 100ms forwards; opacity: 0; }
.wr-flash { animation: wr-flash 140ms ease-out forwards; }
.wr-hud { animation: wr-hud-pulse 4s ease-in-out infinite; }
.wr-shimmer { animation: wr-shimmer 1.4s ease-in-out infinite; }
.wr-ready { animation: wr-ready-in 400ms ease-out forwards; }
`;

const MAIN_BOLT = 'M50 0 L44 24 L54 27 L42 52 L53 56 L40 82 L51 80 L45 100';
const BRANCHES = [
  'M44 24 L30 36 L36 38 L24 52',
  'M53 56 L66 64 L60 67 L72 80',
  'M42 52 L32 66 L38 68',
];

export interface WarRoomLoaderProps {
  /** 0–100. Omit or pass null for indeterminate shimmer mode. */
  progress?: number | null;
  status?: string;
  /** Show the large green READY. state. */
  ready?: boolean;
  /** Fire one big mega-strike (e.g. on completion). */
  mega?: boolean;
}

export default function WarRoomLoader({
  progress = null,
  status = 'LOADING THE WAR ROOM...',
  ready = false,
  mega = false,
}: WarRoomLoaderProps) {
  const [strikeKey, setStrikeKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [flashMax, setFlashMax] = useState(0.15);
  const prevStatus = useRef(status);
  const megaFired = useRef(false);

  // Natural repeating lightning strikes (2–3s apart).
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    const schedule = () => {
      timer = setTimeout(() => {
        if (cancelled) return;
        setFlashMax(0.15);
        setStrikeKey((k) => k + 1);
        setFlashKey((k) => k + 1);
        schedule();
      }, Math.random() * 1000 + 2000);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  // Small flash on status change (0.3 intensity of a normal flash).
  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      setFlashMax(0.05);
      setFlashKey((k) => k + 1);
    }
  }, [status]);

  // Mega strike on completion.
  useEffect(() => {
    if (mega && !megaFired.current) {
      megaFired.current = true;
      setFlashMax(0.35);
      setStrikeKey((k) => k + 1);
      setFlashKey((k) => k + 1);
    }
  }, [mega]);

  const pct = progress == null ? null : Math.max(0, Math.min(100, progress));

  return (
    <div
      className="fixed inset-0 z-[9990] flex flex-col items-center justify-center overflow-hidden bg-[#0a0d14]"
      style={{
        backgroundImage: "url('/backgrounds/loading-bg.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOADER_CSS }} />

      {/* Lightning flash overlay */}
      <div
        key={`flash-${flashKey}`}
        className="wr-flash pointer-events-none absolute inset-0 bg-white"
        style={{ '--flash-max': flashMax } as React.CSSProperties}
        aria-hidden
      />

      {/* Lightning bolt over the logo bolt (screen center) */}
      <svg
        key={`bolt-${strikeKey}`}
        viewBox="0 0 100 100"
        className="pointer-events-none absolute left-1/2 top-[16%] h-[55vh] w-auto -translate-x-1/2"
        style={{ filter: 'drop-shadow(0 0 10px rgba(54,231,161,0.7)) drop-shadow(0 0 24px rgba(167,139,250,0.4))' }}
        aria-hidden
      >
        <path className="wr-bolt" d={MAIN_BOLT} pathLength={100} fill="none" strokeWidth={mega ? 2.2 : 1.4} strokeLinejoin="round" />
        {BRANCHES.map((d, i) => (
          <path key={i} className="wr-branch" d={d} pathLength={100} fill="none" strokeWidth={0.8} strokeLinejoin="round" style={{ animationDelay: `${100 + i * 60}ms` }} />
        ))}
      </svg>

      {/* HUD edge lines */}
      <div className="wr-hud pointer-events-none absolute left-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col justify-between md:flex" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + (i % 2) * 26 }} />
        ))}
        <div className="absolute left-0 top-0 h-full w-px bg-boom" />
      </div>
      <div className="wr-hud pointer-events-none absolute right-5 top-1/2 hidden h-[40vh] -translate-y-1/2 flex-col items-end justify-between md:flex" style={{ animationDelay: '2s' }} aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-px bg-boom" style={{ width: 40 + ((i + 1) % 2) * 26 }} />
        ))}
        <div className="absolute right-0 top-0 h-full w-px bg-boom" />
      </div>

      {/* Progress + status — positioned in the lower third, below the baked-in logo */}
      <div className="absolute bottom-[14%] left-1/2 flex w-full -translate-x-1/2 flex-col items-center px-6">
        <div className="flex w-full max-w-[500px] items-center gap-3">
          <div
            className="relative h-[6px] flex-1 overflow-hidden rounded-[3px]"
            style={{ background: 'rgba(255,255,255,0.1)', boxShadow: '0 0 12px rgba(54,231,161,0.5)' }}
          >
            {pct == null ? (
              <div
                className="wr-shimmer absolute inset-y-0 w-[38%] rounded-[3px]"
                style={{ background: 'linear-gradient(90deg, transparent, #36E7A1, #A78BFA, transparent)' }}
              />
            ) : (
              <div
                className="h-full rounded-[3px] transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #36E7A1, #A78BFA)' }}
              />
            )}
          </div>
          {pct != null ? (
            <span className="w-[52px] shrink-0 text-right font-mono text-[14px] text-boom">
              {Math.round(pct)}%
            </span>
          ) : null}
        </div>

        {ready ? (
          <p className="wr-ready mt-5 font-figtree text-[22px] font-bold uppercase text-boom" style={{ letterSpacing: '6px', textShadow: '0 0 20px rgba(54,231,161,0.8)' }}>
            Ready.
          </p>
        ) : (
          <p className="mt-5 font-figtree text-[10px] uppercase text-[#6b7a99]" style={{ letterSpacing: '3px' }}>
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
