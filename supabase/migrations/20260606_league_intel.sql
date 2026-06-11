CREATE TABLE IF NOT EXISTS league_intel (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id text,
  manager_user_id text,
  li_score integer,
  trade_tendency text,
  draft_style text,
  aggression text,
  overpays_for text,
  calculated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_league_intel_league
  ON league_intel (league_id, calculated_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_league_intel_unique
  ON league_intel (league_id, manager_user_id);
