-- Run these migrations in the Supabase dashboard SQL Editor

-- Add Stripe + paid tier fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Wrapped results table (public read, owner insert)
CREATE TABLE IF NOT EXISTS public.wrapped_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  season text NOT NULL,
  token text UNIQUE NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wrapped_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrapped_public_read"
  ON public.wrapped_results FOR SELECT
  USING (true);

CREATE POLICY "wrapped_owner_insert"
  ON public.wrapped_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wrapped_owner_update"
  ON public.wrapped_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Error logs table (admin only via service role; no user-facing RLS needed)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only service role (admin client) can read/write error_logs
-- No user-facing policies — accessed exclusively via service role key

-- ============================================================
-- F-FIG Scouting Engine (2026-04-27)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ffig_prospects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id    text,
  player_name  text NOT NULL,
  position     text NOT NULL,
  draft_year   integer NOT NULL,
  draft_round  integer,
  draft_pick   integer,
  college      text,
  nfl_team     text,
  age_at_draft numeric,
  dom_score    numeric DEFAULT 0,
  ras_score    numeric DEFAULT 5.0,
  breakout_age numeric,
  target_share numeric DEFAULT 0,
  small_school_penalty        boolean DEFAULT false,
  committee_backfield_penalty boolean DEFAULT false,
  p2s_bust_penalty            boolean DEFAULT false,
  penalty_total               numeric DEFAULT 0,
  vacated_volume_mod numeric DEFAULT 0,
  qb_coefficient_mod numeric DEFAULT 0,
  scheme_proe_mod    numeric DEFAULT 0,
  lsm_total          numeric DEFAULT 1.0,
  ffig_score numeric,
  ffig_grade text,
  dynasty_hit boolean,
  career_ppg  numeric,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ffig_prospects_name_year
  ON public.ffig_prospects (player_name, draft_year);

ALTER TABLE public.ffig_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on ffig_prospects"
  ON public.ffig_prospects FOR SELECT
  USING (true);

-- ============================================================
-- BBV Values (2026-04-28)
-- Boom-or-Bust Value — opportunity-weighted dynasty score
-- Populated by /api/cron/calculate-bbv (every Wednesday 6am)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bbv_values (
  player_id   text PRIMARY KEY,
  player_name text,
  position    text,
  team        text,
  age         numeric,
  bbv_score   numeric NOT NULL DEFAULT 0,
  depth_order integer,
  ktc_value   numeric DEFAULT 0,
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.bbv_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on bbv_values"
  ON public.bbv_values FOR SELECT
  USING (true);

-- ============================================================
-- Draft Market Data (2026-04-28)
-- Anonymous pick-level data collected from synced leagues.
-- No user_id, no league_id — privacy-safe by design.
-- Populated by /api/cron/collect-drafts (daily 3am)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.draft_market_data (
  id          bigserial PRIMARY KEY,
  draft_id    text NOT NULL,
  season      text NOT NULL,
  draft_type  text NOT NULL,       -- 'startup' or 'rookie'
  scoring_format text NOT NULL,    -- 'superflex', 'ppr', 'half_ppr', 'standard'
  player_id   text NOT NULL,
  pick_number numeric NOT NULL,    -- 1.08 format (round.slot zero-padded)
  round       int NOT NULL,
  slot        int NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  UNIQUE(draft_id, player_id)
);

CREATE INDEX IF NOT EXISTS draft_market_data_lookup
  ON public.draft_market_data(season, draft_type, scoring_format);

CREATE INDEX IF NOT EXISTS draft_market_data_player
  ON public.draft_market_data(player_id);

ALTER TABLE public.draft_market_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on draft_market_data"
  ON public.draft_market_data FOR SELECT
  USING (true);

-- ============================================================
-- Verification codes (2026-04-29)
-- Shared BOB-XXX codes for Sleeper display-name ownership proof.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code       text NOT NULL UNIQUE,   -- e.g. 'BOB-247'
  is_active  boolean NOT NULL DEFAULT true,
  use_count  integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- Authenticated users read active codes (needed during onboarding)
CREATE POLICY "Authenticated users can read verification_codes"
  ON public.verification_codes FOR SELECT
  TO authenticated
  USING (true);

-- Server route increments use_count; allow authenticated callers via trusted API route
CREATE POLICY "Authenticated users can update verification_codes"
  ON public.verification_codes FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Seed initial active code — change or add rows as needed
INSERT INTO public.verification_codes (code, is_active)
  VALUES ('247', true)
  ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- Email waitlist (API uses service role — no public RLS insert)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.waitlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'boom-or-bust-page'
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- No policies: only service role / dashboard SQL can access this table.
