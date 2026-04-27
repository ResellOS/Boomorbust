'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { createClient } from '@/lib/supabase/client';
import type { LineupRecommendation } from '@/lib/sitstart/engine';

const REC_STYLES: Record<string, string> = {
  START: 'bg-green-500/20 text-green-400 border-green-500/30',
  SIT: 'bg-red-500/20 text-red-400 border-red-500/30',
  FLEX: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};
const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  K: 'bg-gray-500/20 text-gray-300',
};

interface League { id: string; name: string; scoring_settings: Record<string, number> | null; }

function LineupSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-[#1E293B] rounded-xl p-4 flex items-center gap-4 border border-white/5">
          <div className="h-6 w-12 shimmer rounded" />
          <div className="h-5 flex-1 shimmer rounded" />
          <div className="h-6 w-16 shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export default function LineupPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<string>('');
  const [week, setWeek] = useState(1);
  const [recs, setRecs] = useState<LineupRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('leagues').select('id, name, scoring_settings').then(({ data }) => {
      setLeagues(data ?? []);
      if (data?.length) setSelectedLeague(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateRecs() {
    if (!selectedLeague) return;
    setLoading(true);
    setRecs([]);

    try {
      const league = leagues.find((l) => l.id === selectedLeague);
      const [{ data: roster }] = await Promise.all([
        supabase.from('rosters').select('players, starters, settings').eq('league_id', selectedLeague).single(),
      ]);

      const playerIds: string[] = ((roster?.players ?? []) as string[]).slice(0, 50);
      if (!playerIds.length) { setLoading(false); return; }

      const playerRes2 = await fetch(`/api/players?ids=${playerIds.join(',')}`);
      const playerData: Record<string, { full_name: string; position: string; team: string | null; age: number | null; injury_status: string | null }> =
        playerRes2.ok ? await playerRes2.json() : {};

      const rosterPlayers = playerIds
        .filter((pid) => playerData[pid])
        .map((pid) => ({ player_id: pid, ...playerData[pid]! }));

      const res = await fetch('/api/lineup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roster: rosterPlayers, league, week }),
      });

      if (res.ok) setRecs(await res.json());
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Lineup Optimizer</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">Sit/Start Recommendations</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="flex-1 bg-[#1E293B] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1]"
        >
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select
          value={week}
          onChange={(e) => setWeek(Number(e.target.value))}
          className="w-32 bg-[#1E293B] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1]"
        >
          {[...Array(18)].map((_, i) => (
            <option key={i + 1} value={i + 1}>Week {i + 1}</option>
          ))}
        </select>
        <button
          onClick={generateRecs}
          disabled={loading || !selectedLeague}
          className="bg-[#6366F1] hover:bg-[#6366F1]/90 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-lg transition text-sm"
        >
          {loading ? 'Analyzing...' : 'Get Recommendations'}
        </button>
      </div>

      {loading && <LineupSkeleton />}

      {!loading && recs.length === 0 && (
        <div className="text-center py-20">
          <svg className="w-12 h-12 text-[#475569] mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M8 12h8M12 8v8" />
          </svg>
          <p className="text-white font-medium mb-1">No recommendations yet</p>
          <p className="text-[#94A3B8] text-sm">Select a league and week, then click Get Recommendations.</p>
        </div>
      )}

      {!loading && recs.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-4">Week {week} Recommendations</p>
          {recs.map((rec) => (
            <div key={rec.player_id} className="bg-[#1E293B] border border-white/5 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === rec.player_id ? null : rec.player_id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/5 transition"
              >
                <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 w-10 text-center', POSITION_COLORS[rec.position] ?? 'bg-gray-500/20 text-gray-300')}>
                  {rec.position}
                </span>
                <span className="text-white font-medium flex-1">{rec.player_name}</span>
                {rec.team && <span className="text-[#94A3B8] text-xs">{rec.team}</span>}
                {rec.projected_points > 0 && (
                  <span className="text-[#CBD5E1] text-sm">{rec.projected_points.toFixed(1)} pts</span>
                )}
                <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full border', REC_STYLES[rec.recommendation])}>
                  {rec.recommendation}
                </span>
              </button>
              {expanded === rec.player_id && (
                <div className="px-4 pb-4 pt-1 text-sm text-[#CBD5E1] border-t border-white/5">
                  <p>{rec.explanation}</p>
                  {rec.weather && !rec.weather.is_dome && (
                    <p className="mt-1 text-xs text-[#94A3B8]">
                      Weather: {rec.weather.temp_f}°F · {rec.weather.wind_mph} mph wind · {rec.weather.precip_chance}% precip
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[#94A3B8]">Matchup: {rec.matchup_label}</p>
                </div>
              )}
            </div>
          ))}
          <p className="text-center text-xs text-[#475569] mt-4">
            &quot;Set optimal lineup&quot; requires Sleeper partnership API access.
          </p>
        </div>
      )}
    </main>
  );
}
