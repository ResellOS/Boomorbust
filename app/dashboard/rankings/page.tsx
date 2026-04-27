'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Search } from 'lucide-react';
import type { KTCPlayer } from '@/lib/values/ktc';

const POSITIONS = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K'];
const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  K: 'bg-gray-500/20 text-gray-300',
};
const TIER_COLORS: Record<string, string> = {
  elite: 'text-yellow-400',
  solid: 'text-[#6366F1]',
  depth: 'text-[#CBD5E1]',
  stash: 'text-[#475569]',
};

function getTier(value: number): string {
  if (value >= 7000) return 'elite';
  if (value >= 4000) return 'solid';
  if (value >= 1500) return 'depth';
  return 'stash';
}

function RankingsSkeleton() {
  return (
    <div className="space-y-px">
      {[...Array(20)].map((_, i) => (
        <div key={i} className={clsx('flex items-center gap-4 px-4 py-3', i % 2 === 1 ? 'bg-white/[0.02]' : '')}>
          <div className="h-4 w-6 shimmer rounded" />
          <div className="h-4 w-16 shimmer rounded" />
          <div className="h-4 flex-1 shimmer rounded" />
          <div className="h-4 w-20 shimmer rounded hidden sm:block" />
          <div className="h-4 w-12 shimmer rounded hidden sm:block" />
          <div className="h-4 w-14 shimmer rounded" />
        </div>
      ))}
    </div>
  );
}

export default function RankingsPage() {
  const [players, setPlayers] = useState<KTCPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetch('/api/values')
      .then((r) => r.json())
      .then((data) => { setPlayers(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = players.filter((p) => {
    const posMatch = filter === 'ALL' || p.position === filter;
    const nameMatch = !query || p.player_name.toLowerCase().includes(query.toLowerCase());
    return posMatch && nameMatch;
  });

  const empty = !loading && filtered.length === 0;

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Dynasty Rankings</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">KTC Dynasty Values</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search player..."
            className="w-full bg-[#1E293B] border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1] transition"
          />
        </div>
        <div className="flex gap-2">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => setFilter(pos)}
              className={clsx(
                'text-xs font-semibold px-3 py-2 rounded-lg transition',
                filter === pos
                  ? 'bg-[#6366F1] text-white'
                  : 'bg-[#1E293B] text-[#94A3B8] hover:text-white border border-white/10'
              )}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
        <div className="grid grid-cols-[40px_48px_1fr_80px_40px_80px] gap-x-4 px-4 py-2.5 border-b border-white/10 text-xs uppercase tracking-widest text-[#94A3B8]">
          <span>#</span>
          <span>Pos</span>
          <span>Player</span>
          <span className="hidden sm:block">Team</span>
          <span className="hidden sm:block">Age</span>
          <span>Value</span>
        </div>

        {loading ? (
          <RankingsSkeleton />
        ) : empty ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <svg className="w-12 h-12 text-[#475569]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <ellipse cx="12" cy="12" rx="10" ry="7" />
              <path d="M2 12 Q7 7 12 12 T22 12" />
            </svg>
            <div className="text-center">
              <p className="text-white font-medium mb-1">No players found</p>
              <p className="text-[#94A3B8] text-sm">Try a different position or clear your search.</p>
            </div>
            <button
              onClick={() => { setFilter('ALL'); setQuery(''); }}
              className="text-sm text-[#6366F1] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filtered.slice(0, 200).map((p, i) => {
            const tier = getTier(p.ktc_value);
            return (
              <div
                key={`${p.player_name}-${i}`}
                className={clsx(
                  'grid grid-cols-[40px_48px_1fr_80px_40px_80px] gap-x-4 px-4 py-3 text-sm items-center',
                  i % 2 === 1 ? 'bg-white/[0.02]' : ''
                )}
              >
                <span className="text-[#94A3B8]">{p.rank}</span>
                <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded text-center', POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300')}>
                  {p.position}
                </span>
                <span className="text-[#CBD5E1] truncate">{p.player_name}</span>
                <span className="text-[#94A3B8] text-xs hidden sm:block">—</span>
                <span className="text-[#94A3B8] text-xs hidden sm:block">{p.age || '—'}</span>
                <span className={clsx('font-semibold', TIER_COLORS[tier])}>
                  {p.ktc_value.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
}
