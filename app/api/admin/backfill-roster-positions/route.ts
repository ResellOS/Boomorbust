import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchLeagueFull } from '@/lib/sleeper';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// Protected like other admin tasks: a logged-in admin OR a Bearer CRON_SECRET
// (so it can be triggered from a script).
async function authorized(req: Request): Promise<boolean> {
  const auth = req.headers.get('authorization');
  if (process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && user.email === process.env.ADMIN_EMAIL) return true;
  } catch {
    /* fall through */
  }
  return false;
}

// POST /api/admin/backfill-roster-positions — populate leagues.roster_positions
// from Sleeper (fetchLeagueFull) for every connected league.
export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = createAdminClient();
  const { data: leagues, error } = await db.from('leagues').select('id, name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let updated = 0;
  let noData = 0;
  let failed = 0;
  const failures: { id: string; name?: string; reason: string }[] = [];

  for (const lg of leagues ?? []) {
    try {
      const full = await fetchLeagueFull(lg.id);
      const rp = full?.roster_positions ?? null;
      if (!rp || rp.length === 0) {
        noData += 1;
        failures.push({ id: lg.id, name: lg.name, reason: 'no roster_positions from Sleeper' });
        continue;
      }
      const { error: upErr } = await db
        .from('leagues')
        .update({ roster_positions: rp })
        .eq('id', lg.id);
      if (upErr) {
        failed += 1;
        failures.push({ id: lg.id, name: lg.name, reason: upErr.message });
      } else {
        updated += 1;
      }
    } catch (e) {
      failed += 1;
      failures.push({ id: lg.id, name: lg.name, reason: e instanceof Error ? e.message : 'unknown' });
    }
  }

  return NextResponse.json({
    total: leagues?.length ?? 0,
    updated,
    noData,
    failed,
    failures: failures.slice(0, 25),
  });
}
