'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import { getHandcuffStatus, type HandcuffResult, type HandcuffPriority, type HandcuffSummary } from '@/lib/handcuffs/tracker';

const PRIORITY_STYLES: Record<HandcuffPriority, { header: string; border: string }> = {
  critical:  { header: 'text-red-400 border-red-400/30',    border: 'border-red-500/20' },
  important: { header: 'text-amber-400 border-amber-400/30', border: 'border-amber-500/20' },
  monitor:   { header: 'text-[#94A3B8] border-white/10',    border: 'border-white/5' },
};

const STATUS_STYLES = {
  YOU_OWN:       'bg-green-500/20 text-green-400 border-green-500/30',
  AVAILABLE:     'bg-red-500/20 text-red-400 border-red-500/30',
  OPPONENT_OWNS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const STATUS_LABELS = {
  YOU_OWN:       'You Own',
  AVAILABLE:     'Add Immediately',
  OPPONENT_OWNS: 'Opponent Owns',
};

function HandcuffCard({ result }: { result: HandcuffResult }) {
  const p = PRIORITY_STYLES[result.priority];
  const youOwn = result.handcuffs.some((h) => h.status === 'YOU_OWN');

  return (
    <div className={clsx('bg-[#1E293B] rounded-2xl border p-5 space-y-3', p.border)}>
      {/* Starter header */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-300">
          {result.starter_position}
        </span>
        <span className="text-white font-semibold">{result.starter_name}</span>
        {result.starter_team && <span className="text-[#94A3B8] text-xs">{result.starter_team}</span>}
        {result.starter_ktc > 0 && (
          <span className="text-[#94A3B8] text-xs ml-auto">{result.starter_ktc.toLocaleString()} KTC</span>
        )}
      </div>

      {/* Per-league rows */}
      <div className="space-y-2">
        {result.handcuffs.map((h, i) => (
          <div key={i} className="flex items-center gap-3 text-sm bg-[#0F172A] rounded-lg px-3 py-2">
            <span className="text-[#94A3B8] text-xs truncate flex-1 min-w-0">
              {h.league_name} · <span className="text-[#CBD5E1]">{h.name}</span>
            </span>
            <span className={clsx('shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border', STATUS_STYLES[h.status])}>
              {h.status === 'OPPONENT_OWNS' && h.owner_roster_id
                ? `Roster #${h.owner_roster_id}`
                : STATUS_LABELS[h.status]}
            </span>
          </div>
        ))}
      </div>

      {!youOwn && result.handcuffs.some((h) => h.status === 'AVAILABLE') && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block animate-pulse" />
          Available on waivers — add before someone else does
        </p>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-[#1E293B] rounded-2xl border border-white/5 p-5 space-y-3">
          <div className="h-5 w-48 shimmer rounded" />
          <div className="h-10 shimmer rounded-lg" />
          <div className="h-10 shimmer rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function HandcuffsPage() {
  const [summary, setSummary] = useState<HandcuffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [monitorOpen, setMonitorOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: leagues }, ktcRes] = await Promise.all([
        supabase.from('leagues').select('id, name, total_rosters, scoring_settings'),
        fetch('/api/values'),
      ]);
      const ktcData: { player_name: string; ktc_value: number }[] = ktcRes.ok ? await ktcRes.json() : [];
      const ktcMap: Record<string, number> = {};
      for (const p of ktcData) ktcMap[p.player_name.toLowerCase()] = p.ktc_value;

      if (!leagues?.length) { setLoading(false); return; }

      const rosterResults = await Promise.all(
        leagues.map(async (lg) => {
          const { data } = await supabase
            .from('rosters').select('roster_id, players, starters').eq('league_id', lg.id).limit(1).single();
          return {
            league_id: lg.id, league_name: lg.name,
            roster_id: data?.roster_id ?? 0,
            players: (data?.players ?? []) as string[],
            starters: (data?.starters ?? []) as string[],
          };
        })
      );

      const allIds = Array.from(new Set(rosterResults.flatMap((r) => r.players)));
      const playerRes = await fetch(`/api/players?ids=${allIds.slice(0, 200).join(',')}`);
      const players = playerRes.ok ? await playerRes.json() : {};

      // Fetch all league rosters (all teams) for ownership checking
      const allLeagueRosters = await Promise.all(
        leagues.map(async (lg) => {
          const { data } = await supabase
            .from('rosters').select('roster_id, players').eq('league_id', lg.id);
          return {
            league_id: lg.id,
            rosters: (data ?? []).map((r) => ({ roster_id: r.roster_id as number, players: (r.players ?? []) as string[] })),
          };
        })
      );

      const result = getHandcuffStatus(rosterResults, players, ktcMap, allLeagueRosters);
      setSummary(result);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const critical  = summary?.results.filter((r) => r.priority === 'critical') ?? [];
  const important = summary?.results.filter((r) => r.priority === 'important') ?? [];
  const monitor   = summary?.results.filter((r) => r.priority === 'monitor') ?? [];

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Handcuff Tracker</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Protect your starters across every league</p>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={clsx('rounded-2xl p-4 border', summary.unprotected_starters > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-[#1E293B] border-white/5')}>
            <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-1">Unprotected Starters</p>
            <p className={clsx('text-3xl font-bold', summary.unprotected_starters > 0 ? 'text-red-400' : 'text-white')}>
              {summary.unprotected_starters}
            </p>
          </div>
          <div className={clsx('rounded-2xl p-4 border', summary.available_to_add > 0 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[#1E293B] border-white/5')}>
            <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-1">Available to Add</p>
            <p className={clsx('text-3xl font-bold', summary.available_to_add > 0 ? 'text-amber-400' : 'text-white')}>
              {summary.available_to_add}
            </p>
          </div>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && summary?.results.length === 0 && (
        <div className="text-center py-20">
          <p className="text-white font-medium mb-1">No handcuff situations found</p>
          <p className="text-[#94A3B8] text-sm">Make sure your rosters are synced and starters are set.</p>
        </div>
      )}

      {/* CRITICAL */}
      {critical.length > 0 && (
        <section className="mb-8">
          <h2 className={clsx('text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b', PRIORITY_STYLES.critical.header)}>
            Critical — {critical.length}
          </h2>
          <div className="space-y-3">
            {critical.map((r) => <HandcuffCard key={r.starter_id} result={r} />)}
          </div>
        </section>
      )}

      {/* IMPORTANT */}
      {important.length > 0 && (
        <section className="mb-8">
          <h2 className={clsx('text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b', PRIORITY_STYLES.important.header)}>
            Important — {important.length}
          </h2>
          <div className="space-y-3">
            {important.map((r) => <HandcuffCard key={r.starter_id} result={r} />)}
          </div>
        </section>
      )}

      {/* MONITOR (collapsed by default) */}
      {monitor.length > 0 && (
        <section>
          <button
            onClick={() => setMonitorOpen(!monitorOpen)}
            className={clsx('text-xs font-bold uppercase tracking-widest mb-4 pb-2 border-b w-full text-left flex items-center justify-between', PRIORITY_STYLES.monitor.header)}
          >
            <span>Monitor — {monitor.length}</span>
            <span>{monitorOpen ? '▲' : '▼'}</span>
          </button>
          {monitorOpen && (
            <div className="space-y-3 fade-in">
              {monitor.map((r) => <HandcuffCard key={r.starter_id} result={r} />)}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
