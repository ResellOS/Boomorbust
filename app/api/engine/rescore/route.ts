import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { triggerRescore } from '@/lib/engine/client';

export const dynamic = 'force-dynamic';

// POST /api/engine/rescore — authenticated trigger of a full engine rescore.
export async function POST() {
  let userId: string | null = null;
  try {
    const auth = createClient();
    const { data } = await auth.auth.getUser();
    userId = data?.user?.id ?? null;
  } catch (err) {
    console.error('[engine/rescore] getUser failed:', err);
  }
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const result = await triggerRescore('both', true);
  return NextResponse.json(result);
}
