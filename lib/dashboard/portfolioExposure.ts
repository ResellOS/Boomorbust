import { formatMarketVerdictLabel } from '@/lib/ui/labels';
import type { RotationPlayer, TradeTargetItem } from './rotation';

export interface ExposedPlayerRow {
  playerId: string;
  playerName: string;
  position: string;
  leagueCount: number;
  totalLeagues: number;
  exposurePct: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  riskReason: string;
  verdictLabel: string;
  verdictColor: string;
}

export interface NoExposureRow {
  playerId: string;
  playerName: string;
  bobRating: number;
  verdictLabel: string;
}

export function computePortfolioExposure(
  rosterByLeague: Map<string, string[]>,
  players: RotationPlayer[],
  tradeTargets: TradeTargetItem[],
): { mostExposed: ExposedPlayerRow[]; noExposure: NoExposureRow[] } {
  const leagueCounts = new Map<string, number>();
  for (const ids of Array.from(rosterByLeague.values())) {
    for (const pid of ids) {
      leagueCounts.set(pid, (leagueCounts.get(pid) ?? 0) + 1);
    }
  }

  const playerMap = new Map(players.map((p) => [p.playerId, p]));

  const totalLeagues = rosterByLeague.size;

  const mostExposed = Array.from(leagueCounts.entries())
    .filter(([, c]) => c >= 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pid, leagueCount]) => {
      const p = playerMap.get(pid);
      const verdict = p?.marketVerdict?.verdict ?? 'HOLD';
      const exposurePct = totalLeagues > 0 ? Math.round((leagueCount / totalLeagues) * 100) : 0;
      let riskLevel: ExposedPlayerRow['riskLevel'] = 'Low';
      if (exposurePct >= 40 || leagueCount >= 8) riskLevel = 'High';
      else if (exposurePct >= 25 || leagueCount >= 5) riskLevel = 'Medium';

      return {
        playerId: pid,
        playerName: p?.name ?? 'Player',
        position: p?.position ?? '—',
        leagueCount,
        totalLeagues,
        exposurePct,
        riskLevel,
        riskReason:
          exposurePct > 0
            ? `${exposurePct}% portfolio exposure`
            : `${leagueCount} leagues`,
        verdictLabel: formatMarketVerdictLabel(verdict),
        verdictColor: p?.marketVerdict?.color ?? '#64748B',
      };
    })
    .filter((row) => row.riskLevel !== 'Low' || row.leagueCount >= 5);

  const owned = new Set(players.map((p) => p.playerId));
  const noExposure: NoExposureRow[] = [];

  for (const t of tradeTargets) {
    if (owned.has(t.playerId)) continue;
    noExposure.push({
      playerId: t.playerId,
      playerName: t.playerName,
      bobRating: t.tfoScore,
      verdictLabel: 'Buy Now',
    });
  }

  for (const p of players) {
    if (noExposure.length >= 5) break;
    const v = p.marketVerdict?.verdict;
    if ((v === 'BOOM' || v === 'BUY') && p.valueSignal?.direction60d === 'up') {
      if (!noExposure.some((r) => r.playerId === p.playerId)) {
        noExposure.push({
          playerId: p.playerId,
          playerName: p.name,
          bobRating: p.tfoScore,
          verdictLabel: formatMarketVerdictLabel(v),
        });
      }
    }
  }

  return { mostExposed, noExposure: noExposure.slice(0, 5) };
}
