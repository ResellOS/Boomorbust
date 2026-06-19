/** Count how many leagues roster each player across league id → player id lists. */
export function computeLeagueCounts(rosterByLeague: Map<string, string[]>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const ids of Array.from(rosterByLeague.values())) {
    for (const pid of ids) {
      counts.set(pid, (counts.get(pid) ?? 0) + 1);
    }
  }
  return counts;
}
