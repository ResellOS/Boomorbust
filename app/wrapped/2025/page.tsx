import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

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

async function WrappedContent({ token }: { token: string }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('wrapped_results')
    .select('data')
    .eq('token', token)
    .single();

  if (error || !data) notFound();

  const w = data.data as WrappedData;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col items-center px-6 py-12">
      {/* Card */}
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-1">
            <span className="text-white font-bold text-lg">The</span>
            <span className="text-[#6366F1] font-bold text-lg">Front Office</span>
          </Link>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-br from-[#6366F1]/30 to-[#1E293B] rounded-3xl border border-[#6366F1]/30 p-8 text-center mb-4">
          <p className="text-[#6366F1] text-xs uppercase tracking-widest mb-2">2025 Season Wrapped</p>
          <p className="text-8xl font-black text-white mb-1">{w.total_trades}</p>
          <p className="text-[#94A3B8] text-sm">trades made this season</p>
          <p className="text-[#475569] text-xs mt-1">across {w.league_count} league{w.league_count !== 1 ? 's' : ''}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{w.total_adds}</p>
            <p className="text-[#94A3B8] text-xs mt-1">Adds</p>
          </div>
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-4 text-center">
            <p className="text-2xl font-bold text-white">{w.total_drops}</p>
            <p className="text-[#94A3B8] text-xs mt-1">Drops</p>
          </div>
          <div className="bg-[#1E293B] rounded-2xl border border-[#6366F1]/20 p-4 text-center">
            <p className="text-2xl font-bold text-[#6366F1]">{Math.round(w.total_roster_value / 1000)}K</p>
            <p className="text-[#94A3B8] text-xs mt-1">KTC value</p>
          </div>
        </div>

        {/* Best pickup */}
        {w.best_pickup && (
          <div className="bg-[#1E293B] rounded-2xl border border-green-500/20 p-5 mb-4">
            <p className="text-xs uppercase tracking-widest text-green-400 mb-2">Best Pickup of the Year</p>
            <p className="text-white font-bold text-lg">{w.best_pickup.name}</p>
            <p className="text-[#94A3B8] text-xs">{w.best_pickup.ktc.toLocaleString()} KTC</p>
          </div>
        )}

        {/* Top assets */}
        {w.top_assets.length > 0 && (
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-5 mb-6">
            <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-3">Top Assets for 2026</p>
            <div className="space-y-2">
              {w.top_assets.slice(0, 3).map((p, i) => (
                <div key={p.name} className="flex items-center gap-2.5">
                  <span className="text-[#475569] text-xs w-4">#{i + 1}</span>
                  <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300'}`}>
                    {p.position}
                  </span>
                  <span className="text-[#CBD5E1] text-sm flex-1">{p.name}</span>
                  <span className="text-[#94A3B8] text-xs">{p.ktc.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center">
          <p className="text-[#94A3B8] text-sm mb-3">Manage your dynasty like a front office</p>
          <Link
            href="/"
            className="inline-block bg-[#6366F1] hover:bg-[#5254cc] text-white font-semibold px-6 py-3 rounded-xl transition text-sm"
          >
            The Front Office →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WrappedPublicPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;
  if (!token) notFound();

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    }>
      <WrappedContent token={token} />
    </Suspense>
  );
}
