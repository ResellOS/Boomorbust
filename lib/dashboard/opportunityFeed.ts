import type { LineupOpportunity, RotationPlayer, TradeTargetItem } from './rotation';
import { formatMarketVerdictLabel } from '@/lib/ui/labels';

export type FeedCategory =
  | 'NEW EDGE'
  | 'BUY WINDOW'
  | 'LINEUP EDGE'
  | 'VALUE ALERT'
  | 'TRADE TREND'
  | 'SELL WINDOW';

export interface OpportunityFeedItem {
  id: string;
  minutesAgo: number;
  category: FeedCategory;
  headline: string;
  explanation: string;
  actionHint?: string;
  metricLabel?: string;
  metricValue?: string;
  secondaryLabel?: string;
  secondaryValue?: string;
  href?: string;
  color: string;
}

const CATEGORY_COLORS: Record<FeedCategory, string> = {
  'NEW EDGE': '#36E7A1',
  'BUY WINDOW': '#60a5fa',
  'LINEUP EDGE': '#FBBF24',
  'VALUE ALERT': '#A78BFA',
  'TRADE TREND': '#36E7A1',
  'SELL WINDOW': '#A78BFA',
};

const FEED_HEADLINE_MAX = 80;

export function truncateFeedHeadline(text: string, max = FEED_HEADLINE_MAX): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3).trimEnd()}...`;
}

function lineupItem(o: LineupOpportunity): OpportunityFeedItem {
  return {
    id: `lineup-${o.benchPlayerId}`,
    minutesAgo: 8,
    category: 'LINEUP EDGE',
    headline: truncateFeedHeadline(`LINEUP EDGE — ${o.benchName}`),
    explanation: truncateFeedHeadline(
      `Projected +${o.gap.toFixed(1)} over current ${o.position} in ${o.leagueName}`,
    ),
    metricLabel: 'Projection Edge',
    metricValue: `+${o.gap.toFixed(1)} pts`,
    actionHint: 'Action: Set lineup edge.',
    href: '/startsit',
    color: CATEGORY_COLORS['LINEUP EDGE'],
  };
}

function signalItem(p: RotationPlayer, idx: number): OpportunityFeedItem | null {
  const mv = p.marketVerdict;
  if (!mv || mv.noMarketData) return null;
  const v = mv.verdict;
  const delta = mv.rankDelta != null ? Math.abs(Math.round(mv.rankDelta)) : null;

  if (v === 'BOOM' || v === 'BUY') {
    const bob = mv.ktcRank != null && mv.rankDelta != null ? Math.round(mv.ktcRank - mv.rankDelta) : null;
    return {
      id: `buy-${p.playerId}-${idx}`,
      minutesAgo: 30 + idx * 45,
      category: 'BUY WINDOW',
      headline: truncateFeedHeadline(`BUY WINDOW OPEN — ${p.name}`),
      explanation: truncateFeedHeadline(
        delta != null ? 'Market cooling, BOB unchanged.' : `BOB ${formatMarketVerdictLabel(v)} signal active`,
      ),
      metricLabel: 'BOB Rank',
      metricValue: bob != null ? `#${bob}` : '—',
      secondaryLabel: 'Market Rank',
      secondaryValue: mv.ktcRank != null ? `#${mv.ktcRank}` : '—',
      actionHint: 'Action: Explore buy-low offer.',
      href: `/players?highlight=${p.playerId}`,
      color: CATEGORY_COLORS['BUY WINDOW'],
    };
  }
  if (v === 'SELL' || v === 'BUST') {
    const bob = mv.ktcRank != null && mv.rankDelta != null ? Math.round(mv.ktcRank - mv.rankDelta) : null;
    return {
      id: `sell-${p.playerId}-${idx}`,
      minutesAgo: 60 + idx * 30,
      category: 'SELL WINDOW',
      headline: truncateFeedHeadline(`SELL HIGH — ${p.name}`),
      explanation: truncateFeedHeadline('Age + usage decline. Peak value now.'),
      metricLabel: 'Rank Delta',
      metricValue: delta != null ? `+${delta}` : '—',
      secondaryLabel: 'BOB Rank',
      secondaryValue: bob != null ? `#${bob}` : '—',
      actionHint: 'Action: Review sell-high window.',
      href: `/trade?target=${p.playerId}`,
      color: CATEGORY_COLORS['SELL WINDOW'],
    };
  }
  return null;
}

function tradeTargetItem(t: TradeTargetItem, idx: number): OpportunityFeedItem {
  return {
    id: `edge-${t.playerId}`,
    minutesAgo: 15 + idx * 20,
    category: 'NEW EDGE',
    headline: truncateFeedHeadline(`${t.playerName} available via trade`),
    explanation: truncateFeedHeadline(t.leagueName),
    metricLabel: 'Suggested Cost',
    metricValue: t.acquireCost,
    secondaryLabel: 'BOB Rating',
    secondaryValue: t.tfoScore > 0 ? t.tfoScore.toFixed(0) : '—',
    actionHint: 'Action: Stage trade offer.',
    href: `/trade?target=${t.playerId}`,
    color: CATEGORY_COLORS['NEW EDGE'],
  };
}

export function buildOpportunityFeed(data: {
  lineupOpportunity: LineupOpportunity | null;
  players: RotationPlayer[];
  tradeTargets: TradeTargetItem[];
}): OpportunityFeedItem[] {
  const items: OpportunityFeedItem[] = [];

  if (data.lineupOpportunity) {
    items.push(lineupItem(data.lineupOpportunity));
  }

  for (const [i, t] of Array.from(data.tradeTargets.slice(0, 3).entries())) {
    items.push(tradeTargetItem(t, i));
  }

  const signalPool = [...data.players]
    .filter((p) => p.marketVerdict && !p.marketVerdict.noMarketData)
    .sort((a, b) => Math.abs(b.marketVerdict!.rankDelta ?? 0) - Math.abs(a.marketVerdict!.rankDelta ?? 0));

  for (const [i, p] of Array.from(signalPool.slice(0, 4).entries())) {
    const row = signalItem(p, i);
    if (row) items.push(row);
  }

  return items.slice(0, 6);
}

export function formatFeedTimeAgo(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  return `${h}h`;
}
