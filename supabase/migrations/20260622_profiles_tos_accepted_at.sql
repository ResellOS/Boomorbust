-- Active acceptance of Terms of Service + Privacy Policy.
-- Stamped with now() when a NEW user checks the accept box during onboarding.
-- NULL = not yet accepted (legacy/existing users are not retroactively prompted;
-- the onboarding checkbox is skipped once this is set).
alter table public.profiles
  add column if not exists tos_accepted_at timestamptz default null;
