import { createAdminClient } from '@/lib/supabase/admin';
import {
  CONFIDENCE_TIER_META,
  SEED_MODEL_TIMELINE,
} from './constants';
import type {
  BobCall,
  CallConfidence,
  CategoryAccuracy,
  ConfidenceTierRow,
  PerformancePageData,
  WeeklyAccuracyPoint,
} from './types';
import {
  confidenceFromPct,
  parseRecommendation,
  parseResult,
  sortByOutcomeMagnitude,
} from './utils';

const EMPTY_CATEGORY: CategoryAccuracy = {
  buyNow: null,
  buyWindow: null,
  sellNow: null,
  sellWindow: null,
  startCalls: null,
  sitCalls: null,
};

function pct(wins: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((wins / total) * 1000) / 10;
}

function categoryPct(calls: BobCall[], rec: BobCall['recommendation']): number | null {
  const subset = calls.filter(
    (c) => c.recommendation === rec && c.result !== 'PENDING' && c.result !== 'INVALIDATED',
  );
  if (subset.length === 0) return null;
  const wins = subset.filter((c) => c.result === 'WIN' || c.result === 'PUSH').length;
  return pct(wins, subset.length);
}

function tierAccuracy(calls: BobCall[], tier: CallConfidence): number | null {
  const subset = calls.filter(
    (c) =>
      c.confidence === tier &&
      c.result !== 'PENDING' &&
      c.result !== 'INVALIDATED',
  );
  if (subset.length === 0) return null;
  const wins = subset.filter((c) => c.result === 'WIN' || c.result === 'PUSH').length;
  return pct(wins, subset.length);
}

function tierCount(calls: BobCall[], tier: CallConfidence): number | null {
  const n = calls.filter((c) => c.confidence === tier).length;
  return n > 0 ? n : null;
}

function buildConfidenceCalibration(calls: BobCall[]): ConfidenceTierRow[] {
  return CONFIDENCE_TIER_META.map((meta) => ({
    ...meta,
    calls: tierCount(calls, meta.tier),
    accuracy: tierAccuracy(calls, meta.tier),
  }));
}

function buildWeeklyChart(calls: BobCall[]): WeeklyAccuracyPoint[] {
  const resolved = calls.filter(
    (c) => c.result === 'WIN' || c.result === 'LOSS' || c.result === 'PUSH',
  );
  if (resolved.length === 0) return [];

  const byWeek = new Map<number, { bobW: number; bobT: number; conW: number; conT: number }>();

  for (const call of resolved) {
    const d = new Date(call.callDate);
    const week = Number.isFinite(d.getTime())
      ? Math.ceil((d.getTime() - new Date(d.getFullYear(), 8, 1).getTime()) / (7 * 86400000))
      : 1;
    const wk = Math.max(1, Math.min(18, week));
    if (!byWeek.has(wk)) byWeek.set(wk, { bobW: 0, bobT: 0, conW: 0, conT: 0 });
    const b = byWeek.get(wk)!;
    b.bobT += 1;
    if (call.result === 'WIN' || call.result === 'PUSH') b.bobW += 1;
  }

  let cumBobW = 0;
  let cumBobT = 0;
  const points: WeeklyAccuracyPoint[] = [];

  for (let wk = 1; wk <= 18; wk += 1) {
    const b = byWeek.get(wk);
    if (b) {
      cumBobW += b.bobW;
      cumBobT += b.bobT;
    }
    if (cumBobT > 0) {
      points.push({
        week: wk,
        bobAccuracy: Math.round((cumBobW / cumBobT) * 1000) / 10,
        consensusAccuracy: 50,
      });
    }
  }

  return points;
}

function mapDailyTaskRow(row: Record<string, unknown>): BobCall | null {
  const outcomeRaw = row.outcome ?? row.result ?? row.status;
  const outcome = String(outcomeRaw ?? 'pending').toLowerCase();
  if (outcome === 'pending') return null;

  const taskData = (row.task_data && typeof row.task_data === 'object'
    ? row.task_data
    : {}) as Record<string, unknown>;

  const playerName = String(
    taskData.player_name ?? taskData.get_player_name ?? taskData.give_player_name ?? '—',
  );
  const position = String(taskData.position ?? '—');
  const recRaw = String(
    row.recommendation ?? taskData.recommendation ?? taskData.verdict ?? 'Start',
  );
  const recommendation = parseRecommendation(recRaw);
  const confidencePct =
    row.confidence_pct != null
      ? Number(row.confidence_pct)
      : row.confidence_score != null
        ? Number(row.confidence_score)
        : null;

  const result = parseResult(String(outcomeRaw ?? 'pending'));

  return {
    id: String(row.id),
    callDate: String(row.generated_at ?? row.called_at ?? row.created_at ?? new Date().toISOString()),
    playerName,
    position,
    recommendation,
    confidence: confidenceFromPct(confidencePct),
    confidencePct,
    result,
    bobRating: row.bob_rating != null ? Number(row.bob_rating) : null,
    marketRank: row.market_rank != null ? String(row.market_rank) : null,
    marketImpact: row.market_impact != null ? String(row.market_impact) : null,
    missedBy: row.missed_by != null ? String(row.missed_by) : null,
    outcomePct: row.outcome_pct != null ? Number(row.outcome_pct) : null,
  };
}

function mapStartSitRow(row: Record<string, unknown>): BobCall | null {
  const result = parseResult(String(row.result ?? 'pending'));
  if (result === 'PENDING') return null;

  const confidencePct = row.confidence_pct != null ? Number(row.confidence_pct) : null;

  return {
    id: String(row.id ?? `${row.player_id}-${row.week}`),
    callDate: String(
      row.called_at ?? row.created_at ?? `${row.season ?? 2026}-W${row.week ?? 1}`,
    ),
    playerName: String(row.player_name ?? '—'),
    position: String(row.position ?? '—'),
    recommendation: parseRecommendation(String(row.recommendation ?? 'Start')),
    confidence: confidenceFromPct(confidencePct),
    confidencePct,
    result,
    missedBy: row.missed_by != null ? String(row.missed_by) : null,
    outcomePct: row.point_delta != null ? Number(row.point_delta) : null,
  };
}

async function fetchBobCalls(userId: string): Promise<BobCall[]> {
  const supabase = createAdminClient();
  const calls: BobCall[] = [];

  try {
    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .neq('outcome', 'pending')
      .order('generated_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      for (const row of data) {
        const mapped = mapDailyTaskRow(row as Record<string, unknown>);
        if (mapped) calls.push(mapped);
      }
    }
  } catch (err) {
    console.error('[performance] daily_tasks fetch failed:', err);
  }

  try {
    const { data, error } = await supabase
      .from('startsit_history')
      .select('*')
      .eq('user_id', userId)
      .neq('result', 'pending')
      .order('week', { ascending: false })
      .limit(200);

    if (!error && data) {
      for (const row of data) {
        const mapped = mapStartSitRow(row as Record<string, unknown>);
        if (mapped) calls.push(mapped);
      }
    }
  } catch (err) {
    console.error('[performance] startsit_history fetch failed:', err);
  }

  try {
    const { data, error } = await supabase
      .from('bob_calls')
      .select('*')
      .eq('user_id', userId)
      .neq('outcome', 'pending')
      .order('called_at', { ascending: false })
      .limit(200);

    if (!error && data) {
      for (const row of data) {
        const mapped = mapDailyTaskRow({
          ...row,
          generated_at: (row as Record<string, unknown>).called_at,
        } as Record<string, unknown>);
        if (mapped) calls.push(mapped);
      }
    }
  } catch {
    // bob_calls table may not exist yet
  }

  calls.sort((a, b) => new Date(b.callDate).getTime() - new Date(a.callDate).getTime());

  const seen = new Set<string>();
  return calls.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

function computeStats(calls: BobCall[]): PerformancePageData['stats'] {
  const resolved = calls.filter(
    (c) => c.result === 'WIN' || c.result === 'LOSS' || c.result === 'PUSH',
  );
  const wins = resolved.filter((c) => c.result === 'WIN' || c.result === 'PUSH').length;
  const losses = resolved.filter((c) => c.result === 'LOSS').length;
  const pending = calls.filter((c) => c.result === 'PENDING').length;
  const decided = wins + losses;
  const bobAccuracy = pct(wins, decided);
  const hasSeasonData = decided > 0;

  return {
    totalCalls: calls.length,
    bobAccuracy,
    consensusAccuracy: null,
    ktcAccuracy: null,
    edge: bobAccuracy != null ? bobAccuracy - 50 : null,
    seasonRecord: { wins, losses, pending },
    hitRate: bobAccuracy,
    hasSeasonData,
  };
}

export async function fetchPerformanceData(userId: string): Promise<PerformancePageData> {
  const empty: PerformancePageData = {
    stats: {
      totalCalls: 0,
      bobAccuracy: null,
      consensusAccuracy: null,
      ktcAccuracy: null,
      edge: null,
      seasonRecord: { wins: 0, losses: 0, pending: 0 },
      hitRate: null,
      hasSeasonData: false,
    },
    consensus: { bob: null, fantasyPros: null, ktc: null, random: 50 },
    weeklyChart: [],
    categoryAccuracy: EMPTY_CATEGORY,
    confidenceCalibration: buildConfidenceCalibration([]),
    calls: [],
    hallOfFame: [],
    hallOfShame: [],
    modelTimeline: SEED_MODEL_TIMELINE,
    leagues: [],
  };

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (err) {
    console.error('[performance] createAdminClient failed:', err);
    return empty;
  }

  let leagues: PerformancePageData['leagues'] = [];
  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name')
      .eq('user_id', userId);
    if (error) throw error;
    leagues = data ?? [];
  } catch (err) {
    console.error('[performance] leagues fetch failed:', err);
  }

  const calls = await fetchBobCalls(userId);
  const stats = computeStats(calls);
  const categoryAccuracy: CategoryAccuracy = {
    buyNow: categoryPct(calls, 'Buy Now'),
    buyWindow: categoryPct(calls, 'Buy Window'),
    sellNow: categoryPct(calls, 'Sell Now'),
    sellWindow: categoryPct(calls, 'Sell Window'),
    startCalls: categoryPct(calls, 'Start'),
    sitCalls: categoryPct(calls, 'Sit'),
  };

  const resolved = calls.filter(
    (c) => c.result === 'WIN' || c.result === 'LOSS' || c.result === 'PUSH',
  );
  const hallOfFame = [...resolved]
    .filter((c) => c.result === 'WIN')
    .sort((a, b) => sortByOutcomeMagnitude(a, b, true))
    .slice(0, 5);
  const hallOfShame = [...resolved]
    .filter((c) => c.result === 'LOSS')
    .sort((a, b) => sortByOutcomeMagnitude(a, b, true))
    .slice(0, 5);

  return {
    stats,
    consensus: {
      bob: stats.bobAccuracy,
      fantasyPros: stats.consensusAccuracy,
      ktc: stats.ktcAccuracy,
      random: 50,
    },
    weeklyChart: buildWeeklyChart(calls),
    categoryAccuracy,
    confidenceCalibration: buildConfidenceCalibration(calls),
    calls,
    hallOfFame,
    hallOfShame,
    modelTimeline: SEED_MODEL_TIMELINE,
    leagues,
  };
}
