-- In-app feedback + profile badges
-- Safe to re-run: uses IF NOT EXISTS / IF NOT EXISTS columns

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_feedback_prompt_at timestamptz;

CREATE TABLE IF NOT EXISTS public.user_feedback (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  feedback_type text        NOT NULL CHECK (feedback_type IN ('recommendation', 'bug', 'general')),
  content       text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  is_reviewed   boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS user_feedback_user_id_idx ON public.user_feedback (user_id);
CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON public.user_feedback (created_at DESC);

CREATE TABLE IF NOT EXISTS public.user_badges (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_type  text        NOT NULL,
  awarded_at  timestamptz NOT NULL DEFAULT now(),
  badge_label text        NOT NULL,
  UNIQUE (user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS user_badges_user_id_idx ON public.user_badges (user_id);

-- Align legacy tables if they pre-existed with a different shape
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS feedback_type text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS is_reviewed boolean NOT NULL DEFAULT false;
ALTER TABLE public.user_feedback ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS badge_type text;
ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS badge_label text;
ALTER TABLE public.user_badges ADD COLUMN IF NOT EXISTS awarded_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users insert own feedback" ON public.user_feedback;
CREATE POLICY "Users insert own feedback"
  ON public.user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own feedback" ON public.user_feedback;
CREATE POLICY "Users read own feedback"
  ON public.user_feedback FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own badges" ON public.user_badges;
CREATE POLICY "Users read own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own badges" ON public.user_badges;
CREATE POLICY "Users insert own badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);
