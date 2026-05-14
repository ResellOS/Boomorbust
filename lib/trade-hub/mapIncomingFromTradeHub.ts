import type { TradeHubOffer } from '@/app/api/dashboard/trade-hub/route';
import type { IncomingOfferApi, IncomingReceiveItem } from '@/components/trade-hub/types';
import { isNewOffer, leagueColor, timeAgo } from '@/components/trade-hub/types';

function assetToIncomingReceive(a: TradeHubOffer['give'][number]): IncomingReceiveItem {
  if (a.position === 'PICK') {
    return { kind: 'pick', label: a.name };
  }
  return {
    kind: 'player',
    name: a.name ?? 'Unknown',
    position: a.position,
    team: a.team || 'FA',
    playerId: a.player_id.startsWith('pick_') ? null : a.player_id,
  };
}

function formatTreEdge(give: TradeHubOffer['give'], receive: TradeHubOffer['receive']): string {
  const giveTotal = give.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
  const receiveTotal = receive.reduce((s, a) => s + (a.bvi_score ?? a.ktc_value ?? 0), 0);
  const delta = receiveTotal - giveTotal;
  const scaled = Math.round((delta / 100) * 10) / 10;
  const s = scaled.toFixed(1);
  return scaled >= 0 ? `+${s}` : s;
}

export function mapTradeHubOfferToIncoming(offer: TradeHubOffer, leagueColorIndex: number): IncomingOfferApi {
  const letter = (offer.league_name?.trim()[0] ?? '?').toUpperCase();
  const opp = offer.opponent_name?.trim() || 'Opponent';
  const handle = offer.opponent_name ? `@${offer.opponent_name.replace(/\s+/g, '')}` : '@manager';

  return {
    id: offer.id,
    leagueId: offer.league_id,
    createdAt: offer.created_at,
    leagueLetter: letter,
    leagueIconBg: leagueColor(leagueColorIndex),
    leagueName: offer.league_name,
    timeAgo: timeAgo(offer.created_at),
    isNew: isNewOffer(offer.created_at),
    proposerTeam: `Team ${opp}`,
    proposerHandle: handle,
    proposerReceives: offer.give.map(assetToIncomingReceive),
    recipientTeam: 'Your roster',
    recipientHandle: '@you',
    recipientReceives: offer.receive.map(assetToIncomingReceive),
    treEdge: formatTreEdge(offer.give, offer.receive),
  };
}
