import type { BobSuggestion } from './types';

/** One suggestion per player — keeps the row with the largest |rank_delta|. */
export function dedupeSuggestionsByPlayer(suggestions: BobSuggestion[]): BobSuggestion[] {
  const byPlayer = new Map<string, BobSuggestion>();

  for (const s of suggestions) {
    const pid = String(s.playerId);
    const delta = Math.abs(s.rankDelta ?? s.edgeScore * 10);
    const existing = byPlayer.get(pid);
    const existingDelta = existing
      ? Math.abs(existing.rankDelta ?? existing.edgeScore * 10)
      : -1;
    if (!existing || delta > existingDelta) {
      byPlayer.set(pid, s);
    }
  }

  return Array.from(byPlayer.values()).sort(
    (a, b) => Math.abs(b.rankDelta ?? b.edgeScore * 10) - Math.abs(a.rankDelta ?? a.edgeScore * 10),
  );
}
