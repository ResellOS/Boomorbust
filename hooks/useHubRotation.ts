'use client';

import { useEffect, useState } from 'react';

/**
 * Cycles through `length` items every `intervalMs` milliseconds and returns
 * the current index. Pauses automatically if the page is hidden so we don't
 * waste cycles when tabs are backgrounded.
 */
export function useHubRotation(length: number, intervalMs = 8000): number {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (length <= 1) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      stop();
      timer = setInterval(() => {
        setIndex((i) => (i + 1) % length);
      }, intervalMs);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) stop();
      else start();
    };

    start();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  }, [length, intervalMs]);

  // Reset if the pool shrinks below the current index
  useEffect(() => {
    if (index >= length && length > 0) setIndex(0);
  }, [index, length]);

  return Math.min(index, Math.max(0, length - 1));
}
