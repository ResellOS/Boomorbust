-- Run this in the Supabase dashboard SQL Editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  sleeper_user_id text,
  username text,
  risk_tolerance text default 'medium',
  preference_data jsonb default '{}',
  is_paid boolean default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  updated_at timestamptz default now()
);

-- Leagues table
create table if not exists public.leagues (
  id text primary key,               -- Sleeper league_id
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  season text not null,
  total_rosters integer,
  scoring_settings jsonb default '{}',
  settings jsonb default '{}',
  status text,
  synced_at timestamptz default now()
);

-- Rosters table
create table if not exists public.rosters (
  id serial primary key,
  roster_id integer not null,
  league_id text references public.leagues on delete cascade not null,
  owner_id text,
  players text[] default '{}',
  starters text[] default '{}',
  settings jsonb default '{}',
  unique(roster_id, league_id)
);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.rosters enable row level security;

-- Profiles policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Leagues policies
create policy "Users can view own leagues"
  on public.leagues for select
  using (auth.uid() = user_id);

create policy "Users can insert own leagues"
  on public.leagues for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leagues"
  on public.leagues for update
  using (auth.uid() = user_id);

create policy "Users can delete own leagues"
  on public.leagues for delete
  using (auth.uid() = user_id);

-- Rosters policies (access via league ownership)
create policy "Users can view rosters in own leagues"
  on public.rosters for select
  using (
    exists (
      select 1 from public.leagues
      where leagues.id = rosters.league_id
        and leagues.user_id = auth.uid()
    )
  );

create policy "Users can insert rosters in own leagues"
  on public.rosters for insert
  with check (
    exists (
      select 1 from public.leagues
      where leagues.id = rosters.league_id
        and leagues.user_id = auth.uid()
    )
  );

create policy "Users can update rosters in own leagues"
  on public.rosters for update
  using (
    exists (
      select 1 from public.leagues
      where leagues.id = rosters.league_id
        and leagues.user_id = auth.uid()
    )
  );

-- Error logs table (admin visibility)
create table if not exists public.error_logs (
  id bigserial primary key,
  source text not null,
  message text not null,
  user_id uuid references auth.users on delete set null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.error_logs enable row level security;

-- Only service role can read/write error_logs (admin client bypasses RLS)
create policy "No direct user access to error_logs"
  on public.error_logs for all
  using (false);

-- Wrapped cards table (shareable Season Wrapped)
create table if not exists public.wrapped_cards (
  token text primary key,
  user_id uuid references auth.users on delete cascade not null,
  season text not null,
  data jsonb not null,
  created_at timestamptz default now()
);

alter table public.wrapped_cards enable row level security;

create policy "Users can view own wrapped cards"
  on public.wrapped_cards for select
  using (auth.uid() = user_id);

create policy "Users can insert own wrapped cards"
  on public.wrapped_cards for insert
  with check (auth.uid() = user_id);

-- Manager profiles — dynasty tendency analysis per roster per league
create table if not exists public.manager_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles on delete cascade,
  league_id text references public.leagues on delete cascade,
  sleeper_roster_id integer not null,
  sleeper_owner_id text,
  display_name text,
  avatar text,
  last_analyzed_at timestamptz,
  trade_count integer default 0,
  data jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(league_id, sleeper_roster_id)
);

alter table public.manager_profiles enable row level security;

create policy "Users can view manager profiles in their leagues"
  on public.manager_profiles for select
  using (
    exists (
      select 1 from public.leagues
      where leagues.id = manager_profiles.league_id
        and leagues.user_id = auth.uid()
    )
  );

create policy "Users can upsert manager profiles for their leagues"
  on public.manager_profiles for insert
  with check (
    exists (
      select 1 from public.leagues
      where leagues.id = manager_profiles.league_id
        and leagues.user_id = auth.uid()
    )
  );

create policy "Users can update manager profiles for their leagues"
  on public.manager_profiles for update
  using (
    exists (
      select 1 from public.leagues
      where leagues.id = manager_profiles.league_id
        and leagues.user_id = auth.uid()
    )
  );

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- F-FIG Prospect Scouting Table
-- Fantasy Football Impact Grade — 25-year backtest (2000-2025)
-- ============================================================
create table if not exists public.ffig_prospects (
  id uuid default gen_random_uuid() primary key,

  -- Identity
  player_id    text,
  player_name  text not null,
  position     text not null,    -- QB | RB | WR | TE
  draft_year   integer not null,
  draft_round  integer,
  draft_pick   integer,          -- overall pick number
  college      text,
  nfl_team     text,
  age_at_draft numeric,

  -- Base Prospect Metrics
  dom_score    numeric default 0,   -- college dominator rating 0-100
  ras_score    numeric default 5.0, -- relative athletic score 0-10
  breakout_age numeric,             -- age at first 20%+ dominator season
  target_share numeric default 0,   -- % of team targets/opportunities

  -- Penalty Flags
  small_school_penalty        boolean default false,  -- non-Power-4,   -5
  committee_backfield_penalty boolean default false,  -- RB committee, -10
  p2s_bust_penalty            boolean default false,  -- no path to starter, -15
  penalty_total               numeric default 0,

  -- Landing Spot Modifier (LSM)
  vacated_volume_mod numeric default 0,   -- +0.10 if >100 vacated opps
  qb_coefficient_mod numeric default 0,   -- +0.10 top QB / -0.10 poor QB
  scheme_proe_mod    numeric default 0,   -- +0.05 high pass-rate scheme
  lsm_total          numeric default 1.0,

  -- Final F-FIG Score
  ffig_score numeric,
  ffig_grade text,

  -- Backtest validation
  dynasty_hit boolean,
  career_ppg  numeric,

  created_at timestamptz default now()
);

alter table public.ffig_prospects enable row level security;

create unique index if not exists ffig_prospects_name_year
  on public.ffig_prospects (player_name, draft_year);

create policy "Public read on ffig_prospects"
  on public.ffig_prospects for select
  using (true);

-- ============================================================
-- BBV Values
-- Boom-or-Bust Value — opportunity-weighted dynasty score
-- Populated by /api/cron/calculate-bbv (Wednesdays 6am)
-- ============================================================
create table if not exists public.bbv_values (
  player_id   text primary key,
  player_name text,
  position    text,
  team        text,
  age         numeric,
  bbv_score   numeric not null default 0,
  bbsm_score  float,
  depth_order integer,
  ktc_value   numeric default 0,
  updated_at  timestamptz default now()
);

alter table public.bbv_values enable row level security;

create policy "Public read on bbv_values"
  on public.bbv_values for select
  using (true);

-- ============================================================
-- Dynasty Coach usage — Pro 10 msgs/day UTC (Elite exempt; tracked via RPC)
-- ============================================================
create table if not exists public.coach_usage (
  user_id uuid not null references auth.users on delete cascade,
  usage_date date not null,
  message_count integer not null default 0,
  updated_at timestamptz default now(),
  primary key (user_id, usage_date)
);

create index if not exists coach_usage_user_date_idx on public.coach_usage (user_id, usage_date desc);

alter table public.coach_usage enable row level security;

create policy "Users select own coach usage"
  on public.coach_usage for select
  using (auth.uid() = user_id);

create or replace function public.reserve_coach_message(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  d date := (timezone('utc', now()))::date;
  new_c integer;
  cap integer := 10;
begin
  if auth.uid() is not null and auth.uid() is distinct from p_user_id then
    return json_build_object('ok', false, 'error', 'forbidden');
  end if;

  insert into public.coach_usage (user_id, usage_date, message_count)
  values (p_user_id, d, 0)
  on conflict (user_id, usage_date) do nothing;

  select message_count into new_c from public.coach_usage
  where user_id = p_user_id and usage_date = d
  for update;

  new_c := coalesce(new_c, 0);

  if new_c >= cap then
    return json_build_object('ok', false, 'remaining', 0, 'tier', 'pro');
  end if;

  update public.coach_usage
  set message_count = message_count + 1,
      updated_at = now()
  where user_id = p_user_id and usage_date = d
  returning message_count into new_c;

  return json_build_object('ok', true, 'remaining', greatest(0, cap - coalesce(new_c, 0)), 'tier', 'pro');
end;
$$;

grant execute on function public.reserve_coach_message(uuid) to authenticated;
grant execute on function public.reserve_coach_message(uuid) to service_role;
