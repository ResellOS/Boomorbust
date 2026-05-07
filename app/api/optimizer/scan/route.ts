import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import Fuse from 'fuse.js';
import { createClient } from '@/lib/supabase/server';
import { calculateTFOScore, type CalculateTFOScoreInput, type TFOGrade, type TFOPosition } from '@/lib/tfo/formula';
import { fetchAllPlayers, type SleeperPlayer } from '@/lib/sleeper/players';
import { schemeForTeam } from '@/lib/lineup/teamSchemeMap';
import { getKTCValues } from '@/lib/values/ktc';

export type OptimizerScanPlayerRow = {
  playerId: string;
  playerName: string;
  position: string;
  team: string;
  leagueId: string;
  leagueName: string;
  tfoScore: number;
  tier: 'diamond' | 'gem' | 'starter' | 'nuke';
  grade: TFOGrade;
  flags: string[];
  reasoning: string;
  age: number | null;
};

export type OptimizerScanDirectiveType = 'CONSOLIDATE' | 'RISK_CHECK' | 'AGE_CLIFF';

export type OptimizerScanDirectiveRow = {
  type: OptimizerScanDirectiveType;
  message: string;
  affectedPlayers: string[];
};

export type OptimizerScanResponse = {
  players: OptimizerScanPlayerRow[];
  directives: OptimizerScanDirectiveRow[];
  summary: {
    diamond: number;
    gem: number;
    starter: number;
    nuke: number;
    totalPlayers: number;
  };
};

const CACHE_EX = 1800;

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function seededUnit(id: string, salt: number): number {
  let h = 0x811c9dc5;
  const input = `${id}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 10001) / 10000;
}

function buildTFOInput(playerId: string, sp: SleeperPlayer, ktcValue: number): CalculateTFOScoreInput | null {
  const pos = (sp.position ?? '').toUpperCase();
  if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) return null;

  const team = (sp.team ?? '—').toUpperCase();
  const scheme = schemeForTeam(team);

  const snapShare =
    typeof sp.depth_chart_order === 'number' && sp.depth_chart_order >= 1 && sp.depth_chart_order <= 4
      ? clamp(90 - sp.depth_chart_order * 14, 36, 94)
      : undefined;
  const age = sp.age ?? Math.round(22 + seededUnit(playerId, 11) * 10);

  const u2 = seededUnit(playerId, 12);
  const u3 = seededUnit(playerId, 13);
  const u4 = seededUnit(playerId, 14);
  const u5 = seededUnit(playerId, 15);
  const oppBase = 48 + u2 * 32;

  return {
    playerId,
    position: pos as TFOPosition,
    age,
    team,
    ocScheme: scheme,
    opportunityScore: clamp(oppBase, 15, 97),
    olGrade: clamp(44 + u3 * 40, 20, 95),
    wrCastGrade: clamp(43 + u4 * 42, 18, 95),
    redZoneShare: clamp(34 + u5 * 40, 12, 93),
    ktcValue: ktcValue > 0 ? ktcValue : Math.round(2000 + seededUnit(playerId, 16) * 5500),
    snapShare,
    targetShare:
      pos === 'WR' || pos === 'TE' || pos === 'RB' ? clamp(8 + u2 * 34, 4, 42) : undefined,
    ocYear: seededUnit(playerId, 17) > 0.72 ? 3 : seededUnit(playerId, 18) > 0.4 ? 2 : 1,
    teamQbIsYoung: pos !== 'QB' ? seededUnit(playerId, 19) > 0.5 : undefined,
  };
}

function tierFromTfo(tfoScore: number): OptimizerScanPlayerRow['tier'] {
  if (tfoScore >= 88) return 'diamond';
  if (tfoScore >= 75) return 'gem';
  if (tfoScore >= 60) return 'starter';
  if (tfoScore < 45) return 'nuke';
  return 'starter';
}

async function buildKtcResolver(): Promise<(fullName: string) => number> {
  const rows = await getKTCValues();
  if (!rows.length) return () => 3500;
  const fuse = new Fuse(rows, { keys: ['player_name'], threshold: 0.38 });
  return (fullName: string) => fuse.search(fullName)[0]?.item.ktc_value ?? 3500;
}

function buildDirectives(players: OptimizerScanPlayerRow[]): OptimizerScanDirectiveRow[] {
  const directives: OptimizerScanDirectiveRow[] = [];

  const nukes = players.filter((p) => p.tier === 'nuke');
  if (nukes.length > 2) {
    directives.push({
      type: 'CONSOLIDATE',
      message: `CONSOLIDATE — ${nukes.length} assets underperforming. Sell before market catches up.`,
      affectedPlayers: nukes.map((p) => p.playerName),
    });
  }

  const riskPlayers = players.filter((p) => (p.age ?? 0) > 29 && p.tfoScore < 65);
  if (riskPlayers.length > 0) {
    const name = riskPlayers[0]!.playerName;
    directives.push({
      type: 'RISK_CHECK',
      message: `RISK_CHECK — ${name} age cliff approaching. 3-year window closing.`,
      affectedPlayers: riskPlayers.map((p) => p.playerName),
    });
  }

  const eliteWrs = players.filter((p) => p.position === 'WR' && p.tfoScore > 75);
  if (eliteWrs.length < 3) {
    directives.push({
      type: 'AGE_CLIFF',
      message:
        'AGE_CLIFF — Reinforce WR depth. Current corps thin above starter threshold.',
      affectedPlayers: eliteWrs.map((p) => p.playerName),
    });
  }

  return directives;
}

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const redis = getRedis();
    const cacheKey = `optimizer:scan:${user.id}`;
    if (redis) {
      try {
        const cached = await redis.get<OptimizerScanResponse>(cacheKey);
        if (cached?.players && cached.summary) {
          return NextResponse.json(cached);
        }
      } catch {
        /* miss */
      }
    }

    const { data: prof } = await supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle();

    const sleeperUserId = prof?.sleeper_user_id ? String(prof.sleeper_user_id) : null;
    if (!sleeperUserId) {
      return NextResponse.json({ error: 'Link Sleeper in settings' }, { status: 403 });
    }

    const { data: leagueRows, error: lgErr } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('user_id', user.id);

    if (lgErr) {
      console.error('optimizer scan leagues:', lgErr);
      return NextResponse.json({ error: 'Could not load leagues' }, { status: 500 });
    }

    const leagues = leagueRows ?? [];
    const allPlayersMap = await fetchAllPlayers();
    if (!allPlayersMap) {
      return NextResponse.json({ error: 'Could not load NFL players' }, { status: 502 });
    }

    const ktcResolve = await buildKtcResolver();
    const players: OptimizerScanPlayerRow[] = [];

    for (const lg of leagues) {
      const leagueId = lg.id as string;
      const leagueName = (lg.name as string) ?? leagueId;

      const { data: rosterRows } = await supabase
        .from('rosters')
        .select('players')
        .eq('league_id', leagueId)
        .eq('owner_id', sleeperUserId)
        .maybeSingle();

      const ids = Array.from(new Set((rosterRows?.players ?? []) as string[])).filter(Boolean);
      for (const pid of ids) {
        const sp = allPlayersMap[pid];
        if (!sp) continue;

        const ktcVal = ktcResolve(sp.full_name ?? '');
        const input = buildTFOInput(pid, sp, ktcVal);
        if (!input) continue;

        const tfo = calculateTFOScore(input);
        const roundedScore = Math.round(tfo.tfoScore * 10) / 10;
        const tier = tierFromTfo(tfo.tfoScore);

        players.push({
          playerId: pid,
          playerName: sp.full_name ?? 'Unknown',
          position: (sp.position ?? '').toUpperCase(),
          team: (sp.team ?? '—').toUpperCase(),
          leagueId,
          leagueName,
          tfoScore: roundedScore,
          tier,
          grade: tfo.grade,
          flags: tfo.flags,
          reasoning: tfo.reasoning,
          age: sp.age ?? null,
        });
      }
    }

    const summary = {
      diamond: players.filter((p) => p.tier === 'diamond').length,
      gem: players.filter((p) => p.tier === 'gem').length,
      starter: players.filter((p) => p.tier === 'starter').length,
      nuke: players.filter((p) => p.tier === 'nuke').length,
      totalPlayers: players.length,
    };

    const directives = buildDirectives(players);

    const payload: OptimizerScanResponse = { players, directives, summary };

    if (redis) {
      try {
        await redis.set(cacheKey, payload, { ex: CACHE_EX });
      } catch (e) {
        console.error('optimizer scan redis set:', e);
      }
    }

    return NextResponse.json(payload);
  } catch (err) {
    console.error('optimizer scan:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
