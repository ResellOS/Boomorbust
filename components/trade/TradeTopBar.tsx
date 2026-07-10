import type { TradePageStats } from '@/lib/trade/types';
import StatBar, { type StatBarCell } from '@/components/common/StatBar';

interface TradeTopBarProps {
  stats: TradePageStats;
}

export default function TradeTopBar({ stats }: TradeTopBarProps) {
  const cells: StatBarCell[] = [
    { label: 'Open Offers', value: stats.openOffers, tone: 'boom', sub: 'Pending Review' },
    { label: 'Accepted This Week', value: stats.acceptedThisWeek, tone: 'text', sub: 'Last 7 Days' },
    {
      label: 'Championship Odds',
      value: stats.championshipOdds > 0 ? `${stats.championshipOdds}%` : '—',
      tone: 'boom',
      sub: 'Across Rostered',
    },
    {
      label: 'Trade Opportunities',
      value: stats.tradeOpportunities,
      tone: 'hold',
      sub: 'Available',
    },
    { label: 'Leagues Active', value: stats.leaguesActive, tone: 'text', sub: 'All Connected' },
  ];

  return <StatBar cells={cells} />;
}
