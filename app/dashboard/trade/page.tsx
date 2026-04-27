'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { X, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { analyzeTradeOffer, type TradeAnalysis } from '@/lib/values/engine';
import { usePreferences } from '@/store/preferences';
import type { KTCPlayer } from '@/lib/values/ktc';

const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  K: 'bg-gray-500/20 text-gray-300',
};

function DimensionBar({ label, score, note }: { label: string; score: number; note: string }) {
  const width = Math.abs(score);
  const positive = score >= 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#94A3B8]">{label}</span>
        <span className={clsx('font-semibold', positive ? 'text-green-400' : 'text-red-400')}>
          {positive ? '+' : ''}{score}
        </span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', positive ? 'bg-green-400' : 'bg-red-400')}
          style={{ width: `${width}%`, marginLeft: positive ? '50%' : `${50 - width}%` }}
        />
      </div>
      <p className="text-xs text-[#94A3B8]">{note}</p>
    </div>
  );
}

interface TradePlayer {
  id: string;
  name: string;
  position: string;
  age: number | null;
  ktc_value: number;
}

function TradePage() {
  const [ktcPlayers, setKtcPlayers] = useState<KTCPlayer[]>([]);
  const [leagues, setLeagues] = useState<{ id: string; name: string; scoring_settings: Record<string, number> | null }[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [giving, setGiving] = useState<TradePlayer[]>([]);
  const [receiving, setReceiving] = useState<TradePlayer[]>([]);
  const [search, setSearch] = useState({ giving: '', receiving: '' });
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const { riskTolerance } = usePreferences();
  const supabase = createClient();
  const searchParams = useSearchParams();

  useEffect(() => {
    Promise.all([
      fetch('/api/values').then((r) => r.json()),
      supabase.from('leagues').select('id, name, scoring_settings'),
    ]).then(([values, { data }]) => {
      setKtcPlayers(values);
      setLeagues(data ?? []);
      if (data?.length) setSelectedLeague(data[0].id);

      // Pre-populate from Trade Finder URL params
      const givingName = searchParams.get('giving');
      const receivingName = searchParams.get('receiving');
      if (givingName) {
        const match = (values as KTCPlayer[]).find((p: KTCPlayer) =>
          p.player_name.toLowerCase().includes(givingName.toLowerCase())
        );
        if (match) {
          const tp: TradePlayer = { id: match.slug || match.player_name, name: match.player_name, position: match.position, age: match.age, ktc_value: match.ktc_value };
          setGiving([tp]);
        }
      }
      if (receivingName) {
        const match = (values as KTCPlayer[]).find((p: KTCPlayer) =>
          p.player_name.toLowerCase().includes(receivingName.toLowerCase())
        );
        if (match) {
          const tp: TradePlayer = { id: match.slug || match.player_name, name: match.player_name, position: match.position, age: match.age, ktc_value: match.ktc_value };
          setReceiving([tp]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPlayer(side: 'giving' | 'receiving', player: KTCPlayer) {
    const tp: TradePlayer = { id: player.slug || player.player_name, name: player.player_name, position: player.position, age: player.age, ktc_value: player.ktc_value };
    if (side === 'giving') setGiving((prev) => [...prev, tp]);
    else setReceiving((prev) => [...prev, tp]);
    setSearch((s) => ({ ...s, [side]: '' }));
  }

  function removePlayer(side: 'giving' | 'receiving', id: string) {
    if (side === 'giving') setGiving((prev) => prev.filter((p) => p.id !== id));
    else setReceiving((prev) => prev.filter((p) => p.id !== id));
  }

  function analyze() {
    const league = leagues.find((l) => l.id === selectedLeague);
    const rec = (league?.scoring_settings?.rec ?? 0);
    const format = rec >= 1 ? 'PPR' : rec >= 0.5 ? '0.5 PPR' : 'Standard';
    const result = analyzeTradeOffer(
      { players: giving },
      { players: receiving },
      { positions: {}, scoringFormat: format, riskTolerance }
    );
    setAnalysis(result);
    setWhyOpen(false);
  }

  const VERDICT_STYLES = {
    ACCEPT: 'bg-green-500/20 text-green-400 border-green-500/30',
    FAIR: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    DECLINE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  function SearchDropdown({ side }: { side: 'giving' | 'receiving' }) {
    const val = search[side];
    const results = val.length >= 2
      ? ktcPlayers.filter((p) => p.player_name.toLowerCase().includes(val.toLowerCase())).slice(0, 8)
      : [];
    return (
      <div className="relative">
        <input
          value={val}
          onChange={(e) => setSearch((s) => ({ ...s, [side]: e.target.value }))}
          placeholder="Search player..."
          className="w-full bg-[#0F172A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#6366F1]"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 top-full left-0 right-0 mt-1 bg-[#1E293B] border border-white/10 rounded-lg shadow-xl overflow-hidden">
            {results.map((p) => (
              <li key={p.player_name}>
                <button
                  onClick={() => addPlayer(side, p)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/5 text-left"
                >
                  <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded shrink-0', POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300')}>
                    {p.position}
                  </span>
                  <span className="text-[#CBD5E1] flex-1 truncate">{p.player_name}</span>
                  <span className="text-[#94A3B8] text-xs">{p.ktc_value.toLocaleString()}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function TradeSidePanel({ side, players }: { side: 'giving' | 'receiving'; players: TradePlayer[] }) {
    const total = players.reduce((s, p) => s + p.ktc_value, 0);
    return (
      <div className="flex-1 bg-[#1E293B] rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8]">
            {side === 'giving' ? 'You Give' : 'You Receive'}
          </p>
          {players.length > 0 && (
            <span className="text-sm text-[#CBD5E1] font-semibold">{total.toLocaleString()} KTC</span>
          )}
        </div>
        <SearchDropdown side={side} />
        <ul className="space-y-2">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded shrink-0', POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300')}>
                {p.position}
              </span>
              <span className="text-[#CBD5E1] flex-1 truncate">{p.name}</span>
              <span className="text-[#94A3B8] text-xs">{p.ktc_value.toLocaleString()}</span>
              <button onClick={() => removePlayer(side, p.id)} className="text-[#475569] hover:text-red-400 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
        {players.length === 0 && (
          <p className="text-[#475569] text-sm text-center py-4">Add players above</p>
        )}
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Trade Analyzer</h1>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">KTC-Powered Dynasty Analysis</p>
      </div>

      {/* League selector */}
      <div className="mb-6">
        <label className="text-xs text-[#94A3B8] mb-1.5 block">League context</label>
        <select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-[#1E293B] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] w-full max-w-sm"
        >
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {/* Trade builder */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-stretch">
        <TradeSidePanel side="giving" players={giving} />
        <div className="flex items-center justify-center">
          <ArrowLeftRight className="w-6 h-6 text-[#475569]" />
        </div>
        <TradeSidePanel side="receiving" players={receiving} />
      </div>

      <button
        onClick={analyze}
        disabled={!giving.length || !receiving.length}
        className="w-full bg-[#6366F1] hover:bg-[#6366F1]/90 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition mb-8"
      >
        Analyze Trade
      </button>

      {/* Results */}
      {analysis && (
        <div className="space-y-4 fade-in">
          {/* Verdict */}
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 flex items-center gap-4">
            <span className={clsx('text-2xl font-bold px-5 py-2 rounded-xl border', VERDICT_STYLES[analysis.verdict])}>
              {analysis.verdict}
            </span>
            <div>
              <p className="text-white font-semibold">
                {analysis.value_delta >= 0 ? `+${analysis.value_delta}` : analysis.value_delta} KTC value {analysis.value_delta >= 0 ? 'in your favor' : 'against you'}
              </p>
              <p className="text-[#94A3B8] text-sm">
                {analysis.value_delta >= 0 ? 'You gain value on this deal' : 'You give up value on this deal'}
              </p>
            </div>
          </div>

          {/* Dimension bars */}
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 space-y-5">
            <p className="text-xs uppercase tracking-widest text-[#94A3B8] mb-2">Analysis Breakdown</p>
            <DimensionBar label="Current Value" score={analysis.dimensions.current_value.score} note={analysis.dimensions.current_value.note} />
            <DimensionBar label="Future Value" score={analysis.dimensions.future_value.score} note={analysis.dimensions.future_value.note} />
            <DimensionBar label="Positional Need" score={analysis.dimensions.positional_need.score} note={analysis.dimensions.positional_need.note} />
            <DimensionBar label="Age Curve" score={analysis.dimensions.age_curve.score} note={analysis.dimensions.age_curve.note} />
          </div>

          {/* Explanation */}
          <div className="bg-[#1A2332] border border-[#6366F1]/20 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-[#6366F1] mb-3">Coach&apos;s Note</p>
            <p className="text-[#CBD5E1] text-sm leading-relaxed">{analysis.explanation}</p>
          </div>

          {/* Why expandable */}
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
            <button
              onClick={() => setWhyOpen(!whyOpen)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm text-[#CBD5E1] hover:bg-white/5 transition"
            >
              <span className="font-medium">Why this verdict?</span>
              {whyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {whyOpen && (
              <ul className="px-6 pb-5 space-y-2.5 border-t border-white/5 pt-4">
                {analysis.why_bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-[#CBD5E1]">
                    <span className="text-[#6366F1] mt-0.5 shrink-0">•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function TradePageWrapper() {
  return (
    <Suspense>
      <TradePage />
    </Suspense>
  );
}
