-- Run this in the Supabase dashboard SQL Editor

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  sleeper_user_id text,
  username text,
  risk_tolerance text default 'medium',
  preference_data jsonb default '{}',
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
