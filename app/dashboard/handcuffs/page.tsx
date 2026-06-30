'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import PlayerAvatar from '@/components/PlayerAvatar';
import AppBackground from '@/components/AppBackground';
import {
  getHandcuffStatus,
  type HandcuffResult,
} from '@/lib/handcuffs/tracker';

const BBST_PREFILL_KEY = 'bbst_trade_prefill';

type LeagueRosterPlayer = {
  player_id: string;
  name: string;
  position: string;
  team: string | null;
  age: number | null;
  ktc: number;
};

type LeagueManagerRoster = {
  roster_id: number;
  owner_id: string | null;
  username: string | null;
  display_name: string | null;
  team_name: string | null;
  starters: string[];
  players: LeagueRosterPlayer[];
};

type PlayerMapRow = {
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
};

type UiPriority = 'critical' | 'high' | 'monitor' | 'secure';

const SKILL = new Set(['QB', 'RB', 'WR', 'TE']);

function tabLabel(name: string): string {
  return name.length <= 12 ? name : `${name.slice(0, 12)}…`;
}

function injuryFlag(status: string | null | undefined): boolean {
  if (!status || status.trim() === '') return false;
  const u = status.toLowerCase();
  if (u === 'healthy' || u === 'active') return false;
  return true;
}

function priorityOrder(p: UiPriority): number {
  switch (p) {
    case 'critical':
      return 0;
    case 'high':
      return 1;
    case 'monitor':
      return 2;
    case 'secure':
      return 3;
    default:
      return 9;
  }
}

function mergeLeagueStarter(
  result: HandcuffResult,
  leagueId: string,
  starterInjury: string | null | undefined,
): {
  entries: HandcuffResult['handcuffs'];
  display: HandcuffResult['handcuffs'][number] | null;
  uiPriority: UiPriority;
} {
  const entries = result.handcuffs.filter((h) => h.league_id === leagueId);
  if (!entries.length) {
    return { entries: [], display: null, uiPriority: 'monitor' };
  }

  const youOwn = entries.find((e) => e.status === 'YOU_OWN');
  const avail = entries.find((e) => e.status === 'AVAILABLE');
  const opp = entries.find((e) => e.status === 'OPPONENT_OWNS');
  const injured = injuryFlag(starterInjury);

  let uiPriority: UiPriority = 'monitor';
  if (youOwn) uiPriority = 'secure';
  else if (injured && avail) uiPriority = 'critical';
  else if (avail) uiPriority = 'high';
  else if (opp) uiPriority = 'monitor';
  else uiPriority = 'monitor';

  const display = youOwn ?? avail ?? opp ?? entries[0] ?? null;
  return { entries, display, uiPriority };
}

function managerLabel(m: LeagueManagerRoster | undefined): string {
  if (!m) return 'Opponent';
  return m.display_name ?? m.team_name ?? m.username ?? `Roster ${m.roster_id}`;
}

function pickBenchChip(
  myRoster: LeagueManagerRoster,
  starterRbId: string,
  handcuffKtc: number,
): LeagueRosterPlayer | null {
  const starterSet = new Set(myRoster.starters);
  const candidates = myRoster.players.filter((p) => {
    if (!SKILL.has(p.position)) return false;
    if (p.player_id === starterRbId) return false;
    if (starterSet.size > 0 && starterSet.has(p.player_id)) return false;
    return true;
  });
  if (!candidates.length) return null;
  const sorted = [...candidates].sort((a, b) => a.ktc - b.ktc);
  const within = sorted.find((p) => Math.abs(handcuffKtc - p.ktc) <= 300);
  return within ?? sorted[0] ?? null;
}

function effectiveStartersForHandcuff(my: LeagueManagerRoster): string[] {
  if (my.starters.length > 0) return my.starters;
  const rbs = my.players.filter((p) => p.position === 'RB').sort((a, b) => b.ktc - a.ktc);
  return rbs.slice(0, 2).map((p) => p.player_id);
}

const PRIORITY_PILL: Record<UiPriority, string> = {
  critical: 'bg-red-500/22 text-red-300 border-red-400/50',
  high: 'bg-amber-500/22 text-amber-200 border-amber-400/45',
  monitor: 'bg-[#22D3EE]/18 text-[#22D3EE] border-[#22D3EE]/40',
  secure: 'bg-emerald-500/22 text-emerald-200 border-emerald-400/45',
};

const PRIORITY_LABEL: Record<UiPriority, string> = {
  critical: 'CRITICAL',
  high: 'HIGH',
  monitor: 'MONITOR',
  secure: 'SECURE',
};

function HandcuffStarterCard({
  result,
  leagueId,
  leagueName,
  managers,
  myRoster,
  injuryStatus,
  ktcMap,
}: {
  result: HandcuffResult;
  leagueId: string;
  leagueName: string;
  managers: LeagueManagerRoster[];
  myRoster: LeagueManagerRoster;
  injuryStatus: string | null | undefined;
  ktcMap: Record<string, number>;
}) {
  const router = useRouter();
  const { display, uiPriority } = mergeLeagueStarter(result, leagueId, injuryStatus);

  const oppMgr =
    display?.status === 'OPPONENT_OWNS' && display.owner_roster_id != null
      ? managers.find((m) => m.roster_id === display.owner_roster_id)
      : undefined;

  const handcuffKtc =
    display?.player_id != null
      ? myRoster.players.find((p) => p.player_id === display.player_id)?.ktc ??
        oppMgr?.players.find((p) => p.player_id === display.player_id)?.ktc ??
        ktcMap[display.name.toLowerCase()] ??
        0
      : ktcMap[display?.name.toLowerCase() ?? ''] ?? 0;

  const tradeChip =
    display?.status === 'OPPONENT_OWNS' && display.player_id && oppMgr
      ? pickBenchChip(myRoster, result.starter_id, handcuffKtc || 5000)
      : null;

  const delta =
    tradeChip && handcuffKtc ? Math.round(handcuffKtc - tradeChip.ktc) : null;

  function sendBbst() {
    if (!tradeChip || !display?.player_id || display.status !== 'OPPONENT_OWNS' || !oppMgr) return;
    try {
      sessionStorage.setItem(
        BBST_PREFILL_KEY,
        JSON.stringify({
          leagueId,
          opponentRosterId: oppMgr.roster_id,
          giveIds: [tradeChip.player_id],
          getIds: [display.player_id],
        }),
      );
    } catch {
      /* ignore */
    }
    router.push('/dashboard/trade');
  }

  const avatarRing =
    display?.status === 'YOU_OWN'
      ? 'ring-2 ring-[#36E7A1] ring-offset-2 ring-offset-[#0a0f18]'
      : display?.status === 'AVAILABLE'
        ? 'ring-2 ring-[#FBBF24] ring-offset-2 ring-offset-[#0a0f18]'
        : display?.status === 'OPPONENT_OWNS'
          ? 'ring-2 ring-[#EF4444] ring-offset-2 ring-offset-[#0a0f18]'
          : '';

  return (
    <div className="glass-panel rounded-xl p-4 border border-white/[0.08] relative">
      <span
        className={clsx(
          'absolute top-3 right-3 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border',
          PRIORITY_PILL[uiPriority],
        )}
      >
        {PRIORITY_LABEL[uiPriority]}
      </span>

      <div className="flex flex-col lg:flex-row lg:items-stretch gap-4 pr-16 lg:pr-20">
        {/* Starter */}
        <div className="flex gap-3 flex-1 min-w-0">
          <PlayerAvatar
            playerId={result.starter_id}
            playerName={result.starter_name}
            position={result.starter_position}
            size={48}
          />
          <div className="min-w-0 flex-1">
            <p className="text-white font-semibold text-sm truncate">{result.starter_name}</p>
            {result.starter_team && (
              <p className="text-[12px] text-[#94A3B8] font-mono truncate">{result.starter_team}</p>
            )}
            <span className="inline-block mt-1 text-[11px] font-black px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/35">
              RB
            </span>
            <p className="text-[12px] font-mono text-[#94A3B8] mt-1 tabular-nums">
              {result.starter_ktc > 0 ? `${result.starter_ktc.toLocaleString()} KTC` : 'KTC —'}
            </p>
            {injuryFlag(injuryStatus) && (
              <p className="text-[12px] text-red-400 font-mono mt-1 flex items-center gap-1">
                <span aria-hidden>⚑</span>
                {injuryStatus}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center shrink-0">
          <ArrowRight className="w-6 h-6 text-[#64748B]" aria-hidden />
        </div>

        {/* Handcuff */}
        <div className="flex gap-3 flex-1 min-w-0">
          {!display || display.status === 'NOT_FOUND' ? (
            <div className="flex flex-col justify-center">
              <p className="text-[14px] text-[#475569] font-mono">No handcuff found</p>
              <p className="text-[12px] text-[#475569] mt-1">Depth chart pair not in database.</p>
            </div>
          ) : (
            <>
              <div className={clsx('rounded-full shrink-0', avatarRing)}>
                <PlayerAvatar
                  playerId={display.player_id ?? result.starter_id}
                  playerName={display.name}
                  position="RB"
                  size={48}
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-white font-semibold text-sm truncate">{display.name}</p>

                {display.status === 'YOU_OWN' && (
                  <>
                    <p className="text-[13px] font-bold text-[#36E7A1]">✓ PROTECTED</p>
                    <p className="text-[12px] text-[#94A3B8] font-mono">You own the handcuff</p>
                  </>
                )}

                {display.status === 'AVAILABLE' && (
                  <>
                    <p className="text-[13px] font-bold text-[#FBBF24]">⚠ AVAILABLE</p>
                    <p className="text-[12px] text-[#FBBF24] font-mono font-semibold">Add immediately</p>
                  </>
                )}

                {display.status === 'OPPONENT_OWNS' && (
                  <>
                    <p className="text-[13px] font-bold text-[#EF4444]">
                      🔒 {managerLabel(oppMgr)}
                    </p>
                    <p className="text-[12px] text-[#94A3B8] font-mono">
                      Owned by {managerLabel(oppMgr)}
                    </p>

                    {tradeChip && display.player_id && (
                      <div className="mt-2 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 space-y-2">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                          Trade for protection
                        </p>
                        <p className="text-[13px] text-[#E2E8F0] leading-snug">
                          Offer{' '}
                          <span className="text-white font-semibold">{tradeChip.name}</span>{' '}
                          <span className="text-[#94A3B8] tabular-nums">({tradeChip.ktc.toLocaleString()} KTC)</span>{' '}
                          →{' '}
                          <span className="text-white font-semibold">{display.name}</span>{' '}
                          <span className="text-[#94A3B8] tabular-nums">
                            ({(handcuffKtc || 0).toLocaleString()} KTC)
                          </span>
                        </p>
                        {delta != null && (
                          <p
                            className={clsx(
                              'text-[12px] font-mono font-bold',
                              Math.abs(delta) <= 300 ? 'text-[#36E7A1]' : 'text-[#94A3B8]',
                            )}
                          >
                            Value Δ {delta >= 0 ? '+' : ''}
                            {delta.toLocaleString()} KTC
                            {Math.abs(delta) <= 300 ? ' · within 300' : ''}
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={sendBbst}
                          className="w-full mt-1 text-[12px] font-black font-mono uppercase tracking-wide py-2 rounded-lg bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/35 hover:bg-[#22D3EE]/25 transition"
                        >
                          Send BBST
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="text-[10px] text-[#475569] font-mono uppercase tracking-wider mt-3 truncate">
        {leagueName}
      </p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="glass-panel rounded-xl border border-white/[0.06] p-4 space-y-3">
          <div className="h-12 w-full shimmer rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export default function HandcuffsPage() {
  const [leagues, setLeagues] = useState<Array<{ id: string; name: string }>>([]);
  const [packs, setPacks] = useState<
    Array<{
      leagueId: string;
      leagueName: string;
      managers: LeagueManagerRoster[];
      myRoster: LeagueManagerRoster | null;
    }>
  >([]);
  const [playersDb, setPlayersDb] = useState<Record<string, PlayerMapRow & { injury_status?: string | null }>>({});
  const [ktcMap, setKtcMap] = useState<Record<string, number>>({});
  const [activeLeagueId, setActiveLeagueId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { data: lgRows }, ktcRes] = await Promise.all([
        supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
        supabase.from('leagues').select('id, name').eq('user_id', user.id).order('name'),
        fetch('/api/values'),
      ]);

      const ktc: Record<string, number> = {};
      if (ktcRes.ok) {
        const rows = (await ktcRes.json()) as { player_name: string; ktc_value: number }[];
        for (const p of rows) ktc[p.player_name.toLowerCase()] = p.ktc_value;
      }

      const leagueList = (lgRows ?? []) as Array<{ id: string; name: string }>;
      if (!leagueList.length || cancelled) {
        setLeagues([]);
        setLoading(false);
        return;
      }

      const sleeperUserId = profile?.sleeper_user_id ? String(profile.sleeper_user_id) : null;

      const rosterJson = await Promise.all(
        leagueList.map(async (lg) => {
          const res = await fetch(`/api/leagues/${lg.id}/rosters`);
          if (!res.ok) return { leagueId: lg.id, leagueName: lg.name, managers: [] as LeagueManagerRoster[] };
          const json = (await res.json()) as { managers?: LeagueManagerRoster[] };
          return {
            leagueId: lg.id,
            leagueName: lg.name,
            managers: Array.isArray(json.managers) ? json.managers : [],
          };
        }),
      );

      const idSet = new Set<string>();
      for (const r of rosterJson) {
        for (const m of r.managers) {
          for (const p of m.players) idSet.add(p.player_id);
          for (const s of m.starters ?? []) idSet.add(s);
        }
      }

      const ids = Array.from(idSet);
      const chunk = (arr: string[], n: number) =>
        Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

      const playerChunks = chunk(ids, 180);
      const merged: Record<string, PlayerMapRow & { injury_status?: string | null }> = {};
      for (const part of playerChunks) {
        if (!part.length) continue;
        const res = await fetch(`/api/players?ids=${part.join(',')}`);
        if (!res.ok) continue;
        const json = (await res.json()) as Record<
          string,
          { full_name: string; position: string; team: string | null; age: number | null; injury_status?: string | null }
        >;
        for (const [id, row] of Object.entries(json)) {
          merged[id] = {
            full_name: row.full_name,
            position: row.position,
            team: row.team,
            age: row.age,
            injury_status: row.injury_status ?? null,
          };
        }
      }

      const packsBuilt = rosterJson.map((row) => {
        const my = sleeperUserId
          ? row.managers.find((m) => m.owner_id === sleeperUserId) ?? null
          : null;
        return {
          leagueId: row.leagueId,
          leagueName: row.leagueName,
          managers: row.managers.map((m) => ({
            ...m,
            starters: Array.isArray(m.starters) ? m.starters : [],
          })),
          myRoster: my
            ? { ...my, starters: Array.isArray(my.starters) ? my.starters : [] }
            : null,
        };
      });

      if (cancelled) return;

      setLeagues(leagueList);
      setPacks(packsBuilt);
      setPlayersDb(merged);
      setKtcMap(ktc);
      setActiveLeagueId((id) => id || leagueList[0]!.id);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => {
    const packsWithMe = packs.filter((p) => p.myRoster);
    if (!packsWithMe.length || !Object.keys(playersDb).length) return null;

    const userRosters = packsWithMe.map((p) => {
      const my = p.myRoster!;
      const startersEff = effectiveStartersForHandcuff(my);
      return {
        league_id: p.leagueId,
        league_name: p.leagueName,
        roster_id: my.roster_id,
        players: my.players.map((x) => x.player_id),
        starters: startersEff,
      };
    });

    const allLeagueRosters = packsWithMe.map((p) => ({
      league_id: p.leagueId,
      rosters: p.managers.map((m) => ({
        roster_id: m.roster_id,
        players: m.players.map((x) => x.player_id),
      })),
    }));

    const pm: Record<string, PlayerMapRow> = {};
    for (const [id, row] of Object.entries(playersDb)) {
      pm[id] = {
        full_name: row.full_name,
        position: row.position,
        team: row.team,
        age: row.age,
      };
    }

    return getHandcuffStatus(userRosters, pm, ktcMap, allLeagueRosters);
  }, [packs, playersDb, ktcMap]);

  const leagueRows = useMemo(() => {
    if (!summary || !activeLeagueId) return [];

    const rows: Array<{ result: HandcuffResult; uiPriority: UiPriority }> = [];
    for (const result of summary.results) {
      const has = result.handcuffs.some((h) => h.league_id === activeLeagueId);
      if (!has) continue;
      const inj = playersDb[result.starter_id]?.injury_status;
      const { uiPriority } = mergeLeagueStarter(result, activeLeagueId, inj);
      rows.push({ result, uiPriority });
    }

    rows.sort((a, b) => {
      const po = priorityOrder(a.uiPriority) - priorityOrder(b.uiPriority);
      if (po !== 0) return po;
      return b.result.starter_ktc - a.result.starter_ktc;
    });
    return rows;
  }, [summary, activeLeagueId, playersDb]);

  const leagueStrip = useMemo(() => {
    let critical = 0;
    let secure = 0;
    let atRisk = 0;
    for (const { uiPriority } of leagueRows) {
      if (uiPriority === 'critical') critical++;
      else if (uiPriority === 'secure') secure++;
      else atRisk++;
    }
    return { critical, secure, atRisk };
  }, [leagueRows]);

  const activePack = packs.find((p) => p.leagueId === activeLeagueId);

  return (
    <AppBackground intensity="subtle">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 pb-16">
        <header className="mb-8">
          <h1 className="text-white uppercase tracking-wide" style={{ fontFamily: 'var(--font-display)', fontSize: 48 }}>
            HANDCUFF TRACKER
          </h1>
          <p
            className="mt-2 uppercase tracking-[0.12em]"
            style={{
              fontFamily: 'var(--font-mono), "JetBrains Mono", monospace',
              fontSize: 11,
              color: '#36E7A1',
            }}
          >
            Roster insurance across all your leagues
          </p>
        </header>

        {!loading && leagues.length === 0 && (
          <div className="text-center py-16 glass-panel rounded-xl border border-white/[0.08]">
            <p className="text-white font-medium">No leagues linked</p>
            <p className="text-[#94A3B8] text-sm mt-1 font-mono">Add a league from onboarding or settings.</p>
          </div>
        )}

        {leagues.length > 0 && (
          <div className="mb-6 border-b border-white/[0.08] overflow-x-auto slim-scroll">
            <div className="flex gap-1 min-w-min pb-0">
              {leagues.map((lg) => {
                const active = lg.id === activeLeagueId;
                return (
                  <button
                    key={lg.id}
                    type="button"
                    onClick={() => setActiveLeagueId(lg.id)}
                    className={clsx(
                      'relative shrink-0 px-3 py-2.5 text-[13px] font-mono font-bold transition',
                      active ? 'text-white' : 'text-[#64748B] hover:text-[#94A3B8]',
                    )}
                  >
                    {tabLabel(lg.name)}
                    {active && (
                      <span
                        className="absolute left-2 right-2 bottom-0 h-0.5 rounded-full bg-[#22D3EE] shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activePack?.myRoster && leagueRows.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-6 font-mono text-[13px]">
            <span className="text-red-400 font-bold">
              {leagueStrip.critical} CRITICAL
            </span>
            <span className="text-[#475569]">|</span>
            <span className="text-emerald-400 font-bold">
              {leagueStrip.secure} SECURE
            </span>
            <span className="text-[#475569]">|</span>
            <span className="text-amber-400 font-bold">
              {leagueStrip.atRisk} AT RISK
            </span>
          </div>
        )}

        {loading && <Skeleton />}

        {!loading && activePack && !activePack.myRoster && (
          <p className="text-[#94A3B8] text-sm font-mono">
            Connect your Sleeper account to identify your roster in this league.
          </p>
        )}

        {!loading && activePack?.myRoster && leagueRows.length === 0 && (
          <div className="text-center py-16 glass-panel rounded-xl border border-white/[0.08]">
            <p className="text-white font-medium">No RB handcuff situations</p>
            <p className="text-[#94A3B8] text-sm mt-1 font-mono">
              Starters may not match known depth-chart pairs, or lineups are empty off-season.
            </p>
          </div>
        )}

        {!loading &&
          activePack?.myRoster &&
          (() => {
            const myRoster = activePack.myRoster;
            return (
              <div className="space-y-4">
                {leagueRows.map(({ result }) => (
                  <HandcuffStarterCard
                    key={`${activeLeagueId}-${result.starter_id}`}
                    result={result}
                    leagueId={activeLeagueId}
                    leagueName={activePack.leagueName}
                    managers={activePack.managers}
                    myRoster={myRoster}
                    injuryStatus={playersDb[result.starter_id]?.injury_status}
                    ktcMap={ktcMap}
                  />
                ))}
              </div>
            );
          })()}
      </main>
    </AppBackground>
  );
}
