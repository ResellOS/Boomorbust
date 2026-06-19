import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MIN_ACTIVE_MS, PROMPT_COOLDOWN_MS } from '@/lib/feedback/types';

export const dynamic = 'force-dynamic';

function parseActiveMs(raw: string | null): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function cooldownClear(lastPrompt: string | null): boolean {
  if (!lastPrompt) return true;
  const last = new Date(lastPrompt).getTime();
  if (!Number.isFinite(last)) return true;
  return Date.now() - last >= PROMPT_COOLDOWN_MS;
}

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activeMs = parseActiveMs(req.nextUrl.searchParams.get('activeMs'));

  const { data: profile } = await supabase
    .from('profiles')
    .select('last_feedback_prompt_at')
    .eq('id', user.id)
    .maybeSingle();

  const lastPrompt = (profile as { last_feedback_prompt_at?: string | null } | null)
    ?.last_feedback_prompt_at ?? null;

  const shouldShow =
    activeMs >= MIN_ACTIVE_MS && cooldownClear(lastPrompt);

  return NextResponse.json({
    shouldShow,
    activeMsRequired: MIN_ACTIVE_MS,
    cooldownMs: PROMPT_COOLDOWN_MS,
    lastPromptAt: lastPrompt,
  });
}

/** Record "Maybe later" — starts the 7-day cooldown without submitting feedback. */
export async function PATCH() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('profiles')
    .update({ last_feedback_prompt_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Could not update prompt timestamp' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
