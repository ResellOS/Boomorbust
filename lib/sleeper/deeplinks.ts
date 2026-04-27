export function sleeperLeagueUrl(leagueId: string): string {
  return `https://sleeper.com/leagues/${leagueId}`;
}

export function sleeperRosterUrl(leagueId: string): string {
  return `https://sleeper.com/leagues/${leagueId}/roster`;
}

export function sleeperTransactionsUrl(leagueId: string): string {
  return `https://sleeper.com/leagues/${leagueId}/transactions`;
}
