import type { LeagueBundle, RotationPlayer } from './rotation';

export type AssetActionKey = 'TARGET' | 'HARD BUY' | 'OWNED' | 'UNKNOWN';

export interface AssetActionability {
  key: AssetActionKey;
  dotColor: string;
  hint: string;
}

export function computeAssetActionability(
  player: RotationPlayer,
  opts: {
    isAll: boolean;
    currentLeague: LeagueBundle | null;
    ownedInLeagueIds: Set<string>;
    tradeTargetIds: Set<string>;
  },
): AssetActionability {
  const { isAll, currentLeague, ownedInLeagueIds, tradeTargetIds } = opts;
  const ownedHere = currentLeague
    ? currentLeague.players.some((p) => p.playerId === player.playerId)
    : false;
  const ownedAnywhere = ownedInLeagueIds.has(player.playerId);
  const isTarget = tradeTargetIds.has(player.playerId);
  const verdict = player.marketVerdict?.verdict;
  const isSell = verdict === 'SELL' || verdict === 'BUST';

  if (ownedHere || (isSell && ownedAnywhere)) {
    return {
      key: 'OWNED',
      dotColor: '#FBBF24',
      hint: isSell ? 'On your roster — sell window' : 'You own him here',
    };
  }

  if (isTarget) {
    const leagueStatus = currentLeague?.status ?? 'TRANSITION';
    const hint =
      leagueStatus === 'REBUILD' || leagueStatus === 'ORPHAN'
        ? 'Rebuilder owns him'
        : 'Attainable via trade';
    return { key: 'TARGET', dotColor: '#36E7A1', hint };
  }

  if (verdict === 'BOOM' || verdict === 'BUY') {
    const hard =
      currentLeague?.status === 'CHAMPIONSHIP' || currentLeague?.status === 'CONTENDER';
    if (hard && !isAll) {
      return { key: 'HARD BUY', dotColor: '#EF4444', hint: 'Contender holds — hard to buy' };
    }
    if (!ownedAnywhere) {
      return { key: 'TARGET', dotColor: '#36E7A1', hint: 'Explore buy-low offer' };
    }
  }

  return { key: 'UNKNOWN', dotColor: '#6b7a99', hint: 'Availability unclear' };
}
