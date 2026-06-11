CREATE TABLE IF NOT EXISTS startsit_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  player_id text,
  league_id text,
  week integer,
  season integer,
  recommendation text,
  confidence integer,
  projected_points numeric,
  actual_points numeric,
  result text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_startsit_history_user_season
  ON startsit_history (user_id, season);

CREATE INDEX IF NOT EXISTS idx_startsit_history_user_week
  ON startsit_history (user_id, season, week);
