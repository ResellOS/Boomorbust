'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  generateBolt,
  generatePowerStrikeBolt,
  renderBolt,
  type BoltSegment,
} from '@/lib/lightning';

const BOOM = '#36E7A1';
const BUST = '#A78BFA';
const WHITE = '#ffffff';

interface ActiveStrike {
  segments: BoltSegment[];
  echo: BoltSegment[];
  bornAt: number;
}

interface AmbientStrike {
  segments: BoltSegment[];
  color: string;
  bornAt: number;
  /** total life in ms — ambient bolts are short flickers */
  life: number;
}

export interface LogoStrikeCanvasHandle {
  /** Fire the activation strike from top-center into the logo bolt. */
  fireStrike: (targetX: number, targetY: number) => void;
}

interface LogoStrikeCanvasProps {
  className?: string;
}

/**
 * Canvas that draws the final center power strike PLUS ambient lightning
 * that crackles around the logo (BOOM green + BUST purple) while loading.
 */
const LogoStrikeCanvas = forwardRef<LogoStrikeCanvasHandle, LogoStrikeCanvasProps>(
  function LogoStrikeCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strikesRef = useRef<ActiveStrike[]>([]);
    const ambientRef = useRef<AmbientStrike[]>([]);
    const rafRef = useRef(0);
    const ambientTimerRef = useRef(0);

    const fireStrike = useCallback((targetX: number, targetY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = canvas.clientWidth;
      const originX = w / 2;
      const originY = -8;

      const main = generatePowerStrikeBolt(originX, originY, targetX, targetY, 10);
      const echo = generatePowerStrikeBolt(originX + 2, originY, targetX + 1, targetY, 9);

      strikesRef.current.push({
        segments: main,
        echo,
        bornAt: performance.now(),
      });
    }, []);

    useImperativeHandle(ref, () => ({ fireStrike }), [fireStrike]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let w = 0;
      let h = 0;

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        w = window.innerWidth;
        h = window.innerHeight;
        canvas.width = Math.max(1, Math.round(w * dpr));
        canvas.height = Math.max(1, Math.round(h * dpr));
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };

      resize();
      window.addEventListener('resize', resize);

      // Ambient lightning — short branchy flickers around the logo band.
      // Logo sits centered, vertically around 42% of the viewport.
      const spawnAmbient = () => {
        const spread = Math.min(300, w * 0.34);
        const targetX = w / 2 + (Math.random() * 2 - 1) * spread;
        const targetY = h * (0.30 + Math.random() * 0.22);
        const originX = targetX + (Math.random() * 2 - 1) * spread * 0.5;
        const originY = -10;
        const color = Math.random() < 0.5 ? BOOM : BUST;
        const segments = generateBolt(originX, originY, targetX, targetY, 7);
        ambientRef.current.push({
          segments,
          color,
          bornAt: performance.now(),
          life: 360 + Math.random() * 180,
        });
        // Keep the ambient pool small.
        if (ambientRef.current.length > 6) ambientRef.current.shift();
        ambientTimerRef.current = window.setTimeout(
          spawnAmbient,
          240 + Math.random() * 520,
        );
      };
      ambientTimerRef.current = window.setTimeout(spawnAmbient, 200);

      const frame = () => {
        ctx.clearRect(0, 0, w, h);
        const now = performance.now();

        // Ambient flickers — draw-in fast, then fade.
        const ambientAlive: AmbientStrike[] = [];
        for (const a of ambientRef.current) {
          const t = now - a.bornAt;
          if (t >= a.life) continue;
          const drawIn = 70;
          const reveal = t < drawIn ? t / drawIn : 1;
          // ease-out fade across the remaining life, capped so bolts stay subtle
          const fade = 1 - t / a.life;
          const alpha = Math.max(0, fade) * 0.6;
          if (alpha > 0.01) {
            renderBolt(ctx, a.segments, a.color, alpha, reveal);
            renderBolt(ctx, a.segments, WHITE, alpha * 0.4, reveal);
          }
          ambientAlive.push(a);
        }
        ambientRef.current = ambientAlive;

        const alive: ActiveStrike[] = [];

        for (const strike of strikesRef.current) {
          const t = now - strike.bornAt;
          const drawInMs = 90;
          const holdMs = 280;
          const fadeMs = 420;

          let alpha = 1;
          let reveal = 1;

          if (t < drawInMs) {
            reveal = t / drawInMs;
          } else if (t > drawInMs + holdMs) {
            alpha = 1 - (t - drawInMs - holdMs) / fadeMs;
          }

          if (alpha > 0) {
            renderBolt(ctx, strike.segments, BOOM, alpha, reveal);
            renderBolt(ctx, strike.segments, WHITE, alpha * 0.55, reveal);
            renderBolt(ctx, strike.echo, BOOM, alpha * 0.35, reveal);
            alive.push(strike);
          }
        }

        strikesRef.current = alive;
        rafRef.current = requestAnimationFrame(frame);
      };

      rafRef.current = requestAnimationFrame(frame);

      return () => {
        cancelAnimationFrame(rafRef.current);
        window.clearTimeout(ambientTimerRef.current);
        window.removeEventListener('resize', resize);
        strikesRef.current = [];
        ambientRef.current = [];
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        className={className ?? 'pointer-events-none absolute inset-0 z-[15]'}
        aria-hidden
      />
    );
  },
);

export default LogoStrikeCanvas;
