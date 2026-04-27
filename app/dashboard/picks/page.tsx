'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import { Sparkles, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchTradedPicks, type TradedPick } from '@/lib/sleeper';
import { analyzePick, type PickQuickAnalysis, type PickInput } from '@/lib/picks/advisor';

const TIER_STYLES = {
  high:   'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low:    'bg-[#94A3B8]/10 text-[#94A3B8] border-white/10',
};

const ROUND_BADGE = ['bg-[#6366F1]/20 text-[#6366F1]', 'bg-cyan-500/20 text-cyan-300', 'bg-amber-500/20 text-amber-400'];

interface PlayerData {
  full_name: string;
  position: string;
  age: number | null;
  injury_status: string | null;
}
type PlayerMap = Record<string, PlayerData>;

interface EnrichedPick {
  raw: TradedPick;
  input: PickInput;
  analysis: PickQuickAnalysis;
}

interface League {
  id: string;
  name: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

function slotType(round: number, rosterId: number, totalTeams: number): 'early' | 'mid' | 'late' {
  // Without known draft order, approximate by roster_id as a proxy
  const third = Math.ceil(totalTeams / 3);
  const pos = ((rosterId - 1) % totalTeams) + 1;
  if (pos <= third) return 'early';
  if (pos <= third * 2) return 'mid';
  return 'late';
}

function PickSkeleton() {
  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-6 w-48 shimmer rounded" />
        <div className="h-6 w-20 shimmer rounded-full" />
      </div>
      <div className="h-4 w-full shimmer rounded" />
      <div className="h-4 w-3/4 shimmer rounded" />
      <div className="h-9 w-36 shimmer rounded-lg" />
    </div>
  );
}

function AnalysisText({ text }: { text: string }) {
  // Render bolded **section** headers
  const lines = text.split('\n').filter(Boolean);
  return (
    <div className="mt-4 pt-4 border-t border-white/10 space-y-3 fade-in text-sm text-[#CBD5E1] leading-relaxed">
      {lines.map((line, i) => {
        if (/^\*\*.*\*\*$/.test(line.trim())) {
          return (
            <p key={i} className="text-white font-semibold text-xs uppercase tracking-widest mt-4 first:mt-0">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }
        return <p key={i}>{line.replace(/\*\*/g, '')}</p>;
      })}
    </div>
  );
}

function PickCard({ ep, league, allPlayers, ktcMap }: {
  ep: EnrichedPick;
  league: League;
  allPlayers: PlayerMap;
  ktcMap: Record<string, number>;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { input, analysis: qa } = ep;
  const roundIdx = Math.min(input.round - 1, 2);
  const badgeClass = ROUND_BADGE[roundIdx];

  async function getFullAnalysis() {
    setLoading(true);
    setError(null);

    // Build roster players with KTC values
    const rosterPlayers = Object.entries(allPlayers).map(([, p]) => ({
      full_name: p.full_name,
      position: p.position,
      age: p.age,
      ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
    }));

    try {
      const res = await fetch('/api/picks/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pick: input, rosterPlayers, league, quickAnalysis: qa }),
      });
      const data = await res.json();
      if (data.error) setError(data.error);
      else setAnalysis(data.analysis);
    } catch {
      setError('Request failed. Check your ANTHROPIC_API_KEY.');
    }
    setLoading(false);
  }

  return (
    <div className="bg-[#1E293B] rounded-2xl border border-white/5 hover:border-white/10 transition-colors p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full', badgeClass)}>
              R{input.round}
            </span>
            <h3 className="text-white font-semibold">{qa.pick_label}</h3>
          </div>
          <p className="text-xs text-[#94A3B8]">
            ~{qa.estimated_value.toLocaleString()} KTC · {input.season}
            {ep.raw.roster_id !== ep.raw.owner_id && ' · Acquired pick'}
          </p>
        </div>
        <span className={clsx('shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border', TIER_STYLES[qa.tier])}>
          {qa.tier_label}
        </span>
      </div>

      {/* Roster trend dots */}
      <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          {qa.roster_summary.rising} rising
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#94A3B8] inline-block" />
          {qa.roster_summary.stable} stable
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
          {qa.roster_summary.declining} declining
        </span>
      </div>

      {/* Roster context */}
      <p className="text-sm text-[#CBD5E1]">{qa.roster_context}</p>

      {/* Full analysis section */}
      {analysis ? (
        <AnalysisText text={analysis} />
      ) : (
        <button
          onClick={getFullAnalysis}
          disabled={loading}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition',
            loading
              ? 'border-[#6366F1]/30 text-[#6366F1]/60 cursor-wait'
              : 'border-[#6366F1]/40 text-[#6366F1] hover:bg-[#6366F1]/10'
          )}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#6366F1]/30 border-t-[#6366F1] rounded-full animate-spin" />
              Analyzing with Claude...
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              Get full analysis
            </>
          )}
        </button>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}

export default function PicksPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [picks, setPicks] = useState<EnrichedPick[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerMap>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [userRosterId, setUserRosterId] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const [{ data: lgs }, ktcRes] = await Promise.all([
        supabase.from('leagues').select('id, name, total_rosters, scoring_settings'),
        fetch('/api/values'),
      ]);
      setLeagues(lgs ?? []);
      if (lgs?.length) setSelectedLeague(lgs[0].id);

      if (ktcRes.ok) {
        const ktcData: { player_name: string; ktc_value: number }[] = await ktcRes.json();
        const map: Record<string, number> = {};
        for (const p of ktcData) map[p.player_name.toLowerCase()] = p.ktc_value;
        setKtcMap(map);
      }
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedLeague) return;
    loadPicks(selectedLeague);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeague]);

  async function loadPicks(leagueId: string) {
    setLoading(true);
    setPicks([]);
    setAllPlayers({});

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) { setLoading(false); return; }

    // Get user's roster
    const { data: roster } = await supabase
      .from('rosters')
      .select('roster_id, players')
      .eq('league_id', leagueId)
      .limit(1)
      .single();

    const rosterId: number = roster?.roster_id ?? 0;
    setUserRosterId(rosterId);

    // Enrich roster players
    const playerIds: string[] = (roster?.players ?? []) as string[];
    let players: PlayerMap = {};
    if (playerIds.length) {
      const res = await fetch(`/api/players?ids=${playerIds.slice(0, 100).join(',')}`);
      if (res.ok) players = await res.json();
    }
    setAllPlayers(players);

    const rosterPlayers = Object.entries(players).map(([, p]) => ({
      full_name: p.full_name,
      position: p.position,
      age: p.age,
      ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
    }));

    // Fetch traded picks
    const tradedPicks = await fetchTradedPicks(leagueId);
    const myPicks = (tradedPicks ?? []).filter(
      (p) => p.owner_id === rosterId && Number(p.season) >= new Date().getFullYear()
    );

    const totalTeams = league.total_rosters ?? 12;
    const enriched: EnrichedPick[] = myPicks.map((tp) => {
      const slot_type = slotType(tp.round, tp.roster_id, totalTeams);
      const input: PickInput = { season: tp.season, round: tp.round, slot_type };
      const analysis = analyzePick(input, rosterPlayers, league);
      return { raw: tp, input, analysis };
    });

    // Sort: earliest round first, then by value descending
    enriched.sort((a, b) => a.raw.round - b.raw.round || b.analysis.estimated_value - a.analysis.estimated_value);
    setPicks(enriched);
    setLoading(false);
  }

  const selectedLeagueObj = leagues.find((l) => l.id === selectedLeague);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Pick Advisor</h1>
          <TrendingUp className="w-5 h-5 text-[#6366F1]" />
        </div>
        <p className="text-xs uppercase tracking-widest text-[#94A3B8]">
          Dynasty Pick Analysis · Powered by Claude AI
        </p>
      </div>

      {/* League selector */}
      <div className="mb-8">
        <select
          value={selectedLeague}
          onChange={(e) => setSelectedLeague(e.target.value)}
          className="bg-[#1E293B] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] w-full max-w-sm"
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PickSkeleton />
          <PickSkeleton />
        </div>
      )}

      {/* Empty state */}
      {!loading && picks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <svg className="w-12 h-12 text-[#475569]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 12h6M12 9v6" />
          </svg>
          <div>
            <p className="text-white font-medium mb-1">No future picks found</p>
            <p className="text-[#94A3B8] text-sm">
              {selectedLeague
                ? 'No future picks in this league. You may have traded them all away, or none have been moved yet.'
                : 'Select a league to view your picks.'}
            </p>
          </div>
        </div>
      )}

      {/* Pick grid */}
      {!loading && picks.length > 0 && selectedLeagueObj && (
        <>
          <p className="text-xs text-[#94A3B8] mb-4">
            {picks.length} future pick{picks.length !== 1 ? 's' : ''} in {selectedLeagueObj.name}
            {userRosterId ? ` · Roster #${userRosterId}` : ''}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {picks.map((ep, i) => (
              <PickCard
                key={`${ep.raw.season}-${ep.raw.round}-${ep.raw.roster_id}-${i}`}
                ep={ep}
                league={selectedLeagueObj}
                allPlayers={allPlayers}
                ktcMap={ktcMap}
              />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
