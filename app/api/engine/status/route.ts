import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getEngineStatus } from '@/lib/engine/client';

export const dynamic = 'force-dynamic';

// GET /api/engine/status — engine reachability + dynasty scoring snapshot.
export async function GET() {
  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[engine/status] getUser failed:', err);
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const engine = await getEngineStatus();
  const online = engine != null && engine.error == null && engine.ok !== false;

  let dynastyCount = 0;
  let lastRun: string | null = null;
  try {
    const supabase = createAdminClient();
    const { count } = await supabase
      .from('formula_scores')
      .select('id', { count: 'exact', head: true })
      .eq('scoring_context', 'dynasty');
    dynastyCount = count ?? 0;

    // formula_scores uses calculated_at (not updated_at).
    const { data } = await supabase
      .from('formula_scores')
      .select('calculated_at')
      .eq('scoring_context', 'dynasty')
      .order('calculated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    lastRun = (data?.calculated_at as string | null) ?? null;
  } catch (err) {
    console.error('[engine/status] db snapshot failed:', err);
  }

  return NextResponse.json({ online, lastRun, dynastyCount, engine });
}
