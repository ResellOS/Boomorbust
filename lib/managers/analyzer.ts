import type { SleeperTransaction } from '@/lib/sleeper';
import type { PlayerSummary } from '@/lib/sleeper/players';

const KEY_POSITIONS = ['QB', 'RB', 'WR', 'TE'];
const RISING_KTC_THRESHOLD = 3000;

export type ManagerArchetype = 'rebuilder' | 'contender' | 'wheeler_dealer' | 'hoarder' | 'balanced';
export type TradeTrend = 'active' | 'moderate' | 'inactive';

export interface PositionScore {
  count: number;
  avg_ktc: number;
  tier: 'strong' | 'average' | 'weak';
}

export interface ManagerProfileData {
  archetype: ManagerArchetype;
  archetype_label: string;
  archetype_desc: string;
  pitch_angle: string;
  trade_count: number;
  trade_frequency: TradeTrend;
  buys_position: Record<string, number>;
  sells_position: Record<string, number>;
  adds_picks: number;
  sells_picks: number;
  avg_buy_age: number | null;
  avg_sell_age: number | null;
  prefers_youth: boolean;
  needs: string[];
  surplus: string[];
  position_scores: Record<string, PositionScore>;
  top_assets: Array<{ name: string; position: string; ktc: number; age: number | null }>;
}

const ARCHETYPE_META: Record<ManagerArchetype, { label: string; desc: string; pitch_angle: string }> = {
  rebuilder: {
    label: 'The Rebuilder',
    desc: 'Consistently trades veterans for youth and picks. Plays the long game.',
    pitch_angle: 'Offer young players and picks — they\'re always buying future upside. They will take youth at a slight discount.',
  },
  contender: {
    label: 'The Contender',
    desc: 'Win window is open. Trades youth and picks for proven starters.',
    pitch_angle: 'They\'ll overpay for proven producers. Name your price on your veterans — they\'re buyers at fair value or above.',
  },
  wheeler_dealer: {
    label: 'The Wheeler Dealer',
    desc: 'High trade volume. Always in someone\'s inbox, always looking for an edge.',
    pitch_angle: 'Send anything — they\'ll engage. Start with a lowball, let them counter. They\'re more interested in making a deal than winning it.',
  },
  hoarder: {
    label: 'The Hoarder',
    desc: 'Barely trades. Values roster stability and rarely engages.',
    pitch_angle: 'Hard to move. Needs to clearly win the deal — lead with something obvious and overpay slightly. Don\'t expect a quick response.',
  },
  balanced: {
    label: 'The Balanced Manager',
    desc: 'Moderate trade activity, no clear directional bias.',
    pitch_angle: 'Lead with a fair, positional-need-based offer. Reference value tiers. They respond to logic over hype.',
  },
};

function deriveArchetype(
  tradeCount: number,
  avgBuyAge: number | null,
  avgSellAge: number | null,
  addsPicksRatio: number
): ManagerArchetype {
  if (tradeCount <= 2) return 'hoarder';
  if (tradeCount >= 10) return 'wheeler_dealer';

  const buyAge = avgBuyAge ?? 26;
  const sellAge = avgSellAge ?? 26;

  if (buyAge <= 24.5 && sellAge >= 27) return 'rebuilder';
  if (buyAge >= 27 && addsPicksRatio < 0.35) return 'contender';
  return 'balanced';
}

export function buildManagerProfile(
  rosterId: number,
  playerIds: string[],
  allTransactions: SleeperTransaction[],
  players: Record<string, PlayerSummary>,
  ktcMap: Record<string, number>
): ManagerProfileData {
  const myTrades = allTransactions.filter(
    (tx) => tx.type === 'trade' && tx.status === 'complete' && tx.roster_ids.includes(rosterId)
  );

  const buysPosition: Record<string, number> = {};
  const sellsPosition: Record<string, number> = {};
  const buyAges: number[] = [];
  const sellAges: number[] = [];
  let addsPicks = 0;
  let sellsPicks = 0;

  for (const tx of myTrades) {
    // Players I received
    if (tx.adds) {
      for (const [playerId, targetRosterId] of Object.entries(tx.adds)) {
        if (targetRosterId === rosterId) {
          const p = players[playerId];
          if (p && KEY_POSITIONS.includes(p.position)) {
            buysPosition[p.position] = (buysPosition[p.position] ?? 0) + 1;
            if (p.age != null) buyAges.push(p.age);
          }
        }
      }
    }
    // Players I sent away
    if (tx.drops) {
      for (const [playerId, sourceRosterId] of Object.entries(tx.drops)) {
        if (sourceRosterId === rosterId) {
          const p = players[playerId];
          if (p && KEY_POSITIONS.includes(p.position)) {
            sellsPosition[p.position] = (sellsPosition[p.position] ?? 0) + 1;
            if (p.age != null) sellAges.push(p.age);
          }
        }
      }
    }
    // Draft picks
    for (const pick of tx.draft_picks) {
      if (pick.owner_id === rosterId) addsPicks++;
      if (pick.previous_owner_id === rosterId) sellsPicks++;
    }
  }

  const avgBuyAge = buyAges.length ? buyAges.reduce((s, a) => s + a, 0) / buyAges.length : null;
  const avgSellAge = sellAges.length ? sellAges.reduce((s, a) => s + a, 0) / sellAges.length : null;
  const totalPickTx = addsPicks + sellsPicks;
  const addsPicksRatio = totalPickTx > 0 ? addsPicks / totalPickTx : 0.5;
  const prefers_youth = avgBuyAge !== null && avgBuyAge <= 24.5;
  const tradeCount = myTrades.length;
  const trade_frequency: TradeTrend =
    tradeCount >= 8 ? 'active' : tradeCount >= 3 ? 'moderate' : 'inactive';

  const archetype = deriveArchetype(tradeCount, avgBuyAge, avgSellAge, addsPicksRatio);
  const meta = ARCHETYPE_META[archetype];

  // Roster position analysis
  const byPosition: Record<string, Array<{ name: string; ktc: number; age: number | null }>> = {};
  for (const pos of KEY_POSITIONS) byPosition[pos] = [];

  for (const id of playerIds) {
    const p = players[id];
    if (!p || !KEY_POSITIONS.includes(p.position)) continue;
    const ktc = ktcMap[p.full_name.toLowerCase()] ?? 0;
    byPosition[p.position].push({ name: p.full_name, ktc, age: p.age });
  }

  const position_scores: Record<string, PositionScore> = {};
  const needs: string[] = [];
  const surplus: string[] = [];

  for (const pos of KEY_POSITIONS) {
    const arr = byPosition[pos].sort((a, b) => b.ktc - a.ktc);
    const top3 = arr.slice(0, 3);
    const avg_ktc = top3.length ? top3.reduce((s, x) => s + x.ktc, 0) / top3.length : 0;
    const risingCount = arr.filter((x) => x.ktc >= RISING_KTC_THRESHOLD).length;
    const tier: PositionScore['tier'] = avg_ktc >= 4000 ? 'strong' : avg_ktc >= 2000 ? 'average' : 'weak';

    position_scores[pos] = { count: arr.length, avg_ktc: Math.round(avg_ktc), tier };

    // "0-1 rising tier players = looking for this position"
    if (risingCount <= 1) needs.push(pos);
    if (risingCount >= 3) surplus.push(pos);
  }

  // Top 5 assets by KTC
  const top_assets = Object.entries(byPosition)
    .flatMap(([pos, arr]) => arr.map((x) => ({ ...x, position: pos })))
    .sort((a, b) => b.ktc - a.ktc)
    .slice(0, 5);

  return {
    archetype,
    archetype_label: meta.label,
    archetype_desc: meta.desc,
    pitch_angle: meta.pitch_angle,
    trade_count: tradeCount,
    trade_frequency,
    buys_position: buysPosition,
    sells_position: sellsPosition,
    adds_picks: addsPicks,
    sells_picks: sellsPicks,
    avg_buy_age: avgBuyAge !== null ? Math.round(avgBuyAge * 10) / 10 : null,
    avg_sell_age: avgSellAge !== null ? Math.round(avgSellAge * 10) / 10 : null,
    prefers_youth,
    needs,
    surplus,
    position_scores,
    top_assets,
  };
}
