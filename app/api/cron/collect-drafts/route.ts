import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueDrafts, fetchDraftPicks, fetchLeagueFull } from '@/lib/sleeper';

function deriveScoringFormat(
  scoringSettings: Record<string, number>,
  rosterPositions: string[]
): string {
  if (rosterPositions.includes('SUPER_FLEX')) return 'superflex';
  const rec = scoringSettings?.rec ?? 0;
  if (rec >= 1) return 'ppr';
  if (rec >= 0.5) return 'half_ppr';
  return 'standard';
}

function pickToDecimal(round: number, slot: number): number {
  return parseFloat(`${round}.${String(slot).padStart(2, '0')}`);
}

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createAdminClient();
  const { data: leagues } = await db
    .from('leagues')
    .select('id, scoring_settings')
    .limit(40);

  if (!leagues?.length) return NextResponse.json({ collected: 0 });

  let collected = 0;

  for (const league of leagues) {
    try {
      const drafts = await fetchLeagueDrafts(league.id);
      const completed = drafts?.filter((d) => d.status === 'complete') ?? [];
      if (!completed.length) continue;

      // Skip draft_ids already in the table
      const { data: existing } = await db
        .from('draft_market_data')
        .select('draft_id')
        .in('draft_id', completed.map((d) => d.draft_id));
      const seen = new Set((existing ?? []).map((r: { draft_id: string }) => r.draft_id));
      const newDrafts = completed.filter((d) => !seen.has(d.draft_id));
      if (!newDrafts.length) continue;

      const fullLeague = await fetchLeagueFull(league.id);
      const rosterPositions = fullLeague?.roster_positions ?? [];
      const scoringFormat = deriveScoringFormat(
        (league.scoring_settings ?? {}) as Record<string, number>,
        rosterPositions
      );

      for (const draft of newDrafts) {
        const picks = await fetchDraftPicks(draft.draft_id);
        if (!picks?.length) continue;

        const draftType = draft.settings.rounds > 6 ? 'startup' : 'rookie';
        const rows = picks
          .filter((p) => p.player_id)
          .map((p) => ({
            draft_id: draft.draft_id,
            season: draft.season,
            draft_type: draftType,
            scoring_format: scoringFormat,
            player_id: p.player_id,
            pick_number: pickToDecimal(p.round, p.draft_slot),
            round: p.round,
            slot: p.draft_slot,
          }));

        if (rows.length) {
          await db
            .from('draft_market_data')
            .upsert(rows, { onConflict: 'draft_id,player_id' });
          collected += rows.length;
        }
      }
    } catch (err) {
      console.error(`collect-drafts failed for league ${league.id}:`, err);
    }
  }

  return NextResponse.json({ collected });
}
