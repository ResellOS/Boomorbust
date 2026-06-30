import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  RECOMMENDATION_SURFACES,
  DOWN_REASON_VALUES,
  type RecommendationRating,
  type RecommendationSurface,
  type RecommendationDownReason,
} from '@/lib/feedback/recommendation';

export const dynamic = 'force-dynamic';

interface Body {
  surface?: string;
  subjectType?: string;
  subjectId?: string;
  rating?: string;
  reason?: string | null;
  context?: Record<string, unknown> | null;
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const surface = body.surface as RecommendationSurface;
  const rating = body.rating as RecommendationRating;
  const subjectId = (body.subjectId ?? '').trim();
  const subjectType = (body.subjectType ?? '').trim();

  if (!surface || !RECOMMENDATION_SURFACES.has(surface)) {
    return NextResponse.json({ error: 'Invalid surface' }, { status: 400 });
  }
  if (rating !== 'up' && rating !== 'down') {
    return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
  }
  if (!subjectId || subjectId.length > 200) {
    return NextResponse.json({ error: 'Invalid subjectId' }, { status: 400 });
  }
  if (!subjectType || subjectType.length > 64) {
    return NextResponse.json({ error: 'Invalid subjectType' }, { status: 400 });
  }

  // Reason only applies to thumbs-down; ignore/clear it otherwise.
  let reason: RecommendationDownReason | null = null;
  if (rating === 'down' && body.reason) {
    if (!DOWN_REASON_VALUES.has(body.reason as RecommendationDownReason)) {
      return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });
    }
    reason = body.reason as RecommendationDownReason;
  }

  const { error } = await supabase.from('recommendation_feedback').upsert(
    {
      user_id: user.id,
      surface,
      subject_type: subjectType,
      subject_id: subjectId,
      rating,
      reason,
      context: body.context ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,surface,subject_id' },
  );

  if (error) {
    console.error('[recommendation-feedback] upsert failed:', error);
    return NextResponse.json({ error: 'Could not save feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

// Clear a previously-given vote (toggle off).
export async function DELETE(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const surface = searchParams.get('surface') as RecommendationSurface | null;
  const subjectId = (searchParams.get('subjectId') ?? '').trim();

  if (!surface || !RECOMMENDATION_SURFACES.has(surface) || !subjectId) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { error } = await supabase
    .from('recommendation_feedback')
    .delete()
    .eq('user_id', user.id)
    .eq('surface', surface)
    .eq('subject_id', subjectId);

  if (error) {
    console.error('[recommendation-feedback] delete failed:', error);
    return NextResponse.json({ error: 'Could not clear feedback' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
