import type { ProactiveTradeItem } from '@/app/api/dashboard/trade-hub/route';
import type { TreSuggestionRowDto } from '@/components/trade-hub/types';

export function mapProactiveToSuggestion(item: ProactiveTradeItem, index: number): TreSuggestionRowDto {
  const tp = item.target_player;
  const base = 14 + index * 6 + ((tp?.ktc_value ?? 0) % 17);
  const edge = Math.min(48, base);
  const headline =
    item.reasoning?.trim() ||
    (item.gap_filled ? `Fill ${item.gap_filled}` : `Proactive move — ${item.target_player_name}`);

  return {
    id: item.id,
    playerId: tp?.player_id ?? '',
    playerDisplayName: item.target_player_name,
    headline,
    targetName: item.league_name || 'League',
    treEdge: `+${edge.toFixed(1)}`,
  };
}
