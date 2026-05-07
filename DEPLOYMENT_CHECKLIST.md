# Boom or Bust — Deployment Checklist

## Pre-Deploy

- [ ] `npx tsc --noEmit` passes (or `npm run type-check`)
- [ ] All env vars confirmed in Vercel dashboard
- [ ] `CRON_SECRET` set in Vercel env vars (required for `/api/cron/*` bearer auth)
- [ ] `ANTHROPIC_API_KEY` set
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` set
- [ ] `UPSTASH_REDIS_REST_URL` set
- [ ] `UPSTASH_REDIS_REST_TOKEN` set
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `RESEND_API_KEY` set
- [ ] `OPENWEATHER_API_KEY` set
- [ ] `THE_ODDS_API_KEY` (optional — lineup uses default 75 if missing)

### On-demand API routes (not Vercel crons)

These live in the app but are **not** listed in `vercel.json` `crons` — they are invoked by the UI or other flows:

- `/api/cards/projection`
- `/api/optimizer/scan`
- `/api/rankings/dynasty-enriched`

### Cron routes (`vercel.json`)

Thirteen scheduled jobs are defined in `vercel.json`; each path must match `app/api/cron/<name>/route.ts`. Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` — ensure `CRON_SECRET` matches project env.

## Supabase Setup

Run these in Supabase SQL editor if tables don't exist:

```sql
CREATE TABLE IF NOT EXISTS sitstart_accuracy (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id),
  league_id text NOT NULL,
  week integer NOT NULL,
  season text NOT NULL,
  total_recommendations integer DEFAULT 0,
  correct_recommendations integer DEFAULT 0,
  accuracy_pct float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS
  sitstart_accuracy_user_week
  ON sitstart_accuracy(user_id, week, season);
```

## Deploy Command

```bash
cd dynasty-command-center
vercel link   # first time only
vercel --prod
```

## Post-Deploy

- [ ] Test auth flow (signup → onboarding → dashboard)
- [ ] Test lineup optimizer (select league, run)
- [ ] Test trade analyzer
- [ ] Test arbitrage page (live KTC loads)
- [ ] Test optimizer scan button
- [ ] Test Twitter card generator
- [ ] Verify cron jobs in Vercel dashboard
- [ ] Check Redis cache keys in Upstash
