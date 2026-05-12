-- Phase 0 Schema: 8 missing tables
-- Generated: 2026-05-11

-- ============================================================
-- 1. TRADES
-- Stores trade history from Sleeper sync + manual entries.
-- TRE verdict cached here for self-learning BVI engine.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.trades (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  league_id                text        REFERENCES public.leagues ON DELETE CASCADE NOT NULL,
  league_scoring_type      text        NOT NULL DEFAULT 'ppr',  -- ppr | half_ppr | standard | superflex
  assets_sent              text[]      NOT NULL DEFAULT '{}',    -- player_ids + pick strings sent
  assets_received          text[]      NOT NULL DEFAULT '{}',    -- player_ids + pick strings received
  counterparty_roster_id   integer,
  counterparty_owner_id    text,
  status                   text        NOT NULL DEFAULT 'accepted',  -- accepted | pending | rejected | countered
  tre_verdict              text,                                      -- WIN | EVEN | LOSS
  tre_score_sent           numeric,
  tre_score_received       numeric,
  source                   text        NOT NULL DEFAULT 'sleeper',   -- sleeper | manual
  sleeper_transaction_id   text        UNIQUE,
  notes                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trades_user_id_idx        ON public.trades (user_id);
CREATE INDEX IF NOT EXISTS trades_league_id_idx      ON public.trades (league_id);
CREATE INDEX IF NOT EXISTS trades_created_at_idx     ON public.trades (created_at DESC);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON public.trades FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON public.trades FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON public.trades FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 2. TFO_CACHE
-- Pre-computed TFO scores per player + scoring context.
-- Rebuilt nightly by edge function. Public read.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tfo_cache (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     text        NOT NULL,
  league_id     text,                          -- NULL = global (non-league-specific)
  scoring_type  text        NOT NULL DEFAULT 'ppr',
  tfo_score     numeric     NOT NULL DEFAULT 0,
  ops_score     numeric     DEFAULT 0,
  sfs_score     numeric     DEFAULT 0,
  ffig_score    numeric     DEFAULT 0,
  sit_score     numeric     DEFAULT 0,
  irs_score     numeric     DEFAULT 0,
  grade         text,                          -- ELITE | HIGH VALUE | VIABLE | SPECULATIVE | AVOID
  verdict       text,                          -- BOOM | LEAN_BOOM | NEUTRAL | LEAN_BUST | BUST
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, COALESCE(league_id, ''), scoring_type)
);

CREATE INDEX IF NOT EXISTS tfo_cache_player_idx      ON public.tfo_cache (player_id);
CREATE INDEX IF NOT EXISTS tfo_cache_verdict_idx     ON public.tfo_cache (verdict);
CREATE INDEX IF NOT EXISTS tfo_cache_score_idx       ON public.tfo_cache (tfo_score DESC);

ALTER TABLE public.tfo_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on tfo_cache"
  ON public.tfo_cache FOR SELECT
  USING (true);

-- ============================================================
-- 3. DMP_PROFILES (Dynasty Manager Profile)
-- 100-label hidden classification per user+league combo.
-- Never shown to users — powers Smart Counter personalization.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dmp_profiles (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  league_id     text        REFERENCES public.leagues ON DELETE CASCADE NOT NULL,
  labels        jsonb       NOT NULL DEFAULT '{}',   -- 100 hidden classification labels
  title         text,                                -- one of 10 public Dynasty Manager Titles
  trade_count   integer     NOT NULL DEFAULT 0,
  calculated_at timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, league_id)
);

CREATE INDEX IF NOT EXISTS dmp_profiles_user_id_idx  ON public.dmp_profiles (user_id);

ALTER TABLE public.dmp_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dmp_profiles"
  ON public.dmp_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dmp_profiles"
  ON public.dmp_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dmp_profiles"
  ON public.dmp_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- 4. MEDICAL_HISTORY
-- Per-player injury history feeding MRS + IRS engines.
-- Public read — no PII, player-level data only.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.medical_history (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         text        NOT NULL,
  injury_type       text        NOT NULL,  -- hamstring | acl | mcl | concussion | high_ankle | foot | etc.
  season            integer     NOT NULL,
  games_missed      integer     NOT NULL DEFAULT 0,
  recurrence_count  integer     NOT NULL DEFAULT 0,
  severity          text,                  -- minor | moderate | season_ending
  risk_flag         boolean     NOT NULL DEFAULT false,
  notes             text,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS medical_history_player_idx   ON public.medical_history (player_id);
CREATE INDEX IF NOT EXISTS medical_history_season_idx   ON public.medical_history (season DESC);
CREATE INDEX IF NOT EXISTS medical_history_risk_idx     ON public.medical_history (risk_flag) WHERE risk_flag = true;

ALTER TABLE public.medical_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on medical_history"
  ON public.medical_history FOR SELECT
  USING (true);

-- ============================================================
-- 5. NOTIFICATIONS
-- In-app alerts: sell-high signals, injury flags, digest pings.
-- Notification bell in Phase 2 reads from here.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  type          text        NOT NULL,  -- sell_high | buy_low | injury | trade_offer | digest | system
  player_id     text,
  league_id     text,
  message       text        NOT NULL,
  redirects_to  text,                  -- relative URL e.g. /dashboard/trade
  read          boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx   ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS notifications_unread_idx    ON public.notifications (user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS notifications_created_idx   ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- 6. PLAYER_VALUES (BVI Store)
-- Authoritative BVI / KTC / TFO per player per scoring type.
-- Display format: BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED
-- ============================================================
CREATE TABLE IF NOT EXISTS public.player_values (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     text        NOT NULL,
  scoring_type  text        NOT NULL DEFAULT 'ppr',  -- ppr | half_ppr | standard | superflex
  bvi_score     numeric     NOT NULL DEFAULT 0,
  ktc_value     numeric     NOT NULL DEFAULT 0,
  tfo_score     numeric     NOT NULL DEFAULT 0,
  delta         numeric     NOT NULL DEFAULT 0,  -- bvi_score - ktc_value (positive = undervalued by market)
  trend         text        NOT NULL DEFAULT 'neutral',  -- rising | falling | neutral
  calculated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, scoring_type)
);

CREATE INDEX IF NOT EXISTS player_values_player_idx  ON public.player_values (player_id);
CREATE INDEX IF NOT EXISTS player_values_bvi_idx     ON public.player_values (bvi_score DESC);
CREATE INDEX IF NOT EXISTS player_values_delta_idx   ON public.player_values (delta DESC);

ALTER TABLE public.player_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on player_values"
  ON public.player_values FOR SELECT
  USING (true);

-- ============================================================
-- 7. SCOUTING_PROFILES
-- F-FIG + RTS data per player. Rookies before Year 2.
-- After Year 2, TFO takes over fully.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.scouting_profiles (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           text        NOT NULL UNIQUE,
  draft_year          integer,
  draft_round         integer,
  draft_pick          integer,    -- overall pick number
  ffig_score          numeric,
  rts_score           numeric,
  landing_spot_data   jsonb       NOT NULL DEFAULT '{}',  -- vacated_volume, qb_tier, scheme_proe, lsm_total
  measurables         jsonb       NOT NULL DEFAULT '{}',  -- height, weight, forty_time, ras, breakout_age, dom_score
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS scouting_profiles_draft_year_idx  ON public.scouting_profiles (draft_year DESC);
CREATE INDEX IF NOT EXISTS scouting_profiles_ffig_idx        ON public.scouting_profiles (ffig_score DESC);

ALTER TABLE public.scouting_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read on scouting_profiles"
  ON public.scouting_profiles FOR SELECT
  USING (true);

-- ============================================================
-- 8. LEAGUE_SETTINGS
-- Per-league scoring context layer. Every TFO/BVI output
-- is filtered through these before surfacing to UI.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.league_settings (
  league_id             text        PRIMARY KEY REFERENCES public.leagues ON DELETE CASCADE,
  scoring_type          text        NOT NULL DEFAULT 'ppr',      -- ppr | half_ppr | standard
  roster_requirements   jsonb       NOT NULL DEFAULT '{}',       -- {qb:1, rb:2, wr:3, te:1, flex:1, sf:1}
  league_size           integer     NOT NULL DEFAULT 12,
  superflex             boolean     NOT NULL DEFAULT false,
  te_premium            boolean     NOT NULL DEFAULT false,
  taxi_squad            boolean     NOT NULL DEFAULT false,
  rookie_draft_format   text        NOT NULL DEFAULT 'linear',   -- linear | snake
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.league_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view league_settings for own leagues"
  ON public.league_settings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE leagues.id = league_settings.league_id
        AND leagues.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert league_settings for own leagues"
  ON public.league_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE leagues.id = league_settings.league_id
        AND leagues.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update league_settings for own leagues"
  ON public.league_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues
      WHERE leagues.id = league_settings.league_id
        AND leagues.user_id = auth.uid()
    )
  );
