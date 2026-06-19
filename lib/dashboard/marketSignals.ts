import type { RotationPlayer, SignalCounts } from './rotation';

export function emptySignalCounts(): SignalCounts {
  return { boom: 0, hold: 0, bust: 0, total: 0 };
}

/** Count market verdict buckets for dynasty-scored roster players only. */
export function tallyMarketSignals(players: RotationPlayer[]): SignalCounts {
  const s = emptySignalCounts();
  for (const p of players) {
    if (p.tfoScore <= 0) continue;
    const mv = p.marketVerdict;
    if (!mv || mv.noMarketData || mv.rankDelta == null) continue;
    s.total += 1;
    if (mv.verdict === 'BOOM' || mv.verdict === 'BUY') s.boom += 1;
    else if (mv.verdict === 'HOLD') s.hold += 1;
    else if (mv.verdict === 'SELL' || mv.verdict === 'BUST') s.bust += 1;
  }
  return s;
}
