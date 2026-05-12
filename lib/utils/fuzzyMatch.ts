/**
 * Fuzzy name matching utilities for ESPN → Sleeper player bridging.
 *
 * fuzzyMatch(name1, name2)        — similarity score 0–1
 * findPlayerMatch(search, list)   — best match above 0.85 threshold
 * buildNameIndex(players)         — O(1) lookup map after initial build
 */

// ─── Normalize ────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── fuzzyMatch ───────────────────────────────────────────────────────────────
// Character-bigram Dice coefficient — fast, handles nicknames well.

function bigrams(s: string): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    set.add(s.slice(i, i + 2));
  }
  return set;
}

export function fuzzyMatch(name1: string, name2: string): number {
  const a = normalize(name1);
  const b = normalize(name2);

  if (a === b) return 1.0;
  if (a.length < 2 || b.length < 2) return 0;

  const bigramsA = bigrams(a);
  const bigramsB = bigrams(b);

  let intersection = 0;
  Array.from(bigramsA).forEach(bg => {
    if (bigramsB.has(bg)) intersection++;
  });

  return (2 * intersection) / (bigramsA.size + bigramsB.size);
}

// ─── findPlayerMatch ──────────────────────────────────────────────────────────

export interface NamedPlayer {
  id: string;
  name: string;
  [key: string]: unknown;
}

export function findPlayerMatch(
  searchName: string,
  playerList: NamedPlayer[],
  threshold = 0.85,
): NamedPlayer | null {
  let bestMatch: NamedPlayer | null = null;
  let bestScore = 0;

  for (const player of playerList) {
    const score = fuzzyMatch(searchName, player.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = player;
    }
    if (bestScore === 1.0) break;
  }

  return bestScore >= threshold ? bestMatch : null;
}

// ─── buildNameIndex ───────────────────────────────────────────────────────────

export interface NameIndex {
  lookup: (name: string) => NamedPlayer | null;
  fuzzySearch: (name: string, threshold?: number) => NamedPlayer | null;
}

export function buildNameIndex(players: NamedPlayer[]): NameIndex {
  // Exact normalized map for O(1) lookups
  const exactMap = new Map<string, NamedPlayer>();
  for (const player of players) {
    exactMap.set(normalize(player.name), player);
  }

  return {
    lookup(name: string): NamedPlayer | null {
      return exactMap.get(normalize(name)) ?? null;
    },
    fuzzySearch(name: string, threshold = 0.85): NamedPlayer | null {
      // Try exact first
      const exact = exactMap.get(normalize(name));
      if (exact) return exact;
      // Fall back to fuzzy scan
      return findPlayerMatch(name, players, threshold);
    },
  };
}
