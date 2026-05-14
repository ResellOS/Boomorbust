import type { TradeHistoryItem } from '@/app/api/dashboard/trade-hub/route';
import type { TradeHistoryRowDto, TradeHistoryVerdict } from '@/components/trade-hub/types';
import { timeAgo } from '@/components/trade-hub/types';

function verdictFromTre(v: TradeHistoryItem['tre_verdict']): TradeHistoryVerdict {
  if (v === 'WIN') return 'SMASH';
  if (v === 'LOSS') return 'MISS';
  return 'FAIR';
}

export function mapTradeHistoryItem(t: TradeHistoryItem): TradeHistoryRowDto {
  const firstGive = t.gave.find((a) => a.position !== 'PICK') ?? t.gave[0];
  const firstRecv = t.received.find((a) => a.position !== 'PICK') ?? t.received[0];
  const giveTotal = t.gave.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
  const recvTotal = t.received.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
  const delta = recvTotal - giveTotal;
  const scaled = Math.round((delta / 100) * 10) / 10;
  const scoreDisplay = scaled >= 0 ? `+${scaled.toFixed(1)}` : scaled.toFixed(1);

  const receivedDisplay = t.received.map((r) => r.name).join(' + ') || '—';

  return {
    id: t.id,
    timeLabel: timeAgo(t.created_at),
    givenPlayerId: firstGive?.player_id?.startsWith('pick_') ? '' : (firstGive?.player_id ?? ''),
    givenName: firstGive?.name ?? '—',
    receivedPlayerId: firstRecv?.player_id?.startsWith('pick_') ? null : (firstRecv?.player_id ?? null),
    receivedDisplay,
    verdict: verdictFromTre(t.tre_verdict),
    scoreDisplay,
  };
}
