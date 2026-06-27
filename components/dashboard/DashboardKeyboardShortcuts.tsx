'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface DashboardKeyboardShortcutsProps {
  onGlobalView: () => void;
  onLeagueView: () => void;
}

/** Power-user shortcuts: G global, L league, / search, ESC close overlays. */
export default function DashboardKeyboardShortcuts({
  onGlobalView,
  onLeagueView,
}: DashboardKeyboardShortcutsProps) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement | null)?.isContentEditable) return;

      if (e.key === 'Escape') {
        window.dispatchEvent(new CustomEvent('dashboard:escape'));
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        onGlobalView();
        return;
      }
      if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        onLeagueView();
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        router.push('/players');
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onGlobalView, onLeagueView, router]);

  return null;
}
