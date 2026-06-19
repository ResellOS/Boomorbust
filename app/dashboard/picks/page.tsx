'use client';

import { useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { Sparkles, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  fetchLeagueRosters,
  fetchLeagueUsers,
  fetchTradedPicks,
  type TradedPick,
} from '@/lib/sleeper';
import { analyzePick, type PickQuickAnalysis, type PickInput } from '@/lib/picks/advisor';
import {
  computeTeamNeedsFromRoster,
  inferTeamWindow,
  leaguePickContextForSeason,
  pickProjectedRangeLabel,
  pickVerdict,
  rosterFitCopy,
  type GradeTone,
  type TeamNeedsProfile,
  type TeamWindow,
} from '@/lib/picks/pickAdvisorContext';
import AppBackground from '@/components/AppBackground';

const TIER_STYLES = {
  high: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-[#94A3B8]/10 text-[#94A3B8] border-white/10',
};

const ROUND_BADGE = ['bg-[#6366F1]/20 text-[#6366F1]', 'bg-cyan-500/20 text-cyan-300', 'bg-amber-500/20 text-amber-400'];

const NEED_CHIP: Record<GradeTone, string> = {
  green: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-300',
  cyan: 'border-[#22D3EE]/45 bg-[#22D3EE]/12 text-[#22D3EE]',
  amber: 'border-amber-400/45 bg-amber-500/12 text-amber-200',
  red: 'border-red-400/45 bg-red-500/12 text-red-300',
};

const NEED_INLINE_LETTER: Record<GradeTone, string> = {
  green: 'text-emerald-300',
  cyan: 'text-[#22D3EE]',
  amber: 'text-amber-200',
  red: 'text-red-300',
};

const VERDICT_BADGE: Record<'KEEP' | 'SELL' | 'NEUTRAL', string> = {
  KEEP: 'border-emerald-400/55 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.18)]',
  SELL: 'border-amber-400/55 bg-amber-500/14 text-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.12)]',
  NEUTRAL: 'border-slate-500/45 bg-slate-600/15 text-slate-300',
};

interface PlayerData {
  full_name: string;
  position: string;
  age: number | null;
  injury_status: string | null;
  team?: string | null;
}
type PlayerMap = Record<string, PlayerData>;

interface EnrichedPick {
  raw: TradedPick;
  input: PickInput;
  analysis: PickQuickAnalysis;
  ownerLabel?: string;
}

interface League {
  id: string;
  name: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
}

function slotType(round: number, rosterId: number, totalTeams: number): 'early' | 'mid' | 'late' {
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

function PickCard({
  ep,
  league,
  allPlayers,
  ktcMap,
  needs,
  teamWindow,
  leagueBlurb,
  showOwner,
}: {
  ep: EnrichedPick;
  league: League;
  allPlayers: PlayerMap;
  ktcMap: Record<string, number>;
  needs: TeamNeedsProfile;
  teamWindow: TeamWindow;
  leagueBlurb: { headline: string; detail: string };
  showOwner: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { input, analysis: qa } = ep;
  const roundIdx = Math.min(input.round - 1, 2);
  const badgeClass = ROUND_BADGE[roundIdx];

  const rosterPlayers = useMemo(
    () =>
      Object.entries(allPlayers).map(([, p]) => ({
        full_name: p.full_name,
        position: p.position,
        age: p.age,
        ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
      })),
    [allPlayers, ktcMap],
  );

  const pickBand = pickProjectedRangeLabel(input.round, input.slot_type);
  const fit = rosterFitCopy(needs, input.round);
  const verdict = pickVerdict({
    round: input.round,
    slotType: input.slot_type,
    tier: qa.tier,
    teamWindow,
    needs,
  });

  async function getFullAnalysis() {
    setLoading(true);
    setError(null);

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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full shrink-0', badgeClass)}>R{input.round}</span>
            <h3 className="text-white font-semibold truncate">{qa.pick_label}</h3>
          </div>
          <p className="text-xs text-[#94A3B8]">
            ~{qa.estimated_value.toLocaleString()} KTC · {input.season}
            {ep.raw.roster_id !== ep.raw.owner_id ? ' · Acquired pick' : ''}
            {showOwner && ep.ownerLabel ? ` · ${ep.ownerLabel}` : ''}
          </p>
        </div>
        <span className={clsx('shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border', TIER_STYLES[qa.tier])}>
          {qa.tier_label}
        </span>
      </div>

      <div className={clsx('rounded-xl border px-3 py-2 text-center font-mono text-[11px] font-black tracking-wide', VERDICT_BADGE[verdict])}>
        {verdict === 'KEEP' ? 'KEEP' : verdict === 'SELL' ? 'SELL' : 'NEUTRAL'} ·{' '}
        {teamWindow === 'rebuild'
          ? 'Rebuild window'
          : teamWindow === 'contend'
            ? 'Contention window'
            : 'Balanced roster arc'}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold mb-1">Pick value</p>
          <p className="text-sm text-white font-medium">{pickBand}</p>
          <p className="text-[11px] text-[#94A3B8] mt-1 leading-snug">
            Projected pick range from original slot & round (proxy for team finish / where this selection is likely to land).
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
          <p className="text-[10px] uppercase tracking-widest text-[#64748B] font-semibold mb-1">Roster fit</p>
          <p className="text-[11px] text-[#22D3EE] font-semibold mb-1">
            This pick addresses: {fit.addresses.join(', ')}
          </p>
          <p className="text-xs text-[#CBD5E1] leading-snug">{fit.text}</p>
        </div>
      </div>

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

      <p className="text-sm text-[#CBD5E1]">{qa.roster_context}</p>

      <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-3 py-2.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-indigo-300/90 font-semibold mb-0.5 font-mono">
          LEAGUE CONTEXT
        </p>
        <p className="text-xs text-white font-medium">{leagueBlurb.headline}</p>
        <p className="text-[11px] text-[#94A3B8] mt-1">{leagueBlurb.detail}</p>
      </div>

      {analysis ? (
        <AnalysisText text={analysis} />
      ) : (
        <button
          type="button"
          onClick={getFullAnalysis}
          disabled={loading}
          className={clsx(
            'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition',
            loading
              ? 'border-[#6366F1]/30 text-[#6366F1]/60 cursor-wait'
              : 'border-[#6366F1]/40 text-[#6366F1] hover:bg-[#6366F1]/10',
          )}
        >
          {loading ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-[#6366F1]/30 border-t-[#6366F1] rounded-full animate-spin" />
              Analyzing…
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

function TeamNeedsStrip({ needs }: { needs: TeamNeedsProfile }) {
  const order: Array<'QB' | 'RB' | 'WR' | 'TE'> = ['QB', 'RB', 'WR', 'TE'];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f172a]/80 p-4 md:p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#64748B] font-semibold mb-2">YOUR TEAM NEEDS</p>
      <p className="text-[11px] text-[#94A3B8] mb-3 leading-relaxed">
        Position grades from average dynasty rating on your roster (QB / RB / WR / TE only).
      </p>
      <p className="font-mono text-[13px] font-bold text-[#CBD5E1] mb-4 flex flex-wrap items-center gap-x-1 gap-y-1">
        {order.map((pos, i) => {
          const g = needs.byPos[pos];
          return (
            <span key={pos} className="inline-flex items-center gap-1">
              {i > 0 ? <span className="text-[#475569] font-normal px-0.5">|</span> : null}
              <span className="text-[#94A3B8] font-semibold">{pos}:</span>
              <span className={clsx('tabular-nums', NEED_INLINE_LETTER[g.tone])}>{g.letter}</span>
            </span>
          );
        })}
      </p>
      <div className="flex flex-wrap gap-2">
        {order.map((pos) => {
          const g = needs.byPos[pos];
          return (
            <div
              key={pos}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-xs font-bold',
                NEED_CHIP[g.tone],
              )}
            >
              <span className="text-[#94A3B8]">{pos}</span>
              <span className="tabular-nums">{g.letter}</span>
              <span className="text-[10px] opacity-80 tabular-nums">avg {g.avgTfo.toFixed(1)} rating</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PicksPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [picks, setPicks] = useState<EnrichedPick[]>([]);
  const [allTradedPicks, setAllTradedPicks] = useState<TradedPick[]>([]);
  const [allPlayers, setAllPlayers] = useState<PlayerMap>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [userRosterId, setUserRosterId] = useState<number | null>(null);
  const [pickScope, setPickScope] = useState<'mine' | 'all'>('mine');
  const [teamNeeds, setTeamNeeds] = useState<TeamNeedsProfile | null>(null);

  useEffect(() => {
    async function init() {
      const supabase = createClient();
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
  }, [selectedLeague, pickScope, ktcMap, leagues]);

  async function loadPicks(leagueId: string) {
    const supabase = createClient();
    setLoading(true);
    setPicks([]);
    setAllPlayers({});
    setAllTradedPicks([]);
    setTeamNeeds(null);

    const league = leagues.find((l) => l.id === leagueId);
    if (!league) {
      setLoading(false);
      return;
    }

    const currentYear = new Date().getFullYear();

    const [{ data: auth }, sleeperRosters, users, tradedPicks] = await Promise.all([
      supabase.auth.getUser(),
      fetchLeagueRosters(leagueId),
      fetchLeagueUsers(leagueId),
      fetchTradedPicks(leagueId),
    ]);

    const uid = auth.user?.id;
    const { data: profileRow } =
      uid != null
        ? await supabase.from('profiles').select('sleeper_user_id').eq('id', uid).maybeSingle()
        : { data: null };

    const sleeperUid = profileRow?.sleeper_user_id != null ? String(profileRow.sleeper_user_id) : null;
    const mine = sleeperRosters?.find((r) => r.owner_id != null && String(r.owner_id) === sleeperUid) ?? null;
    const rosterId = mine?.roster_id ?? null;
    setUserRosterId(rosterId);

    const ownerLabelByRosterId = new Map<number, string>();
    for (const r of sleeperRosters ?? []) {
      const u = users?.find((x) => String(x.user_id) === String(r.owner_id));
      const label = u?.display_name?.trim() || u?.username || `Roster ${r.roster_id}`;
      ownerLabelByRosterId.set(r.roster_id, label);
    }

    const playerIds: string[] = (mine?.players ?? []) as string[];
    let players: PlayerMap = {};
    if (playerIds.length) {
      const res = await fetch(`/api/players?ids=${playerIds.slice(0, 100).join(',')}`);
      if (res.ok) players = await res.json();
    }
    setAllPlayers(players);

    const rosterLite = playerIds
      .map((id) => {
        const p = players[id];
        if (!p) return null;
        const pos = (p.position ?? '').toUpperCase();
        if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) return null;
        return {
          player_id: id,
          full_name: p.full_name,
          position: p.position,
          age: p.age,
          team: p.team ?? null,
          ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
        };
      })
      .filter(Boolean) as Array<{
      player_id: string;
      full_name: string;
      position: string;
      age: number | null;
      team: string | null;
      ktc_value: number;
    }>;

    setTeamNeeds(computeTeamNeedsFromRoster(rosterLite));

    const rawTraded = tradedPicks ?? [];
    const future = rawTraded.filter((p) => Number(p.season) >= currentYear);
    setAllTradedPicks(future);

    const scoped =
      pickScope === 'mine'
        ? rosterId != null
          ? future.filter((p) => p.owner_id === rosterId)
          : []
        : future;

    const totalTeams = league.total_rosters ?? 12;

    const rosterPlayersForAdvisor = Object.entries(players).map(([, p]) => ({
      full_name: p.full_name,
      position: p.position,
      age: p.age,
      ktc_value: ktcMap[p.full_name.toLowerCase()] ?? 0,
    }));

    const enriched: EnrichedPick[] = scoped.map((tp) => {
      const slot_type = slotType(tp.round, tp.roster_id, totalTeams);
      const input: PickInput = { season: tp.season, round: tp.round, slot_type };
      const analysisRow = analyzePick(input, rosterPlayersForAdvisor, league);
      return {
        raw: tp,
        input,
        analysis: analysisRow,
        ownerLabel: ownerLabelByRosterId.get(tp.owner_id),
      };
    });

    enriched.sort((a, b) => a.raw.round - b.raw.round || b.analysis.estimated_value - a.analysis.estimated_value);
    setPicks(enriched);
    setLoading(false);
  }

  const selectedLeagueObj = leagues.find((l) => l.id === selectedLeague);

  const teamWindow: TeamWindow | null = useMemo(() => {
    if (!picks.length) return null;
    const qa = picks[0]!.analysis;
    return inferTeamWindow({
      rising: qa.roster_summary.rising,
      declining: qa.roster_summary.declining,
      stable: qa.roster_summary.stable,
      totalKtc: qa.roster_summary.total_ktc,
    });
  }, [picks]);

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Pick Advisor</h1>
            <TrendingUp className="w-5 h-5 text-[#6366F1]" />
          </div>
          <p className="text-xs uppercase tracking-widest text-[#94A3B8]">
            Dynasty Pick Analysis · League & roster context · TFO-weighted needs
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2 flex-1 max-w-md">
            <label htmlFor="pick-league" className="text-[10px] uppercase tracking-widest text-[#64748B] block">
              League
            </label>
            <select
              id="pick-league"
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              className="bg-[#1E293B] border border-white/10 text-white rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#6366F1] w-full"
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-[#64748B] leading-snug">
              Shows future picks for the selected league from Sleeper traded picks. Default view is your portfolio only.
            </p>
          </div>

          <div className="flex rounded-full border border-white/10 bg-black/25 p-1 gap-1 self-start">
            <button
              type="button"
              onClick={() => setPickScope('mine')}
              className={clsx(
                'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition',
                pickScope === 'mine' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-[#94A3B8] hover:text-white',
              )}
            >
              MY PICKS
            </button>
            <button
              type="button"
              onClick={() => setPickScope('all')}
              className={clsx(
                'px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition',
                pickScope === 'all' ? 'bg-[#6366F1] text-white shadow-lg' : 'text-[#94A3B8] hover:text-white',
              )}
            >
              ALL PICKS
            </button>
          </div>
        </div>

        {!loading && teamNeeds && selectedLeagueObj ? <TeamNeedsStrip needs={teamNeeds} /> : null}

        {!loading && teamWindow && selectedLeagueObj ? (
          <p className="text-[11px] text-[#64748B] mt-3 mb-6 font-mono uppercase tracking-wide">
            Arc · {teamWindow === 'rebuild' ? 'Rebuild bias' : teamWindow === 'contend' ? 'Contention bias' : 'Balanced'}{' '}
            (from roster trend + total KTC){userRosterId != null ? ` · Your roster #${userRosterId}` : ''}
          </p>
        ) : null}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PickSkeleton />
            <PickSkeleton />
          </div>
        )}

        {!loading && picks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <svg className="w-12 h-12 text-[#475569]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9" />
              <path d="M9 12h6M12 9v6" />
            </svg>
            <div>
              <p className="text-white font-medium mb-1">No picks in this view</p>
              <p className="text-[#94A3B8] text-sm">
                {selectedLeague
                  ? pickScope === 'mine'
                    ? userRosterId == null
                      ? 'Connect your Sleeper account in settings so we can isolate your picks — or switch to ALL PICKS.'
                      : 'No future picks found for your roster. Try ALL PICKS — or you may have traded them away.'
                    : 'No future traded picks recorded for this league yet.'
                  : 'Select a league to load picks.'}
              </p>
            </div>
          </div>
        )}

        {!loading && picks.length > 0 && selectedLeagueObj && teamNeeds && (
          <>
            <p className="text-xs text-[#94A3B8] mb-4">
              {picks.length} future pick{picks.length !== 1 ? 's' : ''} · {selectedLeagueObj.name}
              {pickScope === 'mine' ? ' · Your portfolio' : ' · Full league ledger'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {picks.map((ep, i) => (
                <PickCard
                  key={`${ep.raw.season}-${ep.raw.round}-${ep.raw.roster_id}-${ep.raw.owner_id}-${i}`}
                  ep={ep}
                  league={selectedLeagueObj}
                  allPlayers={allPlayers}
                  ktcMap={ktcMap}
                  needs={teamNeeds}
                  teamWindow={
                    inferTeamWindow({
                      rising: ep.analysis.roster_summary.rising,
                      declining: ep.analysis.roster_summary.declining,
                      stable: ep.analysis.roster_summary.stable,
                      totalKtc: ep.analysis.roster_summary.total_ktc,
                    })
                  }
                  leagueBlurb={leaguePickContextForSeason(
                    allTradedPicks,
                    ep.raw.season,
                    userRosterId,
                    selectedLeagueObj.total_rosters ?? 12,
                  )}
                  showOwner={pickScope === 'all'}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </AppBackground>
  );
}
