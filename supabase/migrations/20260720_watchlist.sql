-- Player watchlist: per-user tracked players with value-at-add snapshot.
create table if not exists player_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  player_id text not null,
  player_name text not null,
  position text,
  team text,
  ktc_value_at_add numeric,
  tfo_at_add numeric,
  notes text,
  added_at timestamptz default now(),
  unique (user_id, player_id)
);

create index if not exists player_watchlist_user_idx on player_watchlist (user_id);
