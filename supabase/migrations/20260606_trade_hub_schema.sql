-- Trade Hub schema additions (run in Supabase SQL editor if not applied via CLI)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trade_counter_uses integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS trades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  league_id text,
  gave_players jsonb,
  received_players jsonb,
  verdict text,
  edge_score numeric,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trades_user_id_created_at_idx
  ON trades (user_id, created_at DESC);
