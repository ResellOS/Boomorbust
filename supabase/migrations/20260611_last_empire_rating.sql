-- Empire Rating delta: snapshot at each roster sync
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_empire_rating numeric;
