-- players table — seeded from Sleeper API, refreshed weekly
-- Run at: https://app.supabase.com/project/jotxstcrirvpswdcqwj/sql/new

CREATE TABLE IF NOT EXISTS public.players (
  player_id          text        PRIMARY KEY,
  full_name          text        NOT NULL,
  first_name         text,
  last_name          text,
  position           text        NOT NULL,
  team               text,
  age                integer,
  status             text        NOT NULL DEFAULT 'active',  -- active | inactive | injured_reserve
  depth_chart_order  integer,
  injury_status      text,
  search_rank        integer,
  years_exp          integer,
  college            text,
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_position    ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_team        ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_full_name   ON players(full_name);
CREATE INDEX IF NOT EXISTS idx_players_status      ON players(status);
CREATE INDEX IF NOT EXISTS idx_players_search_rank ON players(search_rank ASC NULLS LAST);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Public read — no PII, league-level player data only
CREATE POLICY "Public read on players"
  ON public.players FOR SELECT
  USING (true);
