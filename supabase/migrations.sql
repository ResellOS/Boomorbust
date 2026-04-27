-- Run these migrations in the Supabase dashboard SQL Editor

-- Add Stripe + paid tier fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_paid boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Wrapped results table (public read, owner insert)
CREATE TABLE IF NOT EXISTS public.wrapped_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  season text NOT NULL,
  token text UNIQUE NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.wrapped_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wrapped_public_read"
  ON public.wrapped_results FOR SELECT
  USING (true);

CREATE POLICY "wrapped_owner_insert"
  ON public.wrapped_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wrapped_owner_update"
  ON public.wrapped_results FOR UPDATE
  USING (auth.uid() = user_id);

-- Error logs table (admin only via service role; no user-facing RLS needed)
CREATE TABLE IF NOT EXISTS public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Only service role (admin client) can read/write error_logs
-- No user-facing policies — accessed exclusively via service role key
