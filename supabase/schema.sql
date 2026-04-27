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
