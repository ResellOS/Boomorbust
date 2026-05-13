ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS dms_score numeric DEFAULT 0;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS dms_tier text;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS bps_score numeric DEFAULT 0;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS dac_score numeric DEFAULT 0;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS dac_verdict text;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS ri_score numeric DEFAULT 0;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS ssas_score numeric DEFAULT 0;
ALTER TABLE public.tfo_cache ADD COLUMN IF NOT EXISTS sospp_score numeric DEFAULT 0;
