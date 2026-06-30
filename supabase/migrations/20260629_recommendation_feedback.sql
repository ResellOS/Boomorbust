-- Per-recommendation thumbs up / down feedback
-- Lightweight, optional signal attached to any BOB recommendation surface
-- (trade recs, player verdicts, lineup advice, draft pick suggestions).
-- Safe to re-run: IF NOT EXISTS guards throughout.

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- which product surface the recommendation came from
  surface      text        NOT NULL CHECK (surface IN ('trade', 'player_verdict', 'lineup', 'draft_pick')),
  -- the kind of thing being rated (player, trade, lineup slot, draft pick…)
  subject_type text        NOT NULL,
  -- stable id of the specific recommendation (player_id, trade_id, pick id, etc.)
  subject_id   text        NOT NULL,
  rating       text        NOT NULL CHECK (rating IN ('up', 'down')),
  -- only set on thumbs-down, and even then optional
  reason       text        CHECK (
                              reason IS NULL OR reason IN (
                                'not_enough_explanation',
                                'doesnt_make_sense',
                                'data_looks_wrong',
                                'disagree'
                              )
                            ),
  -- optional snapshot of what was on screen (verdict, league_id, week, score…)
  context      jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  -- one vote per user per recommendation; re-voting upserts
  UNIQUE (user_id, surface, subject_id)
);

CREATE INDEX IF NOT EXISTS recommendation_feedback_user_idx
  ON public.recommendation_feedback (user_id);
CREATE INDEX IF NOT EXISTS recommendation_feedback_subject_idx
  ON public.recommendation_feedback (surface, subject_id);
CREATE INDEX IF NOT EXISTS recommendation_feedback_created_idx
  ON public.recommendation_feedback (created_at DESC);

ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rec_feedback_select_own" ON public.recommendation_feedback;
CREATE POLICY "rec_feedback_select_own"
  ON public.recommendation_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "rec_feedback_insert_own" ON public.recommendation_feedback;
CREATE POLICY "rec_feedback_insert_own"
  ON public.recommendation_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rec_feedback_update_own" ON public.recommendation_feedback;
CREATE POLICY "rec_feedback_update_own"
  ON public.recommendation_feedback FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "rec_feedback_delete_own" ON public.recommendation_feedback;
CREATE POLICY "rec_feedback_delete_own"
  ON public.recommendation_feedback FOR DELETE
  USING (auth.uid() = user_id);
