'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { Share2, RefreshCw, Trophy, TrendingUp } from 'lucide-react';

interface WrappedData {
  season: string;
  league_count: number;
  total_trades: number;
  total_adds: number;
  total_drops: number;
  total_roster_value: number;
  best_pickup: { name: string; ktc: number } | null;
  top_assets: Array<{ name: string; position: string; ktc: number }>;
  leagues: string[];
}

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-400',
};

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-5">
      <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">{label}</p>
      <p className={clsx('text-4xl font-bold', accent ?? 'text-white')}>{value}</p>
      {sub && <p className="text-[#94A3B8] text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function WrappedPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WrappedData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/wrapped/generate', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? 'Failed to generate');
        return;
      }
      const json = await res.json();
      setData(json.data);
      setToken(json.token);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!token) return;
    const url = `${window.location.origin}/wrapped/2025?token=${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareOnX() {
    if (!token) return;
    const url = `${window.location.origin}/wrapped/2025?token=${token}`;
    const text = data
      ? `My 2025 Dynasty Season Wrapped 🏈\n\n📊 ${data.total_trades} trades · ${data.total_adds} adds\n💎 ${data.total_roster_value.toLocaleString()} total KTC value\n\nCheck out @DynastyCommandCenter`
      : 'Check out my 2025 Dynasty Season Wrapped!';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Season Wrapped</h1>
          <p className="text-sm text-[#94A3B8] mt-1">Your 2025 dynasty season, by the numbers</p>
        </div>
        {data && token && (
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition"
            >
              <Share2 className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={shareOnX}
              className="flex items-center gap-2 text-sm bg-black hover:bg-black/80 text-white px-3 py-1.5 rounded-lg transition font-medium"
            >
              Share on X
            </button>
          </div>
        )}
      </div>

      {!data && (
        <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center mx-auto mb-5">
            <Trophy className="w-8 h-8 text-[#6366F1]" />
          </div>
          <h2 className="text-white font-bold text-lg mb-2">Your 2025 Dynasty Wrapped</h2>
          <p className="text-[#94A3B8] text-sm mb-6 max-w-sm mx-auto">
            Generate your personalized season summary — trades made, best pickups, roster value, and more. Share it with your leagues.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-2 mx-auto bg-[#6366F1] hover:bg-[#5254cc] disabled:opacity-40 text-white font-semibold px-6 py-3 rounded-xl transition"
          >
            {loading ? (
              <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            ) : (
              <><Trophy className="w-4 h-4" /> Generate My Wrapped</>
            )}
          </button>
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        </div>
      )}

      {data && (
        <div className="space-y-6 fade-in">
          {/* Hero stat */}
          <div className="bg-gradient-to-br from-[#6366F1]/20 to-[#1E293B] rounded-2xl border border-[#6366F1]/20 p-8 text-center">
            <p className="text-xs uppercase tracking-widest text-[#6366F1] mb-3">2025 Season</p>
            <p className="text-6xl font-black text-white mb-2">{data.total_trades}</p>
            <p className="text-[#94A3B8]">trades across {data.league_count} league{data.league_count !== 1 ? 's' : ''}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatCard label="Waiver Adds" value={data.total_adds} />
            <StatCard label="Players Dropped" value={data.total_drops} />
            <StatCard
              label="Total Roster Value"
              value={`${Math.round(data.total_roster_value / 1000)}K`}
              sub="KTC"
              accent="text-[#6366F1]"
            />
          </div>

          {/* Best pickup */}
          {data.best_pickup && (
            <div className="bg-[#1E293B] rounded-2xl border border-green-500/20 p-6">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <p className="text-xs uppercase tracking-widest text-green-400">Best Pickup</p>
              </div>
              <p className="text-white font-bold text-xl">{data.best_pickup.name}</p>
              <p className="text-[#94A3B8] text-sm mt-1">{data.best_pickup.ktc.toLocaleString()} KTC value</p>
            </div>
          )}

          {/* Top assets */}
          {data.top_assets.length > 0 && (
            <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6">
              <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-4">Top Assets Heading Into 2026</p>
              <div className="space-y-3">
                {data.top_assets.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-3">
                    <span className="text-[#475569] text-sm w-5 shrink-0">#{i + 1}</span>
                    <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded shrink-0', POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300')}>
                      {p.position}
                    </span>
                    <span className="text-[#CBD5E1] flex-1">{p.name}</span>
                    <span className="text-[#94A3B8] text-sm">{p.ktc.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share CTA */}
          <div className="bg-[#1A2332] border border-[#6366F1]/20 rounded-2xl p-6 text-center">
            <p className="text-white font-semibold mb-1">Share your Wrapped</p>
            <p className="text-[#94A3B8] text-sm mb-4">Let your leaguemates see how your dynasty season stacked up</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={copyLink}
                className="text-sm text-[#CBD5E1] hover:text-white border border-white/10 hover:border-white/30 px-4 py-2 rounded-xl transition"
              >
                {copied ? '✓ Copied' : 'Copy link'}
              </button>
              <button
                onClick={shareOnX}
                className="text-sm font-semibold bg-black hover:bg-black/80 text-white px-4 py-2 rounded-xl transition"
              >
                Share on X →
              </button>
            </div>
          </div>

          {/* Regenerate */}
          <div className="text-center">
            <button
              onClick={generate}
              disabled={loading}
              className="text-xs text-[#475569] hover:text-[#94A3B8] transition"
            >
              {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
