'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { AlertTriangle, TrendingDown, RefreshCw } from 'lucide-react';
import type { InjuryAlert, InjurySeverity } from '@/lib/injuries/broadcaster';

const SEVERITY_STYLES: Record<InjurySeverity, { badge: string; border: string; dot: string }> = {
  season_ending: { badge: 'bg-red-500/20 text-red-400 border-red-500/30', border: 'border-red-500/20', dot: 'bg-red-400' },
  multi_week:    { badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  week_to_week:  { badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', border: 'border-yellow-500/20', dot: 'bg-yellow-400' },
  questionable:  { badge: 'bg-[#94A3B8]/10 text-[#94A3B8] border-white/10', border: 'border-white/10', dot: 'bg-[#94A3B8]' },
};

const TRADE_STYLES: Record<string, string> = {
  sell_now: 'text-red-400',
  buy_low:  'text-green-400',
  hold:     'text-[#CBD5E1]',
  monitor:  'text-[#94A3B8]',
};

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-400',
};

function AlertCard({ alert }: { alert: InjuryAlert }) {
  const styles = SEVERITY_STYLES[alert.severity];
  const tradeColor = TRADE_STYLES[alert.trade_opportunity.action];

  return (
    <div className={clsx('bg-[#1E293B] rounded-2xl border p-6 space-y-4', styles.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded', POSITION_COLORS[alert.player.position] ?? 'bg-gray-500/20 text-gray-300')}>
            {alert.player.position}
          </span>
          <div>
            <p className="text-white font-semibold">{alert.player.name}</p>
            <p className="text-[#94A3B8] text-xs">
              {alert.player.team ?? 'FA'} · {alert.player.ktc_value > 0 ? `${alert.player.ktc_value.toLocaleString()} KTC` : '—'}
            </p>
          </div>
        </div>
        <span className={clsx('shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border', styles.badge)}>
          {alert.severity_label}
        </span>
      </div>

      {/* Affected leagues */}
      <div>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">Affected Leagues</p>
        <div className="flex flex-wrap gap-2">
          {alert.affected_leagues.map((lg) => (
            <span key={lg.league_id} className={clsx('text-xs px-2 py-1 rounded-lg border', lg.is_starter ? 'border-[#6366F1]/30 bg-[#6366F1]/10 text-[#6366F1]' : 'border-white/10 text-[#94A3B8]')}>
              {lg.league_name} {lg.is_starter ? '· Starter' : '· Bench'}
            </span>
          ))}
        </div>
      </div>

      {/* Replacements */}
      {alert.replacements.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">Bench Options</p>
          <div className="flex flex-wrap gap-2">
            {alert.replacements.map((r) => (
              <span key={r.player_id} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[#CBD5E1]">
                {r.name} ({r.position}) — {r.ktc_value > 0 ? r.ktc_value.toLocaleString() : '—'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trade opportunity */}
      <div className="bg-[#0F172A] rounded-xl p-3 border border-white/5">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8]">Trade Action</p>
          <span className={clsx('text-xs font-bold uppercase', tradeColor)}>
            {alert.trade_opportunity.action.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-[#CBD5E1]">{alert.trade_opportunity.note}</p>
      </div>

      {/* Recommendation */}
      <p className="text-sm text-[#CBD5E1] leading-relaxed">{alert.recommendation}</p>
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <div className="h-5 w-36 shimmer rounded" />
          <div className="h-3 w-24 shimmer rounded" />
        </div>
        <div className="h-6 w-24 shimmer rounded-full" />
      </div>
      <div className="h-4 w-32 shimmer rounded" />
      <div className="flex gap-2">
        <div className="h-7 w-28 shimmer rounded-lg" />
        <div className="h-7 w-24 shimmer rounded-lg" />
      </div>
      <div className="h-16 shimmer rounded-xl" />
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<InjuryAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await fetch('/api/injuries/scan');
      if (res.ok) {
        setAlerts(await res.json());
        setLastUpdated(new Date());
      }
    } catch {}
    setLoading(false);
  }

  useEffect(() => { fetchAlerts(); }, []);

  const critical = alerts.filter((a) => a.severity === 'season_ending' || a.severity === 'multi_week');
  const watchlist = alerts.filter((a) => a.severity === 'week_to_week' || a.severity === 'questionable');

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Injury Alerts</h1>
            {alerts.length > 0 && (
              <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold px-2 py-0.5 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          <p className="text-sm text-[#94A3B8] mt-1">
            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Scanning rosters...'}
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
        >
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {loading && (
        <div className="space-y-4">
          <AlertSkeleton />
          <AlertSkeleton />
        </div>
      )}

      {!loading && alerts.length === 0 && (
        <div className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <span className="text-green-400 text-xl">✓</span>
          </div>
          <div>
            <p className="text-white font-medium mb-1">All clear</p>
            <p className="text-[#94A3B8] text-sm">No injury alerts across your rosters.</p>
          </div>
        </div>
      )}

      {!loading && critical.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-semibold text-red-400 uppercase tracking-widest">
              Critical — {critical.length}
            </h2>
          </div>
          <div className="space-y-4">
            {critical.map((a) => <AlertCard key={a.player_id} alert={a} />)}
          </div>
        </div>
      )}

      {!loading && watchlist.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-[#94A3B8]" />
            <h2 className="text-sm font-semibold text-[#94A3B8] uppercase tracking-widest">
              Watchlist — {watchlist.length}
            </h2>
          </div>
          <div className="space-y-4">
            {watchlist.map((a) => <AlertCard key={a.player_id} alert={a} />)}
          </div>
        </div>
      )}
    </main>
  );
}
