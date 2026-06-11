/**
 * Blueprint engine — generates a 3-year dynasty franchise plan per league.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getContentionWindow } from '@/lib/league/contentionWindow';
import type { ContentionWindow } from '@/lib/league/contentionWindow';

export interface YearOutlook {
  year: number;
  status: ContentionWindow['status'];
  summary: string;
}

export interface TradeTarget {
  player_id: string;
  name: string;
  position: string;
  reasoning: string;
}

export interface Blueprint {
  contentionWindow: ContentionWindow;
  coreStrengths: string[];
  keyRisks: string[];
  threeYearOutlook: YearOutlook[];
  topTradeTargets: TradeTarget[];
  recommendations: string[];
  dontOverpayFor: string[];
  confidence: number;
}

export async function generateBlueprint(
  userId: string,
  leagueId: string,
): Promise<Blueprint> {
  const supabase = createAdminClient();
  const currentYear = new Date().getFullYear();

  const [contentionWindow] = await Promise.all([
    getContentionWindow(userId, leagueId),
  ]);

  const { data: profile } = await supabase
    .from('profiles')
    .select('sleeper_user_id')
    .eq('id', userId)
    .maybeSingle();

  const sleeperUserId = (profile as { sleeper_user_id?: string } | null)?.sleeper_user_id;

  const { data: roster } = await supabase
    .from('rosters')
    .select('players')
    .eq('league_id', leagueId)
    .eq('owner_id', sleeperUserId ?? userId)
    .maybeSingle();

  const playerIds = ((roster as { players?: string[] | null } | null)?.players ?? []) as string[];

  // Load player values and TFO data
  const { data: pvRows } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, ktc_value, delta, tfo_score, trend')
    .in('player_id', playerIds)
    .order('bvi_score', { ascending: false });

  type PvRow = {
    player_id: string;
    bvi_score: number;
    ktc_value: number;
    delta: number;
    tfo_score: number;
    trend: string;
  };

  const pv = (pvRows ?? []) as PvRow[];

  const { data: bbvRows } = await supabase
    .from('bbv_values')
    .select('player_id, player_name, position, age')
    .in('player_id', playerIds);

  type BbvRow = { player_id: string; player_name: string; position: string; age: number | null };
  const bbvMap = new Map(((bbvRows ?? []) as BbvRow[]).map((r) => [r.player_id, r]));

  // Core strengths: top 3 BVI players
  const coreStrengths: string[] = [];
  const top3 = pv.slice(0, 3);
  for (const row of top3) {
    const p = bbvMap.get(row.player_id);
    if (p) {
      const signal = row.delta > 400 ? ' (undervalued)' : row.trend === 'RISING' ? ' (rising)' : '';
      coreStrengths.push(`${p.player_name} — BVI ${row.bvi_score}${signal}`);
    }
  }
  if (coreStrengths.length < 3) coreStrengths.push('Strong core assets in place');

  // Key risks: high MRS or declining TFO
  const keyRisks: string[] = [];
  const { data: tfoRows } = await supabase
    .from('formula_scores')
    .select('player_id, verdict, dms_score')
    .in('player_id', playerIds)
    .order('calculated_at', { ascending: false });

  type TfoRow = { player_id: string; verdict: string | null; dms_score: number | null };
  const tfoMap = new Map<string, TfoRow>();
  for (const r of (tfoRows ?? []) as TfoRow[]) {
    if (!tfoMap.has(r.player_id)) tfoMap.set(r.player_id, r);
  }

  const declining = pv.filter((r) => r.trend === 'FALLING').slice(0, 2);
  for (const row of declining) {
    const p = bbvMap.get(row.player_id);
    if (p) keyRisks.push(`${p.player_name} — TFO trending down. Consider selling.`);
  }

  const bustPlayers = pv.filter((r) => {
    const t = tfoMap.get(r.player_id);
    return t?.verdict === 'BUST' || t?.verdict === 'LEAN_BUST';
  }).slice(0, 2);
  for (const row of bustPlayers) {
    const p = bbvMap.get(row.player_id);
    if (p) keyRisks.push(`${p.player_name} — BUST signal. High sell priority.`);
  }

  while (keyRisks.length < 3) keyRisks.push('Monitor aging core for decline signals');

  // Three-year outlook
  const threeYearOutlook: YearOutlook[] = [
    {
      year: currentYear,
      status: contentionWindow.status,
      summary:
        contentionWindow.status === 'CONTENDING'
          ? `Win-now window open. ${contentionWindow.titlesOdds} title odds.`
          : contentionWindow.status === 'TRANSITIONING'
            ? 'Building toward contention. Be selective at the deadline.'
            : 'Rebuild year. Stack picks and youth.',
    },
    {
      year: currentYear + 1,
      status: contentionWindow.status === 'REBUILDING' ? 'TRANSITIONING' : contentionWindow.status,
      summary:
        contentionWindow.status === 'CONTENDING'
          ? 'Peak window. All-in if core stays healthy.'
          : 'Roster should be ascending. Target proven youth.',
    },
    {
      year: currentYear + 2,
      status: contentionWindow.status === 'REBUILDING' ? 'CONTENDING' : contentionWindow.status,
      summary:
        contentionWindow.status === 'REBUILDING'
          ? 'Rebuild should be complete. Expect playoff contention.'
          : 'Maintain core or start transition to next window.',
    },
  ];

  // Top trade targets: players not on roster with high BVI in league
  const { data: targetRows } = await supabase
    .from('player_values')
    .select('player_id, bvi_score, delta, tfo_score')
    .not('player_id', 'in', `(${playerIds.map((id) => `"${id}"`).join(',') || '""'})`)
    .gt('bvi_score', 60)
    .gt('delta', 5)
    .order('bvi_score', { ascending: false })
    .limit(10);

  type TargetRow = { player_id: string; bvi_score: number; delta: number; tfo_score: number };

  const { data: targetBbv } = await supabase
    .from('bbv_values')
    .select('player_id, player_name, position')
    .in('player_id', ((targetRows ?? []) as TargetRow[]).map((r) => r.player_id));

  type TargetBbv = { player_id: string; player_name: string; position: string };
  const targetBbvMap = new Map(((targetBbv ?? []) as TargetBbv[]).map((r) => [r.player_id, r]));

  const topTradeTargets: TradeTarget[] = ((targetRows ?? []) as TargetRow[])
    .slice(0, 3)
    .map((row) => {
      const p = targetBbvMap.get(row.player_id);
      return {
        player_id: row.player_id,
        name: p?.player_name ?? row.player_id,
        position: p?.position ?? '',
        reasoning: `BVI ${row.bvi_score}, delta +${row.delta}. Undervalued by market.`,
      };
    });

  // Recommendations
  const recommendations: string[] = [];
  if (contentionWindow.status === 'CONTENDING') {
    recommendations.push('Sell your best rebuilding picks for proven 25-27 year old starters.');
    recommendations.push('Prioritize players with BOOM TFO signals this week.');
  } else {
    recommendations.push('Acquire draft picks. Target picks over 28+ year old veterans.');
    recommendations.push('Buy low on players with declining TFO who are under 24.');
  }
  recommendations.push('Review your weakest TFO position and target upgrades.');
  recommendations.push('Check sell-high alerts weekly — BVI drops signal sell windows.');
  recommendations.push('Run Trade Analyzer before accepting any offer.');

  // Don't overpay for
  const dontOverpayFor: string[] = [];
  const overvalued = pv
    .filter((r) => r.delta < -400)
    .slice(0, 2)
    .map((r) => {
      const p = bbvMap.get(r.player_id);
      return p ? `${p.player_name} (BVI below market)` : null;
    })
    .filter(Boolean) as string[];

  dontOverpayFor.push(...overvalued);
  dontOverpayFor.push('1st-round picks in a deep rebuild class without KTC context');
  while (dontOverpayFor.length < 3) dontOverpayFor.push('Aging stars past their age curve peak');

  const confidence = Math.min(
    92,
    60 + (pv.length > 5 ? 15 : 0) + (topTradeTargets.length > 0 ? 10 : 0) + (playerIds.length > 10 ? 7 : 0),
  );

  return {
    contentionWindow,
    coreStrengths: coreStrengths.slice(0, 5),
    keyRisks: keyRisks.slice(0, 5),
    threeYearOutlook,
    topTradeTargets,
    recommendations: recommendations.slice(0, 5),
    dontOverpayFor: dontOverpayFor.slice(0, 3),
    confidence,
  };
}
