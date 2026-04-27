'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { clsx } from 'clsx';
import { RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { calculatePlayerDynastyScore } from '@/lib/values/engine';
import OpenInSleeper from '@/components/OpenInSleeper';

type TabId = 'roster' | 'transactions' | 'standings';

interface League {
  id: string;
  name: string;
  season: string;
  total_rosters: number | null;
  scoring_settings: Record<string, number> | null;
  status: string | null;
  synced_at: string | null;
}

interface Roster {
  roster_id: number;
  players: string[] | null;
  starters: string[] | null;
  settings: Record<string, number> | null;
}

interface PlayerData {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  injury_status: string | null;
}

interface KTCValue {
  player_name: string;
  ktc_value: number;
}

const POS_ORDER = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'];
const POSITION_COLORS: Record<string, string> = {
  QB: 'bg-purple-500/20 text-purple-300',
  RB: 'bg-green-500/20 text-green-300',
  WR: 'bg-cyan-500/20 text-cyan-300',
  TE: 'bg-amber-500/20 text-amber-300',
  K: 'bg-gray-500/20 text-gray-300',
  DEF: 'bg-red-500/20 text-red-300',
};
const TIER_COLORS = {
  elite: 'text-yellow-400 border-yellow-400/30',
  solid: 'text-[#6366F1] border-[#6366F1]/30',
  depth: 'text-[#94A3B8] border-white/10',
  stash: 'text-[#475569] border-white/5',
};
const TREND_ICONS = { rising: '↑', stable: '→', declining: '↓' };
const TREND_COLORS = { rising: 'text-green-400', stable: 'text-[#94A3B8]', declining: 'text-red-400' };

function getScoringFormat(settings: Record<string, number> | null): string {
  if (!settings) return 'Standard';
  if ((settings.rec ?? 0) >= 1) return 'PPR';
  if ((settings.rec ?? 0) >= 0.5) return '0.5 PPR';
  return 'Standard';
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'roster', label: 'Your Roster' },
  { id: 'transactions', label: 'Recent Transactions' },
  { id: 'standings', label: 'Standings' },
];

export default function LeaguePage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabId>('roster');
  const [league, setLeague] = useState<League | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [players, setPlayers] = useState<Record<string, PlayerData>>({});
  const [ktcValues, setKtcValues] = useState<KTCValue[]>([]);
  const [transactions, setTransactions] = useState<Record<string, unknown>[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ data: lg }, { data: rs }, ktcRes] = await Promise.all([
        supabase.from('leagues').select('*').eq('id', id).single(),
        supabase.from('rosters').select('*').eq('league_id', id).limit(1).single(),
        fetch('/api/values'),
      ]);

      setLeague(lg);
      setRoster(rs);

      const ktc: KTCValue[] = ktcRes.ok ? await ktcRes.json() : [];
      setKtcValues(ktc);

      const allIds = [...(rs?.players ?? []), ...(rs?.starters ?? [])];
      const uniqueIds = Array.from(new Set(allIds)).slice(0, 100);
      if (uniqueIds.length) {
        const res = await fetch(`/api/players?ids=${uniqueIds.join(',')}`);
        if (res.ok) setPlayers(await res.json());
      }

      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (tab !== 'transactions') return;
    async function loadTx() {
      const results: Record<string, unknown>[] = [];
      for (let week = 1; week <= 5; week++) {
        try {
          const res = await fetch(`https://api.sleeper.app/v1/league/${id}/transactions/${week}`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) results.push(...data);
          }
        } catch {}
      }
      setTransactions(results.sort((a, b) => Number(b.created ?? 0) - Number(a.created ?? 0)));
    }
    loadTx();
  }, [tab, id]);

  async function handleSync() {
    setSyncing(true);
    await fetch('/api/sync', { method: 'POST' });
    setSyncing(false);
    window.location.reload();
  }

  const ktcMap = Object.fromEntries(ktcValues.map((v) => [v.player_name.toLowerCase(), v.ktc_value]));

  function getKTC(playerName: string): number {
    return ktcMap[playerName.toLowerCase()] ?? 0;
  }

  const starters = roster?.starters ?? [];
  const allPlayers = (roster?.players ?? []).filter((id) => !starters.includes(id));
  const irSlot = roster?.settings?.ir_slots ?? 0;
  const irPlayers = irSlot > 0 ? allPlayers.slice(-irSlot) : [];
  const taxiSlot = (roster?.settings as Record<string, number> | null)?.taxi_slots ?? 0;
  const taxiPlayers = taxiSlot > 0 ? allPlayers.slice(-(irSlot + taxiSlot), -irSlot || undefined) : [];
  const benchPlayers = allPlayers.slice(0, allPlayers.length - irSlot - taxiSlot);

  function PlayerRow({ playerId, label }: { playerId: string; label?: string }) {
    const p = players[playerId];
    if (!p) return (
      <div className="flex items-center gap-3 py-2 px-3 rounded-lg">
        <span className="text-[#94A3B8] text-sm">{playerId}</span>
      </div>
    );

    const ktcVal = getKTC(p.full_name);
    const score = ktcVal ? calculatePlayerDynastyScore(p, ktcVal) : null;
    const injuryStatus = p.injury_status?.toUpperCase();
    const isExpanded = expandedWhy === playerId;

    return (
      <div className={clsx('flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm hover:bg-white/5 group')}>
        <span className={clsx('text-xs font-semibold px-1.5 py-0.5 rounded shrink-0 w-10 text-center', POSITION_COLORS[p.position] ?? 'bg-gray-500/20 text-gray-300')}>
          {p.position}
        </span>
        <span className="text-white flex-1 truncate">{p.full_name}</span>
        {p.team && <span className="text-[#94A3B8] text-xs shrink-0">{p.team}</span>}
        {p.age && <span className="text-[#94A3B8] text-xs shrink-0 hidden sm:block">{p.age}y</span>}
        {score ? (
          <>
            <span className={clsx('text-xs border px-1.5 py-0.5 rounded shrink-0', TIER_COLORS[score.tier])}>
              {score.value.toLocaleString()}
            </span>
            <button
              title={score.age_curve_note}
              onClick={() => setExpandedWhy(isExpanded ? null : playerId)}
              className={clsx('text-sm shrink-0', TREND_COLORS[score.trend])}
            >
              {TREND_ICONS[score.trend]}
            </button>
          </>
        ) : (
          <span className="text-[#475569] text-xs shrink-0">—</span>
        )}
        {injuryStatus && ['Q', 'D', 'O'].includes(injuryStatus) && (
          <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded shrink-0', {
            'bg-yellow-500/20 text-yellow-400': injuryStatus === 'Q',
            'bg-orange-500/20 text-orange-400': injuryStatus === 'D',
            'bg-red-500/20 text-red-400': injuryStatus === 'O',
          })}>
            {injuryStatus}
          </span>
        )}
        {label && <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded shrink-0', label === 'IR' ? 'bg-red-600/30 text-red-400' : 'bg-blue-500/20 text-blue-300')}>{label}</span>}
        {isExpanded && score && (
          <div className="col-span-full mt-1 text-xs text-[#94A3B8] italic">{score.age_curve_note}</div>
        )}
      </div>
    );
  }

  const sortedByPosition = (ids: string[]) =>
    [...ids].sort((a, b) => {
      const pa = POS_ORDER.indexOf(players[a]?.position ?? '');
      const pb = POS_ORDER.indexOf(players[b]?.position ?? '');
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });

  if (loading) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="h-8 w-64 shimmer rounded mb-2" />
        <div className="h-4 w-40 shimmer rounded mb-8" />
        <div className="h-96 shimmer rounded-2xl" />
      </main>
    );
  }

  if (!league) {
    return <main className="max-w-5xl mx-auto px-6 py-10"><p className="text-[#94A3B8]">League not found.</p></main>;
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{league.name}</h1>
            <span className="bg-[#6366F1]/20 text-[#6366F1] text-xs font-semibold px-2.5 py-1 rounded-full">
              {getScoringFormat(league.scoring_settings)}
            </span>
            {league.total_rosters && (
              <span className="text-[#94A3B8] text-sm">{league.total_rosters} teams</span>
            )}
          </div>
          <p className="text-xs text-[#94A3B8]">Last synced {timeAgo(league.synced_at)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OpenInSleeper leagueId={league.id} variant="button" />
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 text-sm text-[#94A3B8] hover:text-white border border-white/10 hover:border-white/30 px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          >
            <RefreshCw className={clsx('w-4 h-4', syncing && 'animate-spin')} />
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-6 gap-6">
        {TABS.map(({ id: tabId, label }) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            className={clsx(
              'pb-3 text-sm font-medium border-b-2 transition-colors',
              tab === tabId
                ? 'border-[#6366F1] text-white'
                : 'border-transparent text-[#94A3B8] hover:text-white'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Roster tab */}
      {tab === 'roster' && (
        <div className="space-y-6">
          <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-[#94A3B8]">Starters</span>
              <div className="flex items-center gap-3 text-xs text-[#94A3B8]">
                <span>KTC</span><span>Trend</span>
              </div>
            </div>
            {sortedByPosition(starters).map((pid, i) => (
              <div key={pid} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                <PlayerRow playerId={pid} />
              </div>
            ))}
          </div>

          {benchPlayers.length > 0 && (
            <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-xs uppercase tracking-widest text-[#94A3B8]">Bench</span>
              </div>
              {sortedByPosition(benchPlayers).map((pid, i) => (
                <div key={pid} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <PlayerRow playerId={pid} />
                </div>
              ))}
            </div>
          )}

          {taxiPlayers.length > 0 && (
            <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-xs uppercase tracking-widest text-[#94A3B8]">Taxi Squad</span>
              </div>
              {taxiPlayers.map((pid, i) => (
                <div key={pid} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <PlayerRow playerId={pid} label="TAXI" />
                </div>
              ))}
            </div>
          )}

          {irPlayers.length > 0 && (
            <div className="bg-[#1E293B] rounded-2xl border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <span className="text-xs uppercase tracking-widest text-[#94A3B8]">Injured Reserve</span>
              </div>
              {irPlayers.map((pid, i) => (
                <div key={pid} className={i % 2 === 1 ? 'bg-white/[0.02]' : ''}>
                  <PlayerRow playerId={pid} label="IR" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions tab */}
      {tab === 'transactions' && (
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-16 text-[#94A3B8]">No transactions found for weeks 1–5.</div>
          ) : (
            transactions.slice(0, 50).map((tx) => {
              const type = String(tx.type ?? '').toUpperCase();
              const adds = Object.keys((tx.adds as Record<string, unknown>) ?? {});
              const drops = Object.keys((tx.drops as Record<string, unknown>) ?? {});
              const date = tx.created ? new Date(Number(tx.created)).toLocaleDateString() : '';
              const typeColor = type === 'TRADE' ? 'bg-[#6366F1]/20 text-[#6366F1]' : type === 'FREE_AGENT' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400';
              return (
                <div key={String(tx.transaction_id)} className="bg-[#1E293B] border border-white/5 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded shrink-0 mt-0.5', typeColor)}>
                    {type === 'FREE_AGENT' ? 'ADD' : type === 'WAIVER' ? 'WAIVER' : 'TRADE'}
                  </span>
                  <div className="flex-1 text-sm text-[#CBD5E1]">
                    {adds.length > 0 && <span className="text-green-400">+ {adds.map((id) => players[id]?.full_name ?? id).join(', ')} </span>}
                    {drops.length > 0 && <span className="text-red-400">− {drops.map((id) => players[id]?.full_name ?? id).join(', ')}</span>}
                  </div>
                  <span className="text-xs text-[#94A3B8] shrink-0">{date}</span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Standings tab */}
      {tab === 'standings' && (
        <div className="text-center py-20">
          <p className="text-[#94A3B8]">Standings coming in Sprint 3.</p>
        </div>
      )}
    </main>
  );
}
