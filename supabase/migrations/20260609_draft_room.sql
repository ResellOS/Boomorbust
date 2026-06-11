-- ============================================================
-- Mock Draft Room — session + pick logging (2026-06-09)
-- Feeds the draft-tendency / market engine. Writes happen via the
-- service-role admin client in /api/draft/*, so RLS is bypassed for
-- inserts; the policies below gate any direct authenticated access.
-- ============================================================

create table if not exists public.draft_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users on delete cascade,
  draft_type     text not null,                 -- 'startup' | 'rookie' | 'redraft'
  teams          int  not null,
  rounds         int  not null,
  scoring        text not null,                 -- 'ppr' | 'half_ppr' | 'standard'
  superflex      boolean not null default false,
  your_pick      int  not null,                 -- draft slot 1..teams
  status         text not null default 'in_progress', -- 'in_progress' | 'completed'
  grade          text,                          -- 'A' | 'B' | 'C' | 'D'
  avg_tfo        numeric,
  agreement_rate numeric,                        -- 0..100, % picks following BOB
  config         jsonb default '{}',
  created_at     timestamptz default now(),
  completed_at   timestamptz
);

create table if not exists public.draft_picks (
  id              bigserial primary key,
  session_id      uuid references public.draft_sessions on delete cascade,
  user_id         uuid references auth.users on delete set null,
  overall         int  not null,                -- 1-based overall pick number
  round           int  not null,
  slot            int  not null,                -- team slot 1..teams
  is_user         boolean not null default false,
  player_id       text,
  player_name     text,
  position        text,
  tfo_score       numeric,
  bob_rank        int,                          -- player's BOB rank in the pool
  market_rank     int,                          -- ADP / market-value rank
  followed_bob    boolean,                      -- user took BOB's top available
  scoring_context text default 'dynasty',
  created_at      timestamptz default now()
);

create index if not exists draft_picks_session_idx  on public.draft_picks(session_id);
create index if not exists draft_sessions_user_idx   on public.draft_sessions(user_id, created_at desc);

alter table public.draft_sessions enable row level security;
alter table public.draft_picks    enable row level security;

create policy "Users manage own draft sessions"
  on public.draft_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own draft picks"
  on public.draft_picks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
