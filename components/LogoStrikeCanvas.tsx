'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { generatePowerStrikeBolt, renderBolt, type BoltSegment } from '@/lib/lightning';

const BOOM = '#36E7A1';
const WHITE = '#ffffff';

interface ActiveStrike {
  segments: BoltSegment[];
  echo: BoltSegment[];
  bornAt: number;
}

export interface LogoStrikeCanvasHandle {
  /** Fire the activation strike from top-center into the logo bolt. */
  fireStrike: (targetX: number, targetY: number) => void;
}

interface LogoStrikeCanvasProps {
  className?: string;
}

/**
 * Canvas that draws ONLY the final center power strike — no ambient side lightning.
 */
const LogoStrikeCanvas = forwardRef<LogoStrikeCanvasHandle, LogoStrikeCanvasProps>(
  function LogoStrikeCanvas({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const strikesRef = useRef<ActiveStrike[]>([]);
    const rafRef = useRef(0);

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

      const frame = () => {
        ctx.clearRect(0, 0, w, h);
        const now = performance.now();
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
        window.removeEventListener('resize', resize);
        strikesRef.current = [];
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
