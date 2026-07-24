import type { SupabaseClient } from '@supabase/supabase-js';

export interface ReconcileLeagueRow {
  id: string;
  name: string;
  status: string | null;
}

/**
 * Reconcile a user's league set with their roster membership.
 *
 * The `leagues` table is keyed by the Supabase auth uid (`user_id`) and can be
 * under-synced, while `rosters` (keyed by the Sleeper id, `owner_id`) is the
 * definitive membership. When the table returns fewer leagues than the user's
 * rosters imply, the header/sidebar under-count while the roster-derived content
 * shows the real leagues. This fills that gap: any roster league_id missing from
 * the table set is pulled by id (a league shared with another user already in the
 * table) or, as a last resort, named from Sleeper directly.
 *
 * No-op (zero extra queries) when the table set already covers every roster
 * league — so fully-synced accounts are unaffected.
 */
export async function reconcileLeaguesWithRosters(
  supabase: SupabaseClient,
  tableLeagues: ReconcileLeagueRow[],
  rosterLeagueIds: string[],
): Promise<ReconcileLeagueRow[]> {
  const have = new Set(tableLeagues.map((l) => String(l.id)));
  const missing = Array.from(new Set(rosterLeagueIds.map(String))).filter((id) => id && !have.has(id));
  if (missing.length === 0) return tableLeagues;

  const added: ReconcileLeagueRow[] = [];

  // 1) Shared leagues already present in the table under another user's row.
  try {
    const { data } = await supabase.from('leagues').select('id, name, status').in('id', missing);
    for (const r of (data ?? []) as { id: string; name: string | null; status: string | null }[]) {
      added.push({ id: String(r.id), name: r.name ?? 'League', status: r.status ?? null });
      have.add(String(r.id));
    }
  } catch {
    /* fall through to Sleeper */
  }

  // 2) Any still-missing league → read its name from Sleeper (read-only).
  const stillMissing = missing.filter((id) => !have.has(id));
  if (stillMissing.length > 0) {
    await Promise.all(
      stillMissing.map(async (id) => {
        try {
          const res = await fetch(`https://api.sleeper.app/v1/league/${encodeURIComponent(id)}`);
          if (!res.ok) return;
          const lg = (await res.json()) as { name?: string; status?: string } | null;
          added.push({ id, name: lg?.name ?? `League ${id.slice(-4)}`, status: lg?.status ?? null });
        } catch {
          /* skip unreachable league */
        }
      }),
    );
  }

  return [...tableLeagues, ...added];
}
