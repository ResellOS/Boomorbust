// Player watchlist store.
//
// Source of truth is localStorage (works instantly, offline, per-device). Each
// mutation also fires a best-effort sync to /api/watchlist so that once the
// player_watchlist table exists the list persists cross-device. The API failing
// (e.g. table not yet migrated) never breaks the local experience.

export interface WatchEntry {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  ktcAtAdd: number | null;
  tfoAtAdd: number | null;
  addedAt: string;
}

const KEY = 'bb_watchlist_v2';

export function getWatchlist(): WatchEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as WatchEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(list: WatchEntry[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota / private mode */
  }
}

export function isWatched(playerId: string): boolean {
  return getWatchlist().some((e) => e.playerId === playerId);
}

export function addToWatchlist(entry: WatchEntry): WatchEntry[] {
  const list = getWatchlist();
  if (list.some((e) => e.playerId === entry.playerId)) return list;
  const next = [entry, ...list];
  write(next);
  void fetch('/api/watchlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {});
  return next;
}

export function removeFromWatchlist(playerId: string): WatchEntry[] {
  const next = getWatchlist().filter((e) => e.playerId !== playerId);
  write(next);
  void fetch(`/api/watchlist?player_id=${encodeURIComponent(playerId)}`, {
    method: 'DELETE',
  }).catch(() => {});
  return next;
}

/**
 * Merge server-persisted watchlist rows (from player_watchlist) into the local
 * list, so the watchlist shows up cross-device. Local entries win on conflict;
 * server-only entries are added. The merged list is written back to localStorage.
 */
export function mergeIntoWatchlist(serverEntries: WatchEntry[]): WatchEntry[] {
  const byId = new Map<string, WatchEntry>();
  for (const e of getWatchlist()) byId.set(e.playerId, e);
  for (const s of serverEntries) if (!byId.has(s.playerId)) byId.set(s.playerId, s);
  const merged = Array.from(byId.values());
  write(merged);
  return merged;
}
