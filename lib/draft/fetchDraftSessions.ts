import type { SupabaseClient } from '@supabase/supabase-js';
import type { DraftSessionSummary } from './types';

export async function fetchDraftSessions(
  supabase: SupabaseClient,
  userId: string,
): Promise<DraftSessionSummary[]> {
  try {
    const { data, error } = await supabase
      .from('draft_sessions')
      .select('id, draft_type, teams, rounds, status, grade, created_at, completed_at, config')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(40);
    if (error) throw error;

    const sessions: DraftSessionSummary[] = [];
    for (const row of data ?? []) {
      const cfg = (row.config ?? {}) as {
        draftName?: string;
        pickCount?: number;
        superflex?: boolean;
        yourPick?: number;
        draftOrderType?: string;
        thirdRoundReversal?: boolean;
      };
      let pickCount = cfg.pickCount ?? 0;
      if (!pickCount) {
        const { count } = await supabase
          .from('draft_picks')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', row.id);
        pickCount = count ?? 0;
      }
      sessions.push({
        id: String(row.id),
        draftName: cfg.draftName ?? 'Mock Draft',
        draftType: row.draft_type as DraftSessionSummary['draftType'],
        teams: row.teams,
        rounds: row.rounds,
        status: row.status as DraftSessionSummary['status'],
        grade: row.grade,
        createdAt: row.created_at ?? new Date().toISOString(),
        completedAt: row.completed_at,
        pickCount,
        superflex: cfg.superflex ?? false,
        yourPick: cfg.yourPick ?? 1,
        draftOrderType: (cfg.draftOrderType as DraftSessionSummary['draftOrderType']) ?? 'snake',
        thirdRoundReversal: cfg.thirdRoundReversal ?? false,
      });
    }
    return sessions;
  } catch (err) {
    console.error('[draft] sessions fetch failed:', err);
    return [];
  }
}
