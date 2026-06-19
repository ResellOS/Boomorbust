import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FEEDBACK_BADGE, type FeedbackType } from '@/lib/feedback/types';

export const dynamic = 'force-dynamic';

const VALID_TYPES = new Set<FeedbackType>(['recommendation', 'bug', 'general']);

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { feedback_type?: string; content?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const feedbackType = body.feedback_type as FeedbackType;
  const content = (body.content ?? '').trim();

  if (!feedbackType || !VALID_TYPES.has(feedbackType)) {
    return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 });
  }
  if (content.length < 3) {
    return NextResponse.json({ error: 'Please enter at least 3 characters' }, { status: 400 });
  }
  if (content.length > 4000) {
    return NextResponse.json({ error: 'Feedback is too long (max 4000 characters)' }, { status: 400 });
  }

  const { error: insertErr } = await supabase.from('user_feedback').insert({
    user_id: user.id,
    feedback_type: feedbackType,
    content,
  });

  if (insertErr) {
    console.error('[feedback] insert failed:', insertErr);
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 });
  }

  await supabase
    .from('profiles')
    .update({ last_feedback_prompt_at: new Date().toISOString() })
    .eq('id', user.id);

  const { data: existingBadge } = await supabase
    .from('user_badges')
    .select('id')
    .eq('user_id', user.id)
    .eq('badge_type', FEEDBACK_BADGE.badgeType)
    .maybeSingle();

  let badgeAwarded = false;
  if (!existingBadge) {
    const { error: badgeErr } = await supabase.from('user_badges').insert({
      user_id: user.id,
      badge_type: FEEDBACK_BADGE.badgeType,
      badge_label: FEEDBACK_BADGE.badgeLabel,
    });
    if (!badgeErr) badgeAwarded = true;
    else console.error('[feedback] badge insert failed:', badgeErr);
  }

  return NextResponse.json({
    ok: true,
    badgeAwarded,
    badgeLabel: FEEDBACK_BADGE.badgeLabel,
  });
}
