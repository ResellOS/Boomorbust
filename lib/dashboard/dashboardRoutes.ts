/** Centralized dashboard navigation targets — every widget should route through here. */

export function playerHubHref(playerId: string): string {
  return `/players?highlight=${encodeURIComponent(playerId)}`;
}

export function tradeStageHref(playerId?: string, leagueId?: string): string {
  const params = new URLSearchParams();
  if (playerId) params.set('target', playerId);
  if (leagueId) params.set('league', leagueId);
  const qs = params.toString();
  return qs ? `/trade?${qs}` : '/trade';
}

export function tradeDetailHref(playerId?: string, leagueId?: string): string {
  const params = new URLSearchParams({ detail: '1' });
  if (playerId) params.set('target', playerId);
  if (leagueId) params.set('league', leagueId);
  return `/trade?${params.toString()}`;
}

export function exposureHref(playerId?: string): string {
  return playerId ? `/exposure?player=${encodeURIComponent(playerId)}` : '/exposure';
}

export function rosterAnalysisHref(leagueId?: string): string {
  return leagueId ? `/leagues/${encodeURIComponent(leagueId)}` : '/players';
}

export function blueprintHref(leagueId?: string): string {
  return leagueId ? `/dashboard/blueprint?league=${encodeURIComponent(leagueId)}` : '/dashboard/blueprint';
}

export function leagueIntelHref(leagueId?: string): string {
  return leagueId ? `/leagues/${encodeURIComponent(leagueId)}` : '/leagues';
}
