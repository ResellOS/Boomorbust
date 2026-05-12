import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeTradeOffer, type TradeAnalysis } from '@/lib/values/engine';
import { resolveSleeperIdsByFullNames, getPlayersByIds } from '@/lib/sleeper/players';
import { estimateDraftPickKtc } from '@/lib/picks/advisor';
import { requireFeature } from '@/lib/access/gates';

type Slot = 'early' | 'mid' | 'late';

interface PlayerIn {
  name: string;
  position: string;
  age: number | null;
  ktc_value: number;
}

interface PickIn {
  season: string;
  round: number;
  slot: Slot;
  team?: string;
}

function toTradeSide(players: PlayerIn[] = [], picks: PickIn[] = []) {
  const pl = players.map((p) => ({
    name: p.name,
    position: p.position,
    age: p.age,
    ktc_value: p.ktc_value,
  }));
  for (const pk of picks) {
    const ktc = estimateDraftPickKtc(pk.round, pk.slot);
    const label = `${pk.season} round ${pk.round} (${pk.slot})${pk.team ? ` · ${pk.team}` : ''}`;
    pl.push({ name: label, position: 'PICK', age: null, ktc_value: ktc });
  }
  return { players: pl };
}

function roundEquivalenceLabel(valueDeltaKtc: number): string {
  const v = Math.abs(valueDeltaKtc);
  if (v < 400) return 'Even';
  const rounds = v / 3500;
  const sign = valueDeltaKtc >= 0 ? '+' : '−';
  return `${sign}${rounds.toFixed(1)} rounds`;
}

function scoreToBar(score: number): number {
  return Math.max(0, Math.min(100, Math.round((score + 100) / 2)));
}

export async function POST(request: NextRequest) {
  const access = await requireFeature('smart_counter');
  if (access instanceof NextResponse) return access;
  const { userId: _userId } = access;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: {
    league_id: string;
    giving: { players?: PlayerIn[]; picks?: PickIn[] };
    receiving: { players?: PlayerIn[]; picks?: PickIn[] };
    risk_tolerance?: 'conservative' | 'balanced' | 'aggressive';
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { league_id, giving = {}, receiving = {}, risk_tolerance = 'balanced' } = body;
  const gPlayersIn = giving.players ?? [];
  const rPlayersIn = receiving.players ?? [];

  const gPicks = giving.picks ?? [];
  const rPicks = receiving.picks ?? [];

  if ((!gPlayersIn.length && !gPicks.length) || (!rPlayersIn.length && !rPicks.length)) {
    return NextResponse.json({ error: 'Both sides must have at least one asset' }, { status: 400 });
  }

  const [lgResult, profResult] = await Promise.all([
    league_id ? supabase.from('leagues').select('scoring_settings').eq('id', league_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from('profiles').select('sleeper_user_id').eq('id', user.id).maybeSingle(),
  ]);

  let scoringFormat = 'Standard';
  if (league_id) {
    const rec = (lgResult.data?.scoring_settings as Record<string, number> | null)?.rec ?? 0;
    scoringFormat = rec >= 1 ? 'PPR' : rec >= 0.5 ? '0.5 PPR' : 'Standard';
  }
  const ownerSid = profResult.data?.sleeper_user_id ? String(profResult.data.sleeper_user_id) : null;

  const positions: Record<string, number> = {};
  if (league_id) {
    const q = supabase.from('rosters').select('players').eq('league_id', league_id);
    const { data: rs } = ownerSid ? await q.eq('owner_id', ownerSid).maybeSingle() : await q.limit(1).maybeSingle();
    const ids = (rs?.players ?? []) as string[];
    const chunk = ids.slice(0, 220);
    if (chunk.length) {
      const pmap = await getPlayersByIds(chunk);
      for (const id of ids) {
        const p = pmap[id];
        if (!p?.position) continue;
        const pos = String(p.position).toUpperCase();
        if (!['QB', 'RB', 'WR', 'TE'].includes(pos)) continue;
        positions[pos] = (positions[pos] ?? 0) + 1;
      }
    }
  }

  const givingSide = toTradeSide(gPlayersIn, gPicks);
  const receivingSide = toTradeSide(rPlayersIn, rPicks);

  const rosterContext = {
    positions,
    scoringFormat,
    riskTolerance: risk_tolerance,
  };

  const analysis: TradeAnalysis = analyzeTradeOffer(givingSide, receivingSide, rosterContext);

  const names = [...gPlayersIn.map((p) => p.name), ...rPlayersIn.map((p) => p.name)];
  const resolved = await resolveSleeperIdsByFullNames(names);

  const allIds = Array.from(new Set(Array.from(resolved.values())));

  type MetaMap = Awaited<ReturnType<typeof getPlayersByIds>>;
  const [meta, bbvResult] = await Promise.all([
    allIds.length ? getPlayersByIds(allIds) : Promise.resolve({} as MetaMap),
    allIds.length ? supabase.from('bbv_values').select('player_id, bbv_score').in('player_id', allIds) : Promise.resolve({ data: null }),
  ]);

  const bbvMap: Record<string, number> = {};
  if (bbvResult.data) {
    for (const row of bbvResult.data as { player_id: string; bbv_score: number }[]) bbvMap[row.player_id] = row.bbv_score;
  }

  function enrich(player: PlayerIn) {
    const sid = resolved.get(player.name);
    const m = sid ? meta[sid] : undefined;
    return {
      name: player.name,
      position: player.position,
      age: player.age,
      team: m?.team ?? null,
      ktc_value: player.ktc_value,
      bbv_value: sid ? bbvMap[sid] ?? null : null,
      sleeper_id: sid ?? null,
    };
  }

  const breakdownYour = [...gPlayersIn.map(enrich)];
  const breakdownTheir = [...rPlayersIn.map(enrich)];
  for (const pk of gPicks) {
    breakdownYour.push({
      name: `${pk.season} R${pk.round}`,
      position: 'PICK',
      age: null,
      team: pk.team ?? null,
      ktc_value: estimateDraftPickKtc(pk.round, pk.slot),
      bbv_value: null,
      sleeper_id: null,
    });
  }
  for (const pk of rPicks) {
    breakdownTheir.push({
      name: `${pk.season} R${pk.round}`,
      position: 'PICK',
      age: null,
      team: pk.team ?? null,
      ktc_value: estimateDraftPickKtc(pk.round, pk.slot),
      bbv_value: null,
      sleeper_id: null,
    });
  }

  const payload = {
    analysis,
    roundsLabel: roundEquivalenceLabel(analysis.value_delta),
    dimensionScores: {
      dynasty_value: scoreToBar(analysis.dimensions.current_value.score),
      contention_fit: scoreToBar(analysis.dimensions.future_value.score),
      positional_need: scoreToBar(analysis.dimensions.positional_need.score),
      age_curve: scoreToBar(analysis.dimensions.age_curve.score),
    },
    dimensionNotes: {
      dynasty_value: analysis.dimensions.current_value.note,
      contention_fit: analysis.dimensions.future_value.note,
      positional_need: analysis.dimensions.positional_need.note,
      age_curve: analysis.dimensions.age_curve.note,
    },
    breakdownYour,
    breakdownTheir,
    totalGiving: breakdownYour.reduce((s, x) => s + (x.ktc_value ?? 0), 0),
    totalReceiving: breakdownTheir.reduce((s, x) => s + (x.ktc_value ?? 0), 0),
  };

  return NextResponse.json(payload);
}
