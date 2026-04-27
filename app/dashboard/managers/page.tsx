'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import type { ManagerArchetype, TradeTrend, ManagerProfileData } from '@/lib/managers/analyzer';

interface League { id: string; name: string }

interface MgrProfileRow {
  sleeper_roster_id: number;
  sleeper_owner_id: string | null;
  display_name: string | null;
  avatar: string | null;
  trade_count: number;
  data: ManagerProfileData;
}

const ARCHETYPE_STYLE: Record<ManagerArchetype, { bg: string; text: string; border: string }> = {
  rebuilder:      { bg: 'bg-cyan-500/10',    text: 'text-cyan-300',   border: 'border-cyan-500/30' },
  contender:      { bg: 'bg-amber-500/10',   text: 'text-amber-300',  border: 'border-amber-500/30' },
  wheeler_dealer: { bg: 'bg-green-500/10',   text: 'text-green-300',  border: 'border-green-500/30' },
  hoarder:        { bg: 'bg-slate-500/10',   text: 'text-slate-400',  border: 'border-slate-500/30' },
  balanced:       { bg: 'bg-[#6366F1]/10',   text: 'text-[#6366F1]',  border: 'border-[#6366F1]/30' },
};

const FREQ_STYLE: Record<TradeTrend, string> = {
  active:   'text-green-400',
  moderate: 'text-amber-400',
  inactive: 'text-slate-500',
};

const POS_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/15 text-purple-300',
  RB: 'bg-green-500/15 text-green-300',
  WR: 'bg-cyan-500/15 text-cyan-300',
  TE: 'bg-amber-500/15 text-amber-400',
};

function ArchetypeBadge({ archetype, label }: { archetype: ManagerArchetype; label: string }) {
  const s = ARCHETYPE_STYLE[archetype];
  return (
    <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full border', s.bg, s.text, s.border)}>
      {label}
    </span>
  );
}

function PosBadge({ pos, label }: { pos: string; label: string }) {
  return (
    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-md', POS_COLORS[pos] ?? 'bg-white/10 text-white')}>
      {label}
    </span>
  );
}

function ManagerCard({ row }: { row: MgrProfileRow }) {
  const d = row.data;
  const style = ARCHETYPE_STYLE[d.archetype];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={clsx('bg-[#1E293B] border rounded-2xl p-5 space-y-4 transition-all', style.border)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {row.avatar ? (
            <Image
              src={`https://sleepercdn.com/avatars/thumbs/${row.avatar}`}
              alt=""
              width={36}
              height={36}
              className="rounded-full bg-[#0F172A] shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[#0F172A] border border-white/10 flex items-center justify-center shrink-0">
              <span className="text-[#475569] text-xs font-bold">{(row.display_name ?? '?')[0].toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{row.display_name ?? `Roster ${row.sleeper_roster_id}`}</p>
            <p className={clsx('text-xs', FREQ_STYLE[d.trade_frequency])}>
              {d.trade_count} trades · {d.trade_frequency}
            </p>
          </div>
        </div>
        <ArchetypeBadge archetype={d.archetype} label={d.archetype_label} />
      </div>

      {/* Needs / Surplus */}
      <div className="flex flex-wrap gap-2 items-center">
        {d.needs.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#94A3B8]">Needs:</span>
            {d.needs.map((pos) => <PosBadge key={pos} pos={pos} label={pos} />)}
          </div>
        )}
        {d.surplus.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-[#94A3B8]">Has surplus:</span>
            {d.surplus.map((pos) => <PosBadge key={pos} pos={pos} label={pos} />)}
          </div>
        )}
      </div>

      {/* Pitch angle */}
      <div className="bg-[#0F172A] border border-white/5 rounded-xl px-3.5 py-2.5">
        <p className="text-xs text-[#475569] mb-1 uppercase tracking-widest">Pitch angle</p>
        <p className="text-sm text-[#CBD5E1] leading-relaxed">{d.pitch_angle}</p>
      </div>

      {/* Expand for full details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-[#6366F1] hover:text-white transition"
      >
        {expanded ? 'Show less ↑' : 'Show full profile ↓'}
      </button>

      {expanded && (
        <div className="space-y-4 pt-1 border-t border-white/5">
          {/* Position scores */}
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-2">Position Depth</p>
            <div className="grid grid-cols-4 gap-2">
              {['QB', 'RB', 'WR', 'TE'].map((pos) => {
                const s = d.position_scores[pos];
                if (!s) return null;
                return (
                  <div key={pos} className="bg-[#0F172A] rounded-lg p-2.5 text-center border border-white/5">
                    <p className={clsx('text-xs font-bold mb-0.5', POS_COLORS[pos]?.split(' ')[1])}>{pos}</p>
                    <p className="text-white text-sm font-semibold">{s.count}</p>
                    <p className={clsx('text-xs', s.tier === 'strong' ? 'text-green-400' : s.tier === 'average' ? 'text-amber-400' : 'text-red-400')}>
                      {s.tier}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trade tendencies */}
          <div>
            <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-2">Trade Tendencies</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {d.avg_buy_age !== null && (
                <div className="bg-[#0F172A] rounded-lg p-2.5 border border-white/5">
                  <p className="text-[#475569] mb-0.5">Avg buy age</p>
                  <p className="text-white font-semibold">{d.avg_buy_age}y</p>
                </div>
              )}
              {d.avg_sell_age !== null && (
                <div className="bg-[#0F172A] rounded-lg p-2.5 border border-white/5">
                  <p className="text-[#475569] mb-0.5">Avg sell age</p>
                  <p className="text-white font-semibold">{d.avg_sell_age}y</p>
                </div>
              )}
              <div className="bg-[#0F172A] rounded-lg p-2.5 border border-white/5">
                <p className="text-[#475569] mb-0.5">Picks received</p>
                <p className="text-white font-semibold">{d.adds_picks}</p>
              </div>
              <div className="bg-[#0F172A] rounded-lg p-2.5 border border-white/5">
                <p className="text-[#475569] mb-0.5">Picks sent</p>
                <p className="text-white font-semibold">{d.sells_picks}</p>
              </div>
            </div>
          </div>

          {/* Top assets */}
          {d.top_assets.length > 0 && (
            <div>
              <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-2">Top Assets</p>
              <ul className="space-y-1.5">
                {d.top_assets.map((a) => (
                  <li key={a.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <PosBadge pos={a.position} label={a.position} />
                      <span className="text-[#CBD5E1] truncate">{a.name}</span>
                      {a.age && <span className="text-[#475569]">{a.age}y</span>}
                    </div>
                    <span className="text-[#6366F1] font-semibold shrink-0 ml-2">{a.ktc.toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Buys / sells breakdown */}
          {(Object.keys(d.buys_position).length > 0 || Object.keys(d.sells_position).length > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(d.buys_position).length > 0 && (
                <div>
                  <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-1.5">Buys</p>
                  {Object.entries(d.buys_position).sort((a, b) => b[1] - a[1]).map(([pos, count]) => (
                    <div key={pos} className="flex items-center gap-2 mb-1">
                      <PosBadge pos={pos} label={pos} />
                      <span className="text-[#CBD5E1] text-xs">{count}×</span>
                    </div>
                  ))}
                </div>
              )}
              {Object.keys(d.sells_position).length > 0 && (
                <div>
                  <p className="text-xs text-[#94A3B8] uppercase tracking-widest mb-1.5">Sells</p>
                  {Object.entries(d.sells_position).sort((a, b) => b[1] - a[1]).map(([pos, count]) => (
                    <div key={pos} className="flex items-center gap-2 mb-1">
                      <PosBadge pos={pos} label={pos} />
                      <span className="text-[#CBD5E1] text-xs">{count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ManagersPage() {
  const supabase = createClient();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [profiles, setProfiles] = useState<MgrProfileRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('leagues').select('id, name').then(({ data }) => {
      setLeagues(data ?? []);
      if (data?.length) setSelectedLeague(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;
    loadProfiles(selectedLeague);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeague]);

  async function loadProfiles(leagueId: string) {
    setLoading(true);
    setError('');
    const { data } = await supabase
      .from('manager_profiles')
      .select('sleeper_roster_id, sleeper_owner_id, display_name, avatar, trade_count, data')
      .eq('league_id', leagueId)
      .order('trade_count', { ascending: false });
    setProfiles((data as MgrProfileRow[]) ?? []);
    setLoading(false);
  }

  async function runAnalysis() {
    setAnalyzing(true);
    setError('');
    try {
      const res = await fetch('/api/managers/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_id: selectedLeague }),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Analysis failed');
      } else {
        const data = await res.json() as MgrProfileRow[];
        setProfiles(data);
      }
    } catch {
      setError('Network error');
    }
    setAnalyzing(false);
  }

  const selectedLeagueName = leagues.find((l) => l.id === selectedLeague)?.name ?? '';

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-1">Leaguemate Profiles</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">
          Dynasty tendencies · trade archetypes · pitch angles
        </p>
      </div>

      {/* League selector + analyze button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="flex-1 bg-[#1E293B] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366F1]"
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <button
          onClick={runAnalysis}
          disabled={analyzing || !selectedLeague}
          className="bg-[#6366F1] hover:bg-[#5254cc] disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition whitespace-nowrap"
        >
          {analyzing ? 'Analyzing…' : profiles.length ? 'Re-analyze League' : 'Analyze League'}
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-[#1E293B] border border-white/5 rounded-2xl h-48 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && profiles.length === 0 && selectedLeague && (
        <div className="text-center py-20 border border-white/5 rounded-2xl bg-[#1E293B]">
          <p className="text-[#94A3B8] text-sm mb-1">No profiles for {selectedLeagueName} yet.</p>
          <p className="text-xs text-[#475569]">Click &ldquo;Analyze League&rdquo; to build dynasty profiles for every manager.</p>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((row) => (
            <ManagerCard key={row.sleeper_roster_id} row={row} />
          ))}
        </div>
      )}
    </main>
  );
}
