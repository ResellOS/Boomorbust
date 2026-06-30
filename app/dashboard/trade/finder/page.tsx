'use client';

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { clsx } from 'clsx';
import { ArrowLeftRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AppBackground from '@/components/AppBackground';
import PlayerAvatar from '@/components/PlayerAvatar';
import TfoTradeCard from '@/components/trade/TfoTradeCard';
import { buildManagerProfile } from '@/lib/managers/analyzer';
import type { ManagerArchetype } from '@/lib/managers/analyzer';
import { scoreRoster, type PlayerMap, type RosterStrength } from '@/lib/trade/finder';
import type { SleeperTransaction } from '@/lib/sleeper';
import type { PlayerSummary } from '@/lib/sleeper/players';

const BBST_PREFILL_KEY = 'bbst_trade_prefill';
const KEY_POS = new Set(['QB', 'RB', 'WR', 'TE']);

interface LeagueRosterPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  ktc: number;
}

interface LeagueManagerRoster {
  roster_id: number;
  owner_id: string | null;
  username: string | null;
  display_name: string | null;
  team_name: string | null;
  players: LeagueRosterPlayer[];
}

interface BbstContextResponse {
  transactions: SleeperTransaction[];
  users: Array<{ user_id: string; username: string; display_name: string; avatar: string | null }>;
  txPlayers: Record<string, { full_name: string; position: string; age: number | null }>;
  ktcByNameLower: Record<string, number>;
  weeksFetched: number[];
}

type BBSTArchetypeLabel = 'NAME BUYER' | 'VALUE HUNTER' | 'CONTENDER' | 'REBUILDER' | 'HOARDER';

type BbstVerdict = 'SEND IT' | 'NEGOTIATE' | 'SKIP';

const SELECT_STYLE: CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.12)',
  color: '#fff',
  fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
  fontSize: 13,
  padding: '10px 14px',
  borderRadius: 8,
  width: '100%',
};

const POS_TAB = ['ALL', 'QB', 'RB', 'WR', 'TE'] as const;

const ARCHETYPE_BADGE: Record<BBSTArchetypeLabel, string> = {
  'NAME BUYER': 'bg-violet-500/18 text-violet-200 border-violet-400/35',
  'VALUE HUNTER': 'bg-cyan-500/18 text-cyan-200 border-cyan-400/35',
  CONTENDER: 'bg-emerald-500/18 text-emerald-200 border-emerald-400/35',
  REBUILDER: 'bg-orange-500/18 text-orange-200 border-orange-400/35',
  HOARDER: 'bg-slate-500/18 text-slate-300 border-slate-500/35',
};

const VERDICT_STYLE: Record<BbstVerdict, string> = {
  'SEND IT': 'bg-emerald-500/22 text-emerald-300 border-emerald-400/45',
  NEGOTIATE: 'bg-amber-500/18 text-amber-200 border-amber-400/40',
  SKIP: 'bg-white/6 text-[#94A3B8] border-white/12',
};

function mapInternalArchetype(a: ManagerArchetype): BBSTArchetypeLabel {
  switch (a) {
    case 'wheeler_dealer':
      return 'NAME BUYER';
    case 'balanced':
      return 'VALUE HUNTER';
    case 'contender':
      return 'CONTENDER';
    case 'rebuilder':
      return 'REBUILDER';
    case 'hoarder':
      return 'HOARDER';
    default:
      return 'VALUE HUNTER';
  }
}

function deriveStyleTags(p: ReturnType<typeof buildManagerProfile>): string[] {
  const tags: string[] = [];
  const buys = Object.entries(p.buys_position).sort((a, b) => b[1] - a[1]);
  if (buys[0] && buys[0][1] >= 2) tags.push(`Targets ${buys[0][0]}s`);
  if (p.adds_picks >= 2) tags.push('Trades picks');
  if (p.sells_picks >= 2) tags.push('Moves picks out');
  if (p.avg_buy_age != null && p.avg_buy_age >= 27 && p.avg_sell_age != null && p.avg_sell_age <= 25) {
    tags.push('Vets in, youth out');
  }
  if (p.archetype === 'contender') tags.push('Stars over futures');
  if (p.trade_frequency === 'active') tags.push('High inbox volume');
  return tags.slice(0, 5);
}

function tradeValueNet(
  tx: SleeperTransaction,
  rosterId: number,
  lookup: Record<string, PlayerSummary>,
  ktcByName: Record<string, number>,
): number {
  let gain = 0;
  let loss = 0;
  if (tx.adds) {
    for (const [pid, rid] of Object.entries(tx.adds)) {
      if (rid !== rosterId) continue;
      const nm = lookup[pid]?.full_name?.toLowerCase();
      if (nm) gain += ktcByName[nm] ?? 0;
    }
  }
  if (tx.drops) {
    for (const [pid, rid] of Object.entries(tx.drops)) {
      if (rid !== rosterId) continue;
      const nm = lookup[pid]?.full_name?.toLowerCase();
      if (nm) loss += ktcByName[nm] ?? 0;
    }
  }
  return gain - loss;
}

function summarizeTradeLine(
  tx: SleeperTransaction,
  rosterId: number,
  lookup: Record<string, PlayerSummary>,
  ktcByName: Record<string, number>,
): { summary: string; valueNote: string } {
  const ins: string[] = [];
  const outs: string[] = [];
  if (tx.adds) {
    for (const [pid, rid] of Object.entries(tx.adds)) {
      if (rid !== rosterId) continue;
      const name = lookup[pid]?.full_name;
      if (name) ins.push(name);
    }
  }
  if (tx.drops) {
    for (const [pid, rid] of Object.entries(tx.drops)) {
      if (rid !== rosterId) continue;
      const name = lookup[pid]?.full_name;
      if (name) outs.push(name);
    }
  }
  const net = tradeValueNet(tx, rosterId, lookup, ktcByName);
  let valueNote = 'Rough neutral book';
  if (net > 450) valueNote = `Rough +${Math.round(net / 50) * 50} KTC`;
  else if (net < -450) valueNote = `Rough ${Math.round(net / 50) * 50} KTC`;
  const summary = `In: ${ins.slice(0, 4).join(', ') || '—'} · Out: ${outs.slice(0, 4).join(', ') || '—'}`;
  return { summary, valueNote };
}

function pickTheirCounterAsset(
  shop: LeagueRosterPlayer,
  theirRoster: LeagueManagerRoster,
  userStrength: RosterStrength,
  theirStrength: RosterStrength,
): LeagueRosterPlayer | null {
  const candidates = theirRoster.players.filter((p) => KEY_POS.has(p.position));
  if (!candidates.length) return null;

  let best: LeagueRosterPlayer | null = null;
  let bestScore = -Infinity;

  for (const p of candidates) {
    let s = 0;
    if (userStrength.weak_positions.includes(p.position)) s += 42;
    if (theirStrength.strong_positions.includes(p.position)) s += 28;
    if (theirStrength.weak_positions.includes(p.position)) s -= 18;
    const gap = Math.abs(p.ktc - shop.ktc);
    s -= gap / 420;
    if (s > bestScore) {
      bestScore = s;
      best = p;
    }
  }
  return best;
}

function bbstVerdict(
  shop: LeagueRosterPlayer,
  theirGive: LeagueRosterPlayer,
  theirStrength: RosterStrength,
): BbstVerdict {
  const net = theirGive.ktc - shop.ktc;
  const posScore = theirStrength.position_scores[shop.position];
  const theyLeanNeed =
    theirStrength.weak_positions.includes(shop.position) || posScore?.deficit === true;

  if (net >= 250 && theyLeanNeed) return 'SEND IT';
  if (net <= -900) return 'SKIP';
  if (!theyLeanNeed && net < -150) return 'SKIP';
  if (net >= 400 && !theyLeanNeed) return 'NEGOTIATE';
  return 'NEGOTIATE';
}

function empireImpact(netKtc: number): 'UP' | 'NEUTRAL' | 'DOWN' {
  if (netKtc > 180) return 'UP';
  if (netKtc < -180) return 'DOWN';
  return 'NEUTRAL';
}

export default function TradeFinderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusPlayerId = searchParams.get('playerId');
  const focusLeagueId = searchParams.get('leagueId');
  const intent = searchParams.get('intent');
  const targetPlayerId = searchParams.get('targetPlayerId');
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [leagueId, setLeagueId] = useState('');
  const [myOwnerId, setMyOwnerId] = useState<string | null>(null);
  const [managers, setManagers] = useState<LeagueManagerRoster[]>([]);
  const [rostersLoading, setRostersLoading] = useState(false);
  const [bbstLoading, setBbstLoading] = useState(false);
  const [bbstData, setBbstData] = useState<BbstContextResponse | null>(null);

  const [playerQuery, setPlayerQuery] = useState('');
  const [playerOpen, setPlayerOpen] = useState(false);
  const [posTab, setPosTab] = useState<(typeof POS_TAB)[number]>('ALL');
  const [selectedPlayer, setSelectedPlayer] = useState<LeagueRosterPlayer | null>(null);

  const [intelOpen, setIntelOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const [{ data: profile }, { data: lgRows }] = await Promise.all([
        supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
        supabase.from('leagues').select('id, name').eq('user_id', user.id).order('name'),
      ]);
      if (profile?.sleeper_user_id) setMyOwnerId(String(profile.sleeper_user_id));
      const rows = (lgRows ?? []) as Array<{ id: string; name: string }>;
      setLeagues(rows);
      if (rows.length) {
        const pick =
          focusLeagueId && rows.some((r) => r.id === focusLeagueId) ? focusLeagueId : rows[0]!.id;
        setLeagueId(pick);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLeagueId]);

  const loadRosters = useCallback(async (id: string) => {
    if (!id) return;
    setRostersLoading(true);
    setManagers([]);
    setSelectedPlayer(null);
    try {
      const res = await fetch(`/api/leagues/${id}/rosters`);
      if (!res.ok) throw new Error('rosters');
      const json = (await res.json()) as { managers: LeagueManagerRoster[] };
      setManagers(Array.isArray(json.managers) ? json.managers : []);
    } catch {
      setManagers([]);
    } finally {
      setRostersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (leagueId) loadRosters(leagueId);
  }, [leagueId, loadRosters]);

  useEffect(() => {
    if (!leagueId) return;
    let cancelled = false;
    setBbstLoading(true);
    setBbstData(null);
    fetch(`/api/leagues/${leagueId}/bbst-context`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.transactions) setBbstData(data as BbstContextResponse);
      })
      .catch(() => {
        if (!cancelled) setBbstData(null);
      })
      .finally(() => {
        if (!cancelled) setBbstLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const myRoster = useMemo(() => {
    if (!myOwnerId) return null;
    return managers.find((m) => m.owner_id === myOwnerId) ?? null;
  }, [managers, myOwnerId]);

  useEffect(() => {
    if (!focusPlayerId || !myRoster || rostersLoading) return;
    const p = myRoster.players.find((x) => x.player_id === focusPlayerId);
    if (p) {
      setSelectedPlayer(p);
      setPlayerQuery(p.name);
    }
  }, [focusPlayerId, myRoster, rostersLoading]);

  const finderTargetLabel = useMemo(() => {
    if (!targetPlayerId || !managers.length) return null as string | null;
    for (const m of managers) {
      const hit = m.players.find((pl) => pl.player_id === targetPlayerId);
      if (hit) return hit.name;
    }
    return null;
  }, [targetPlayerId, managers]);

  const leagueLabel = leagues.find((l) => l.id === leagueId)?.name ?? '';

  const playersLookup = useMemo(() => {
    const out: Record<string, PlayerSummary> = {};
    for (const m of managers) {
      for (const p of m.players) {
        out[p.player_id] = {
          full_name: p.name,
          position: p.position,
          team: p.team,
          age: p.age,
          injury_status: null,
        };
      }
    }
    if (bbstData?.txPlayers) {
      for (const [id, row] of Object.entries(bbstData.txPlayers)) {
        if (!out[id]) {
          out[id] = {
            full_name: row.full_name,
            position: row.position,
            team: null,
            age: row.age,
            injury_status: null,
          };
        }
      }
    }
    return out;
  }, [managers, bbstData?.txPlayers]);

  const ktcMapFull = useMemo(() => {
    const m: Record<string, number> = { ...(bbstData?.ktcByNameLower ?? {}) };
    for (const row of managers) {
      for (const p of row.players) m[p.name.toLowerCase()] = p.ktc;
    }
    return m;
  }, [bbstData?.ktcByNameLower, managers]);

  const playersPlayerMap: PlayerMap = useMemo(() => {
    const out: PlayerMap = {};
    for (const id of Object.keys(playersLookup)) {
      const x = playersLookup[id]!;
      out[id] = { full_name: x.full_name, position: x.position, age: x.age ?? null };
    }
    return out;
  }, [playersLookup]);

  const userByOwner = useMemo(() => {
    const m: Record<string, { avatar: string | null; username: string; display_name: string }> = {};
    for (const u of bbstData?.users ?? []) {
      m[u.user_id] = { avatar: u.avatar, username: u.username, display_name: u.display_name };
    }
    return m;
  }, [bbstData?.users]);

  const userStrength = useMemo(() => {
    if (!myRoster) return null;
    const ids = myRoster.players.map((p) => p.player_id);
    const s = scoreRoster(ids, playersPlayerMap, ktcMapFull);
    s.roster_id = myRoster.roster_id;
    return s;
  }, [myRoster, playersPlayerMap, ktcMapFull]);

  const filteredMyPlayers = useMemo(() => {
    if (!myRoster) return [];
    const q = playerQuery.trim().toLowerCase();
    return myRoster.players.filter((p) => {
      if (!KEY_POS.has(p.position)) return false;
      if (posTab !== 'ALL' && p.position !== posTab) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q);
    });
  }, [myRoster, playerQuery, posTab]);

  const bbstMatches = useMemo(() => {
    if (!selectedPlayer || !myRoster || !userStrength) return [];

    type Row = {
      opponent: LeagueManagerRoster;
      theirGive: LeagueRosterPlayer;
      netKtc: number;
      verdict: BbstVerdict;
      whyAccept: string;
      empire: 'UP' | 'NEUTRAL' | 'DOWN';
      theirFill: string;
      archetype: BBSTArchetypeLabel;
    };

    const rows: Row[] = [];

    for (const opp of managers) {
      if (opp.roster_id === myRoster.roster_id) continue;
      const ids = opp.players.map((p) => p.player_id);
      const theirStrength = scoreRoster(ids, playersPlayerMap, ktcMapFull);
      theirStrength.roster_id = opp.roster_id;

      const theirGive = pickTheirCounterAsset(selectedPlayer, opp, userStrength, theirStrength);
      if (!theirGive) continue;

      const netKtc = theirGive.ktc - selectedPlayer.ktc;
      const verdict = bbstVerdict(selectedPlayer, theirGive, theirStrength);

      const tradesWindow =
        bbstData?.transactions?.filter(
          (tx) =>
            tx.type === 'trade' &&
            tx.status === 'complete' &&
            tx.roster_ids.includes(opp.roster_id),
        ) ?? [];
      const recent10 = [...tradesWindow].sort((a, b) => b.created - a.created).slice(0, 10);
      const profileArchetype = buildManagerProfile(
        opp.roster_id,
        ids,
        recent10,
        playersLookup,
        ktcMapFull,
      );

      const archetype = mapInternalArchetype(profileArchetype.archetype);

      const weakLabel =
        theirStrength.weak_positions.length > 0
          ? theirStrength.weak_positions.join('/')
          : 'positional depth';

      const whyAccept = `Based on their ${weakLabel} needs and recent transaction patterns, ${selectedPlayer.name.split(' ')[0]} fits how they've been building.`;

      const fillsTheir =
        theirStrength.weak_positions.includes(theirGive.position)
          ? `${theirGive.position} starter gap`
          : `${theirGive.position} depth lane`;

      rows.push({
        opponent: opp,
        theirGive,
        netKtc,
        verdict,
        whyAccept,
        empire: empireImpact(netKtc),
        theirFill: fillsTheir,
        archetype,
      });
    }

    return rows.sort((a, b) => Math.abs(b.netKtc - selectedPlayer.ktc) - Math.abs(a.netKtc - selectedPlayer.ktc));
  }, [
    selectedPlayer,
    myRoster,
    userStrength,
    managers,
    playersPlayerMap,
    ktcMapFull,
    bbstData?.transactions,
    playersLookup,
  ]);

  const managerIntelRows = useMemo(() => {
    const txs = bbstData?.transactions ?? [];

    return managers.map((m) => {
      const ids = m.players.map((p) => p.player_id);
      const tradesMine = txs.filter(
        (tx) => tx.type === 'trade' && tx.status === 'complete' && tx.roster_ids.includes(m.roster_id),
      );
      const recent10 = [...tradesMine].sort((a, b) => b.created - a.created).slice(0, 10);
      const profileWide = buildManagerProfile(m.roster_id, ids, txs, playersLookup, ktcMapFull);
      const profileShort = buildManagerProfile(m.roster_id, ids, recent10, playersLookup, ktcMapFull);
      const tags = deriveStyleTags(profileWide);
      const archetype = mapInternalArchetype(profileShort.archetype);
      const last3 = [...tradesMine]
        .sort((a, b) => b.created - a.created)
        .slice(0, 3)
        .map((tx) => summarizeTradeLine(tx, m.roster_id, playersLookup, ktcMapFull));

      const owner = m.owner_id ? userByOwner[m.owner_id] : undefined;
      const avatarUrl =
        owner?.avatar != null ? `https://sleepercdn.com/avatars/thumbs/${owner.avatar}` : null;
      const display =
        m.display_name ?? m.team_name ?? m.username ?? (m.owner_id ? `Manager ${m.owner_id.slice(0, 6)}` : `Roster ${m.roster_id}`);

      return {
        roster_id: m.roster_id,
        display,
        avatarUrl,
        archetype,
        tags,
        last3,
        pitchAngle: profileShort.pitch_angle,
      };
    });
  }, [managers, bbstData?.transactions, playersLookup, ktcMapFull, userByOwner]);

  function openTradeCalc(opp: LeagueManagerRoster, theirGive: LeagueRosterPlayer) {
    if (!leagueId || !selectedPlayer) return;
    try {
      sessionStorage.setItem(
        BBST_PREFILL_KEY,
        JSON.stringify({
          leagueId,
          opponentRosterId: opp.roster_id,
          giveIds: [selectedPlayer.player_id],
          getIds: [theirGive.player_id],
        }),
      );
    } catch {
      /* ignore */
    }
    router.push('/dashboard/trade');
  }

  const gapColor = (n: number) =>
    n > 120 ? 'text-emerald-400' : n < -120 ? 'text-rose-400' : 'text-[#94A3B8]';

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-10 pb-20">
        <header className="mb-10">
          <h1
            className="text-white uppercase tracking-wide leading-none"
            style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}
          >
            BBST TRADE FINDER
          </h1>
          <p
            className="text-white uppercase tracking-wide mt-1"
            style={{ fontFamily: 'var(--font-display)', fontSize: 48, lineHeight: 0.95 }}
          >
            BOOM OR BUST SMART TRADES
          </p>
          <p
            className="mt-3 uppercase tracking-[0.14em]"
            style={{ fontFamily: 'var(--font-mono), "JetBrains Mono", monospace', fontSize: 11, color: '#22D3EE' }}
          >
            Behavioral trade matching built around your partners
          </p>
          {(intent === 'buy' || intent === 'sell') && (finderTargetLabel || targetPlayerId) ? (
            <p
              className="mt-2 max-w-2xl font-mono text-[11px] font-bold uppercase tracking-[0.12em]"
              style={{
                color: intent === 'sell' ? '#EF4444' : '#36E7A1',
                textShadow:
                  intent === 'sell'
                    ? '0 0 12px rgba(239,68,68,0.45), 0 0 24px rgba(239,68,68,0.2)'
                    : '0 0 12px rgba(54,231,161,0.45), 0 0 24px rgba(54,231,161,0.2)',
              }}
            >
              {intent === 'sell' ? 'Move / sell' : 'Acquire'} · {finderTargetLabel ?? `Player ${(targetPlayerId ?? '').slice(0, 8)}…`}
            </p>
          ) : null}
        </header>

        {/* Section 1 */}
        <section className="space-y-6 mb-12">
          <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-[#64748B]">I want to trade</h2>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-[#475569] mb-2">
              League
            </label>
            <select
              value={leagueId}
              onChange={(e) => {
                setLeagueId(e.target.value);
                setSelectedPlayer(null);
              }}
              style={SELECT_STYLE}
            >
              {leagues.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-[0.15em] text-[#475569] mb-2">
              Select one player from your roster
            </label>
            {!myRoster ? (
              <p className="text-sm text-[#64748B] font-mono">
                {rostersLoading ? 'Loading roster…' : 'Link your Sleeper account to see your roster.'}
              </p>
            ) : (
              <div className="relative max-w-lg">
                <input
                  type="text"
                  value={selectedPlayer ? selectedPlayer.name : playerQuery}
                  onChange={(e) => {
                    setSelectedPlayer(null);
                    setPlayerQuery(e.target.value);
                  }}
                  onFocus={() => setPlayerOpen(true)}
                  placeholder="Search your roster…"
                  readOnly={!!selectedPlayer}
                  className="glass-panel w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-[#475569] border border-white/[0.12] bg-white/[0.04] font-mono"
                />
                {selectedPlayer && (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] text-[#22D3EE] font-mono uppercase"
                    onClick={() => {
                      setSelectedPlayer(null);
                      setPlayerQuery('');
                    }}
                  >
                    Clear
                  </button>
                )}
                {playerOpen && !selectedPlayer && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Close player list"
                      onClick={() => setPlayerOpen(false)}
                    />
                    <div className="absolute z-20 mt-1 w-full max-h-[300px] overflow-y-auto slim-scroll rounded-lg border border-white/[0.12] bg-[#0D1117] shadow-xl">
                      <div className="flex flex-wrap gap-1 p-2 border-b border-white/[0.06]">
                        {POS_TAB.map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPosTab(tab);
                            }}
                            className={clsx(
                              'text-[11px] font-bold px-2 py-1 rounded font-mono',
                              posTab === tab ? 'bg-[#22D3EE]/20 text-[#22D3EE]' : 'text-[#64748B] hover:text-white',
                            )}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <ul className="p-1">
                        {filteredMyPlayers.map((p) => (
                          <li key={p.player_id}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedPlayer(p);
                                setPlayerOpen(false);
                                setPlayerQuery('');
                              }}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left hover:bg-white/[0.06]"
                            >
                              <PlayerAvatar playerId={p.player_id} playerName={p.name} position={p.position} size={40} />
                              <div className="flex-1 min-w-0">
                                <p className="text-[14px] text-white truncate">{p.name}</p>
                                <p className="text-[11px] font-mono text-[#64748B]">
                                  {p.position} · {p.ktc.toLocaleString()} KTC
                                </p>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {selectedPlayer && (
            <div className="max-w-md">
              <p className="text-[11px] font-mono uppercase tracking-[0.15em] text-[#475569] mb-2">
                Dynasty rating card · piece you are shopping
              </p>
              <TfoTradeCard player={selectedPlayer} side="give" />
            </div>
          )}
        </section>

        {/* Section 2 */}
        {selectedPlayer && (
          <section className="mb-12">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-[12px] font-mono uppercase tracking-[0.2em] text-[#64748B]">
                Match results
              </h2>
              {bbstLoading && (
                <span className="flex items-center gap-2 text-[12px] text-[#94A3B8] font-mono">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Syncing transactions…
                </span>
              )}
            </div>

            {bbstMatches.length === 0 ? (
              <p className="text-sm text-[#64748B] font-mono">No counterparty match yet — try another league or player.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {bbstMatches.map((row) => {
                  const mgrName =
                    row.opponent.display_name ??
                    row.opponent.team_name ??
                    row.opponent.username ??
                    `Manager · roster ${row.opponent.roster_id}`;
                  const net = row.netKtc;
                  const gapLabel = `${net >= 0 ? '+' : '−'}${Math.abs(Math.round(net))} KTC`;

                  return (
                    <div
                      key={row.opponent.roster_id}
                      className="glass-panel border border-white/[0.08]"
                      style={{ borderRadius: 16, padding: 20 }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div>
                          <p className="text-white font-bold text-[15px] leading-tight">{mgrName}</p>
                          <p className="text-[12px] text-[#94A3B8] font-mono mt-1">{leagueLabel}</p>
                        </div>
                        <span
                          className={clsx(
                            'text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border shrink-0',
                            ARCHETYPE_BADGE[row.archetype],
                          )}
                        >
                          {row.archetype}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-4 border-y border-white/[0.06]">
                        <div className="text-center flex-1 min-w-0">
                          <p className="text-[10px] font-mono uppercase text-[#64748B] mb-1">You give</p>
                          <p className="text-sm text-white font-semibold truncate">{selectedPlayer.name}</p>
                          <p className="text-[12px] font-mono text-[#94A3B8] tabular-nums">
                            {selectedPlayer.ktc.toLocaleString()} KTC
                          </p>
                        </div>
                        <ArrowLeftRight className="w-5 h-5 text-[#22D3EE] shrink-0" aria-hidden />
                        <div className="text-center flex-1 min-w-0">
                          <p className="text-[10px] font-mono uppercase text-[#64748B] mb-1">They give</p>
                          <p className="text-sm text-white font-semibold truncate">{row.theirGive.name}</p>
                          <p className="text-[12px] font-mono text-[#94A3B8] tabular-nums">
                            {row.theirGive.ktc.toLocaleString()} KTC
                          </p>
                        </div>
                      </div>

                      <p className={clsx('text-center text-[13px] font-mono font-bold mt-3', gapColor(net))}>
                        Value gap: {gapLabel}
                      </p>
                      <p className="text-[13px] text-[#CBD5E1] leading-relaxed mt-3">{row.whyAccept}</p>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                          <p className="text-[10px] font-mono uppercase text-[#64748B] mb-1">3-year impact · you</p>
                          <p className="text-white font-bold flex items-center gap-1">
                            {row.empire === 'UP' && <span className="text-emerald-400">↑</span>}
                            {row.empire === 'DOWN' && <span className="text-rose-400">↓</span>}
                            {row.empire === 'NEUTRAL' && <span className="text-[#94A3B8]">→</span>}
                            <span className="uppercase">{row.empire}</span>
                          </p>
                        </div>
                        <div className="rounded-lg bg-white/[0.04] border border-white/[0.06] p-3">
                          <p className="text-[10px] font-mono uppercase text-[#64748B] mb-1">Their fill</p>
                          <p className="text-[#E2E8F0] leading-snug">{row.theirFill}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-2 flex-wrap">
                        <span
                          className={clsx(
                            'text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded border',
                            VERDICT_STYLE[row.verdict],
                          )}
                        >
                          BBST · {row.verdict}
                        </span>
                        <button
                          type="button"
                          onClick={() => openTradeCalc(row.opponent, row.theirGive)}
                          className="text-[12px] font-bold font-mono uppercase tracking-wide px-4 py-2 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/35 hover:bg-[#22D3EE]/25 transition"
                        >
                          View full trade
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section 3 */}
        <section>
          <button
            type="button"
            onClick={() => setIntelOpen((o) => !o)}
            className="w-full flex items-center justify-between glass-panel rounded-xl px-4 py-3 border border-white/[0.1]"
          >
            <span className="text-[12px] font-mono uppercase tracking-[0.2em] text-white">
              Manager intel · league-wide
            </span>
            {intelOpen ? <ChevronUp className="w-4 h-4 text-[#94A3B8]" /> : <ChevronDown className="w-4 h-4 text-[#94A3B8]" />}
          </button>

          {intelOpen && (
            <div className="mt-4 space-y-4">
              {managerIntelRows.map((row) => (
                <div
                  key={row.roster_id}
                  className="glass-panel rounded-xl border border-white/[0.08] p-4 md:p-5"
                >
                  <div className="flex items-start gap-3 mb-3">
                    {row.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.avatarUrl} alt="" className="w-11 h-11 rounded-full border border-white/10 object-cover" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-white/10 border border-white/10" />
                    )}
                    <div>
                      <p className="text-white font-bold text-sm">{row.display}</p>
                      <span
                        className={clsx(
                          'inline-block mt-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border',
                          ARCHETYPE_BADGE[row.archetype],
                        )}
                      >
                        {row.archetype}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {row.tags.length === 0 ? (
                      <span className="text-[12px] text-[#475569] font-mono">No strong pattern yet</span>
                    ) : (
                      row.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#CBD5E1] border border-white/[0.08]"
                        >
                          {t}
                        </span>
                      ))
                    )}
                  </div>

                  <p className="text-[11px] font-mono uppercase text-[#64748B] mb-1">Last 3 trades</p>
                  <ul className="space-y-2 mb-3">
                    {row.last3.length === 0 ? (
                      <li className="text-[13px] text-[#475569]">No trades in the last five weeks.</li>
                    ) : (
                      row.last3.map((t, i) => (
                        <li key={i} className="text-[13px] text-[#94A3B8] leading-snug">
                          <span className="text-[#E2E8F0]">{t.summary}</span>
                          <span className="block text-[12px] text-[#64748B] mt-0.5">{t.valueNote}</span>
                        </li>
                      ))
                    )}
                  </ul>

                  <p className="text-[11px] font-mono uppercase text-[#64748B] mb-1">Best pitch angle</p>
                  <p className="text-[14px] text-[#CBD5E1] leading-relaxed">{row.pitchAngle}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </AppBackground>
  );
}
