-- Add roster_positions (Sleeper starting-lineup slots) to leagues.
-- Backfilled via /api/admin/backfill-roster-positions and kept current by
-- the sync-sleeper cron.
alter table public.leagues
  add column if not exists roster_positions jsonb;
