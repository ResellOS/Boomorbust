/** Parse Sleeper league IDs from onboarding/settings textarea (lines or commas). */
export function parseLeagueIds(text: string): string[] {
  return text.split(/[\s,\n]+/).map((s) => s.trim()).filter(Boolean);
}

/** Append a league ID if not already present (newline-separated). */
export function appendLeagueIdToDraft(current: string, id: string): string {
  const ids = new Set(parseLeagueIds(current));
  if (ids.has(id)) return current;
  return current.trim() ? `${current.trim()}\n${id}` : id;
}
