'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { ChevronDown, ChevronUp, Zap, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { TradeMatch } from '@/lib/trade/finder';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-400',
};

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? 'bg-green-500/20 text-green-400 border-green-500/30' :
    score >= 50 ? 'bg-[#6366F1]/20 text-[#6366F1] border-[#6366F1]/30' :
    'bg-white/5 text-[#94A3B8] border-white/10';
  return (
    <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full border', color)}>
      {score}% match
    </span>
  );
}

function TradeCard({ match, leagueName }: { match: TradeMatch & { ai_pitch?: string }; leagueName: string }) {
  const [pitchOpen, setPitchOpen] = useState(false);
  const router = useRouter();

  function analyzeThis() {
    const params = new URLSearchParams();
    if (match.your_chip) params.set('giving', match.your_chip.replace(/\s*\(.*\)/, '').trim());
    if (match.their_chip) params.set('receiving', match.their_chip.replace(/\s*\(.*\)/, '').trim());
    router.push(`/dashboard/trade?${params.toString()}`);
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-white font-semibold text-sm">Roster #{match.roster_id}</p>
          <p className="text-[#94A3B8] text-xs mt-0.5">{leagueName}</p>
        </div>
        <ScoreBadge score={match.match_score} />
      </div>

      {/* Needs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">They need</p>
          <div className="flex flex-wrap gap-1.5">
            {match.they_need.length
              ? match.they_need.map((pos) => (
                  <span key={pos} className={clsx('text-xs font-semibold px-2 py-0.5 rounded', POSITION_COLORS[pos] ?? 'bg-gray-500/20 text-gray-300')}>{pos}</span>
                ))
              : <span className="text-xs text-[#475569]">depth</span>}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">You need</p>
          <div className="flex flex-wrap gap-1.5">
            {match.you_need.length
              ? match.you_need.map((pos) => (
                  <span key={pos} className={clsx('text-xs font-semibold px-2 py-0.5 rounded', POSITION_COLORS[pos] ?? 'bg-gray-500/20 text-gray-300')}>{pos}</span>
                ))
              : <span className="text-xs text-[#475569]">depth</span>}
          </div>
        </div>
      </div>

      {/* Chips */}
      <div className="bg-[#0F172A] rounded-xl p-3 border border-white/5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[#94A3B8] mb-1">You offer</p>
          <p className="text-[#CBD5E1] font-medium">{match.your_chip}</p>
        </div>
        <div>
          <p className="text-xs text-[#94A3B8] mb-1">They offer</p>
          <p className="text-[#CBD5E1] font-medium">{match.their_chip}</p>
        </div>
      </div>

      {/* Concept */}
      <p className="text-sm text-[#94A3B8] leading-relaxed">{match.trade_concept}</p>

      {/* AI Pitch expandable */}
      {match.ai_pitch && (
        <div className="border border-white/5 rounded-xl overflow-hidden">
          <button
            onClick={() => setPitchOpen(!pitchOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-[#94A3B8] hover:text-white hover:bg-white/5 transition"
          >
            <span className="flex items-center gap-1.5 font-semibold uppercase tracking-widest">
              <Zap className="w-3.5 h-3.5 text-[#6366F1]" />
              AI Trade Pitch
            </span>
            {pitchOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {pitchOpen && (
            <div className="px-4 pb-4 pt-1 border-t border-white/5">
              <p className="text-sm text-[#CBD5E1] leading-relaxed">{match.ai_pitch}</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <button
        onClick={analyzeThis}
        className="w-full text-sm font-semibold text-[#6366F1] hover:text-white bg-[#6366F1]/10 hover:bg-[#6366F1] border border-[#6366F1]/30 hover:border-[#6366F1] rounded-xl py-2.5 transition"
      >
        Analyze this trade →
      </button>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[#1E293B] rounded-2xl border border-white/5 p-5 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-1.5">
              <div className="h-4 w-24 shimmer rounded" />
              <div className="h-3 w-32 shimmer rounded" />
            </div>
            <div className="h-6 w-20 shimmer rounded-full" />
          </div>
          <div className="h-12 shimmer rounded-xl" />
          <div className="h-10 shimmer rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default function TradeFinderPage() {
  const [leagues, setLeagues] = useState<{ id: string; name: string }[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [matches, setMatches] = useState<(TradeMatch & { ai_pitch?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('leagues').select('id, name').then(({ data }) => {
      setLeagues(data ?? []);
      if (data?.length) setSelectedLeague(data[0].id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function findTrades() {
    if (!selectedLeague || loading) return;
    setLoading(true);
    setHasSearched(true);
    setMatches([]);
    try {
      const res = await fetch('/api/trade/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ league_id: selectedLeague }),
      });
      if (res.ok) setMatches(await res.json());
    } catch {}
    setLoading(false);
  }

  const leagueName = leagues.find((l) => l.id === selectedLeague)?.name ?? '';

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Trade Finder</h1>
        <p className="text-sm text-[#94A3B8] mt-1">Discover ideal trade partners based on roster fit</p>
      </div>

      {/* Controls */}
      <div className="flex items-end gap-4 mb-8">
        <div className="flex-1">
          <label className="text-xs text-[#94A3B8] mb-1.5 block">Select league</label>
          <select
            value={selectedLeague}
            onChange={(e) => { setSelectedLeague(e.target.value); setHasSearched(false); setMatches([]); }}
            className="w-full bg-[#1E293B] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1]"
          >
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <button
          onClick={findTrades}
          disabled={!selectedLeague || loading}
          className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#5254cc] disabled:opacity-40 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analyzing…</>
            : <><Zap className="w-4 h-4" /> Find Trades</>}
        </button>
      </div>

      {/* Info blurb */}
      {!hasSearched && !loading && (
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 text-center">
          <p className="text-[#CBD5E1] font-medium mb-2">How it works</p>
          <p className="text-[#94A3B8] text-sm leading-relaxed max-w-md mx-auto">
            We analyze positional surpluses and deficits across every roster in your league,
            find teams with complementary needs, and generate AI-powered trade pitches for the best fits.
          </p>
        </div>
      )}

      {loading && <Skeleton />}

      {!loading && hasSearched && matches.length === 0 && (
        <div className="text-center py-16">
          <p className="text-white font-medium mb-1">No strong trade matches found</p>
          <p className="text-[#94A3B8] text-sm">Your roster may be well-balanced, or rosters need a sync. Try another league.</p>
        </div>
      )}

      {!loading && matches.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs text-[#475569] mb-2">
            {matches.length} match{matches.length !== 1 ? 'es' : ''} found · Results cached for 6 hours
          </p>
          {matches.map((m) => (
            <TradeCard key={m.roster_id} match={m} leagueName={leagueName} />
          ))}
        </div>
      )}
    </main>
  );
}
