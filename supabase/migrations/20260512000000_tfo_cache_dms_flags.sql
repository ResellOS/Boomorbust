-- Add DMS columns and flags to tfo_cache
-- Phase 1F: DMS engine wired into nightly cache refresh

ALTER TABLE public.tfo_cache
  ADD COLUMN IF NOT EXISTS dms_score  numeric  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dms_tier   text     DEFAULT 'STABLE',
  ADD COLUMN IF NOT EXISTS flags      text[]   DEFAULT '{}';
