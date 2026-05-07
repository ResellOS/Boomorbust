# The Front Office — Full Product Overview
_Complete technical reference for resuming AI-assisted development_

---

## 1. Product Identity

**App name**: The Front Office (package name: `the-front-office`)
**Brand tagline**: "Boom or Bust" dynasty fantasy football command center
**Domain**: `thefrontoffice.app`
**Repo**: `G:\SaaSylum\FantasySmartass\dynasty-command-center`
**Vercel project**: `resell-os/dynasty-command-center` (linked, not yet deployed to prod)
**Git user**: ResellOS / branch: main

The app is a **Bloomberg-terminal-style dynasty fantasy football dashboard**. Users connect their Sleeper account, sync their leagues, and get a live "empire" view: portfolio value (KTC), boom/bust radar hubs, roster health, trade signals, waiver wire intel, and an AI coach. The aesthetic is dark glass-morphism, neon accents, monospace tactical fonts — deliberately dense and high-information.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14.2.35, App Router, TypeScript |
| Auth | Supabase (`@supabase/ssr`) — email/password |
| Database | Supabase PostgreSQL (Row-Level Security) |
| Cache | Upstash Redis — 5-min TTL on snapshot API |
| Styling | Tailwind CSS + custom CSS (globals.css) |
| Fonts | Bebas Neue (display `.display`), Inter (body), JetBrains Mono (`--font-mono-tactical`) |
| Animation | Framer Motion, custom CSS animations |
| Charts | SVG (hand-rolled, not Recharts) — jagged polyline Bloomberg style |
| State | React hooks + `useMemo`/`useState` (no global store) |
| AI Coach | `@anthropic-ai/sdk` — Claude Sonnet at `/api/coach` and `/api/trade/coach` |
| Billing | Stripe — free/pro/elite tiers |
| Email | Resend — weekly digest |
| Analytics | `@vercel/analytics`, `@vercel/speed-insights` |
| External APIs | Sleeper API (`https://api.sleeper.app/v1`), KeepTradeCut (KTC), ESPN team logos |

**`next.config.mjs`** allows remote images from: `sleepercdn.com/avatars/**`, `sleepercdn.com/content/nfl/players/**`, `a.espncdn.com/i/teamlogos/nfl/**`. Landing page (`/`) has aggressive no-cache headers (CDN bypass).

---

## 3. Authentication & Data Flow

### Auth flow
1. User signs up at `/auth/signup` → Supabase creates `auth.users` entry
2. `/onboarding` — 4-step wizard:
   - **Step 1 (connect)**: Enter Sleeper username → lookup `https://api.sleeper.app/v1/user/{username}` → save `sleeper_user_id` + `username` to `profiles`
   - **Step 2 (leagues)**: Paste league IDs → validate each against `https://api.sleeper.app/v1/league/{id}` → POST `/api/sync`
   - **Step 3 (syncing)**: Loading state while `/api/sync` runs
   - **Step 4 (done)**: Success count shown, navigate to `/dashboard`

### Layout auth guard
`app/dashboard/layout.tsx` (Server Component):
- Calls `supabase.auth.getUser()`
- No user → redirect `/auth/login`
- No `sleeper_user_id` → redirect `/onboarding`
- Detects tier from `profiles.is_paid` + `profiles.preference_data.subscription_tier`
- Renders `NavBar` with `tier` and `empireTicker` props

### Supabase clients
- **Server** (`lib/supabase/server.ts`): `createServerClient` from `@supabase/ssr`, reads cookies from `next/headers`
- **Client** (`lib/supabase/client.ts`): `createBrowserClient` from `@supabase/ssr`
- RLS enforced at DB level; all queries are scoped to the authenticated user

---

## 4. Database Schema (inferred from queries)

```sql
-- profiles: one row per auth user
profiles (
  id          uuid PRIMARY KEY,  -- = auth.users.id
  sleeper_user_id  text,
  username    text,
  is_paid     boolean,
  preference_data  jsonb   -- { subscription_tier: 'free'|'pro'|'elite', ... }
)

-- leagues: synced from Sleeper
leagues (
  id           text PRIMARY KEY,  -- Sleeper league_id
  user_id      uuid REFERENCES profiles(id),
  name         text,
  season       text,
  total_rosters int
)

-- rosters: one row per team per league
rosters (
  league_id    text,
  roster_id    int,
  owner_id     text,   -- Sleeper user_id of the manager
  players      text[], -- player_ids on this roster
  starters     text[], -- player_ids in starting slots
  settings     jsonb   -- Sleeper roster settings
)

-- ktc_values: KeepTradeCut dynasty valuations
ktc_values (
  player_name  text,
  ktc_value    int
)

-- player_value_history: Redis-backed rolling KTC series
-- Accessed via getPlayerValueHistory(playerId) → number[]
```

---

## 5. Key Routes & Pages

### Public
- `/` — Landing page (heavy marketing; `Cache-Control: no-store`)
- `/auth/login` — Email/password sign-in
- `/auth/signup` — Email/password registration
- `/terms` — Terms of service

### Onboarding
- `/onboarding` — 4-step wizard (Sleeper connect → league IDs → sync → done)

### Dashboard (all guarded by `app/dashboard/layout.tsx`)
- `/dashboard` — **Main HUD** (the Boom or Bust command center — see §6)
- `/dashboard/trade` — Trade lab
- `/dashboard/trade/finder` — Trade finder
- `/dashboard/rankings` — Player rankings
- `/dashboard/rankings/arbitrage` — Arbitrage opportunities
- `/dashboard/portfolio` — Portfolio deep-dive
- `/dashboard/picks` — Draft pick analyzer
- `/dashboard/rookies` — Rookie rankings
- `/dashboard/lineup` — Lineup optimizer
- `/dashboard/optimizer` — Advanced lineup optimizer
- `/dashboard/war-room` — War room draft tool
- `/dashboard/alerts` — Price/injury alerts
- `/dashboard/handcuffs` — Handcuff recommendations
- `/dashboard/coach` — AI coach (Claude)
- `/dashboard/managers` — Manager analysis
- `/dashboard/league/[id]` — Per-league deep-dive
- `/dashboard/mission-control` — Mission control overview
- `/dashboard/settings` — Settings (sync, billing)
- `/dashboard/wrapped` — Season wrapped stats
- `/wrapped/2025` — Standalone wrapped shareable

### Admin
- `/admin` — Admin dashboard (separate layout)

---

## 6. Main Dashboard (`/dashboard/page.tsx`)

The centerpiece of the app. Client component that composes the entire HUD.

### Layout structure
```
bg-[#060910] with two radial-gradient overlays (cyan top, green bottom-right)
└── glass outer container (border, backdrop-blur-[32px])
    └── 12-col grid
        ├── col-span-9  <main>
        │   ├── Row 1 (shrink-0)
        │   │   ├── ProjectionChart      xl:col-span-8
        │   │   └── PlayerHubCard × 2   xl:col-span-4 (2-col grid)
        │   ├── Row 2 (shrink-0)
        │   │   ├── StarTistCard        xl:col-span-3
        │   │   ├── RosterRester        xl:col-span-3
        │   │   ├── OvervaluedAssets    xl:col-span-3
        │   │   └── TradeAnalyzerNote   xl:col-span-3
        │   └── Row 3 (flex-1 min-h-0)
        │       ├── WaiverWatchlist     xl:col-span-8
        │       └── MyLeaguesCompact    xl:col-span-4
        └── col-span-3  <TradeHubSidebar>  (hidden on mobile)
```

### Data flow
1. `useDashboardSnapshot()` → `GET /api/dashboard/snapshot` → `DashboardSnapshot`
2. Ownership filtering: `ownedIds = new Set(data.ownedPlayerIds)` (only set if non-empty; `null` = no filter)
3. `mvpPool` / `threatPool` filtered through `ownedIds`
4. `useHubRotation()` auto-rotates through each pool every 8s (mvp), 8s (threat), 6s (portfolio), 5s (health)
5. `portfolioSeries` — computed from `data.portfolioHistory` (per-league or aggregate depending on `selectedLeagueId`)
6. Chart toggle: `chartVsLeague` switches portfolio chart to show delta vs league average benchmark
7. Loading state: "Syncing Empire..." centered fullscreen
8. Error state: "Snapshot Unavailable" with link to `/onboarding`

---

## 7. API Routes

### `/api/dashboard/snapshot` (GET)
The **primary data engine**. `force-dynamic`, `revalidate=0`. Cached in Upstash Redis for 5 min (`dashboard:snapshot:v4:{userId}`).

**What it does (in order):**
1. Auth check via Supabase
2. Fetch `profiles` (for `sleeper_user_id`) + `leagues` from DB
3. `fetchNflState()` → current season + week from Sleeper
4. `fetchWeekMatchups(season, week)` → opponent lookup for matchup labels
5. `fetchAllPlayers()` + `getKTCValues()` → player DB + KTC map (in parallel)
6. Query all `rosters` for user's leagues
7. **CRITICAL OWNERSHIP**: `rs.find(r => String(r.owner_id) === ownerSid)` — NEVER falls back to `rs[0]`
8. `fetchLeagueMatchups()` per league × current week (parallel)
9. Compute empire score, opp score, win count
10. Portfolio MVP per league (biggest share of team's weekly points)
11. Weekly history — last 6 weeks (parallel matchup fetches)
12. Weekly annotations (best player per historical week)
13. Prior-week PPG vs this week → boom/bust rotation pools (5-week lookback)
14. Roster health (injured/questionable/suspended counts)
15. StarTist card (portfolio MVP or highest KTC player)
16. Waiver targets — Sleeper trending adds (24h), filtered to non-owned skill players
17. Latest trade offers — pending `trade` transactions involving user's roster
18. Per-league health scores + summaries + portfolio value aggregation
19. Benchmarks — average roster KTC per league for comparison
20. Market trends (5 synthetic metrics)
21. Player gaps (top 6 KTC players on user's roster with positional rank)
22. Overvalued assets — high-KTC players with production below 40th-percentile PPG
23. Trade scenario — sell/buy suggestion from overvalued vs waiver intersection
24. `ownedPlayerIds[]` — full list of player_ids on user's rosters

**Returns**: `DashboardSnapshot` (see types in `route.ts` lines 24-235)

### `/api/sync` (POST)
Syncs Sleeper leagues to Supabase. Called from onboarding and settings.

### `/api/trade/analyze` (POST)
Trade analysis engine.

### `/api/coach` (GET/POST) and `/api/coach/chat` (POST)
AI coach via Anthropic SDK (Claude Sonnet).

### `/api/trade/coach` (POST)
Trade-specific AI coaching.

### `/api/values` (GET)
Returns KTC values from Supabase.

### `/api/players` (GET) and `/api/players/resolve` (POST)
Player lookup utilities.

### `/api/players/value-history` and `/api/players/value-history-batch`
KTC value history series for sparklines.

### Cron jobs (`/api/cron/*`)
- `sync-sleeper` — pull fresh roster data from Sleeper API
- `sync-ktc` — update KTC values from external source
- `sync-injuries` — injury status updates
- `sync-projections` — player projection updates
- `calculate-bbv` — Boom/Bust Value calculation
- `check-price-alerts` — notify users of value spikes
- `send-digest` — weekly email via Resend
- `aggregate-market` — market trend aggregation
- `collect-drafts` — draft pick data
- `resolve-sitstart` — sit/start recommendations
- `sync-manager-profiles` — manager profile sync
- `sync-college` — college player data
- `update-college-rankings` — college rankings update

### Stripe routes (`/api/stripe/*`)
- `create-checkout`, `checkout`, `portal`, `webhook`, `billing-summary`

---

## 8. Components

### Dashboard Components (`components/dashboard/`)

#### `ProjectionChart.tsx`
Portfolio Value chart (SVG hand-rolled).
- **Line style**: Jagged polyline (straight `M…L…L` segments, NOT Catmull-Rom). `strokeLinecap="square"` `strokeLinejoin="miter"` for Bloomberg hard corners.
- **Line**: `stroke="#00ff88"` `strokeWidth={2.5}` with triple-layer drop-shadow glow
- **Area fill**: gradient from `rgba(0,255,136,0.20)` at top to `0.03` at 85%
- **Benchmark line**: dashed gray `rgba(148,163,184,0.45)` with `strokeDasharray="6 5"`
- **Axes**: X labels at bottom, Y on left with KTC suffix
- **Controls**: "vs league" toggle button + "Clear league" button

#### `PlayerHubCard.tsx`
Boom/Bust player spotlight card with SVG radar chart.
- **Variants**: `mvp` (emerald `#36E7A1`) or `threat` (blood red `#EF4444`)
- **Radar**: Pentagon SVG polygon (5 axes per position), fill gradient 0.4→0.14 opacity, stroke with glow filter
- **Position axes** (from `radarMetrics.ts`):
  - QB: Passing Vol, Rushing Val, O-Line Qual, WR Quality, Scheme
  - RB: Rushing Val, Target Shr, O-Line Qual, Explosive %, RedZone
  - WR: Air Yards, Target %, QB Qual, Separation, Red Zone
  - TE: Air Yards, Target %, QB Qual, Red Zone, O-Line Qual
- **Background**: `linear-gradient(180deg, rgba(6,28,18,0.55) 0%, rgba(13,17,23,0.35) 62%)` (mvp)
- **Team halo**: radial gradient using `nflTeamPrimaryHex(team)` behind headshot
- **Photo**: floating cutout `h-[7.25rem]` with `drop-shadow` glow
- **Rotation indicator**: `{i+1} / {total}` when `rotationTotal > 1`

#### `RosterRester.tsx`
Roster health gauge.
- **SVG**: 100×100, circular gauge ring
- `RING_R=36`, `TRACK_W=7`, `RING_W=11` (chunky neon ring)
- **Colors**: cyan `#00E5FF` (≥80), amber `#FBBF24` (≥60), red `#FF5757` (<60)
- **Arc label**: "ROSTER RESTING…" text on curved `textPath`
- **Score**: center `text-3xl font-black` in ring color
- **Entries**: colored dot rows (injured=red, questionable=amber, IR=gray)

#### `OvervaluedAssets.tsx`
Top 3 sell candidates.
- Glass card rows with SELL badge
- **SELL badge**: `linear-gradient(180deg, #FF6B6B, #EF4444)` with triple red glow
- Player photo (36px), name, position/team/stats, KTC value + MO delta

#### `TradeHubSidebar.tsx`
Right sidebar — "Command Hub". Bloomberg-terminal density.
- **Width**: `col-span-3` (3 of 12 cols)
- **Sections**: Market Trends, Latest Offers, Player Gaps (all `pt-1 pb-1`, `space-y-0.5`)
- **Market Trends**: dual mini SVG preview charts (40×12px sparklines, 88×28 area charts labeled "PIVOT α" / "EXPANDED"), 5 trend rows
- **Latest Offers**: player avatar + position/team colored by `POS_COLORS`, signed score with glow
- **Player Gaps**: colored position chip + player name + signed % delta
- **POS_COLORS**: `WR=#22D3EE, RB=#36E7A1, QB=#FEBC2E, TE=#A78BFA`

#### `TradeAnalyzerNote.tsx`
Trade insight card. When `tradeScenario` present: side-by-side sell/buy headshot comparison with red "Selling" / green "Buying" badges and gain% verdict.

#### `StarTistCard.tsx`
Portfolio star player card. Shows player photo, KTC metric, week points, win-share %, sparkline.

#### `WaiverWatchlist.tsx`
Waiver wire targets. Trending adds from Sleeper (24h window), filtered to non-owned skill players.

#### `MyLeaguesCompact.tsx`
League selector list. Click to filter ProjectionChart to that league. Color-coded: green=BOOM, red=BUST, amber=STABLE.

#### `radarMetrics.ts`
Exports:
- `getRadarMetrics(position, playerId, stats?, signal?)` → `RadarMetric[]`
- `getPositionAccent(position)` → `{ hex, glow }` for position color
- `normalizePosition(position)` → `'QB'|'RB'|'WR'|'TE'|'OTHER'`

---

## 9. Ghost Player Prevention (Critical)

This is the most important data-integrity invariant. "Ghost players" appear when a user sees another manager's players on their dashboard.

### Two-layer defense

**Layer 1 — Server (snapshot API)**:
```typescript
// app/api/dashboard/snapshot/route.ts ~line 397
const yours = ownerSid ? rs.find((r) => String(r.owner_id) === ownerSid) : undefined;
if (!yours) continue; // NEVER falls back to rs[0]
```
`ownerSid` = `profiles.sleeper_user_id` cast to string. If no match, the league is silently skipped (not included in empire data).

**Layer 2 — Client (dashboard page)**:
```typescript
// app/dashboard/page.tsx ~line 53
const ownedIds = useMemo(() => {
  const ids = data?.ownedPlayerIds;
  if (!ids?.length) return null as Set<string> | null;
  return new Set(ids);
}, [data?.ownedPlayerIds]);

// Player pool filters use: if (!ownedIds) return pool; else pool.filter(p => ownedIds.has(p.player_id))
// null = no filter (safe when ownership already server-verified)
// empty Set = block all (shouldn't happen in practice)
```

**Layer 3 — `useSleeper` hook** (`hooks/useSleeper.ts`):
Client-side Supabase query that fetches owned player IDs directly. Adds `.eq('owner_id', ownerSid)` filter at the DB query level — Supabase enforces this server-side before data arrives.

---

## 10. Visual Design System

### Glass morphism
```css
/* app/globals.css */
.glass-panel {
  background: rgba(13, 17, 23, 0.52);
  backdrop-filter: blur(28px) saturate(1.28);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow:
    inset 0 0 24px rgba(255,255,255,0.06),
    inset 0 1px 0 rgba(255,255,255,0.07),
    0 0 0 1px rgba(0,0,0,0.35),
    0 12px 48px rgba(0,0,0,0.55);
}
```

### Color palette
| Token | Value | Use |
|-------|-------|-----|
| Background | `#060910` / `#080A0F` | Page backgrounds |
| Glass base | `rgba(13,17,23,0.52)` | Panel backgrounds |
| Neon green (boom) | `#36E7A1` | MVP, positive signals |
| Neon red (bust) | `#EF4444` | Threat, negative signals |
| Neon cyan | `#22D3EE` | WR color, UI accents |
| Portfolio green | `#00ff88` | Chart line |
| Live red | `#FF5757` | Live dot, alerts |
| Amber | `#FBBF24` / `#FEBC2E` | QB color, warnings |
| Purple | `#A78BFA` | TE color |
| Slate | `#475569`–`#94A3B8` | Secondary text, borders |

### Key utility classes
- `.glow-green` — text with green drop-shadow
- `.glow-red` — text with red drop-shadow
- `.glow-cyan-strong` — text with cyan drop-shadow
- `.font-mono-tactical` — JetBrains Mono font
- `.display` — Bebas Neue font
- `.live-dot` — animated red pulse dot (for "Live" label)
- `.glass-panel` — main glass card style
- `.glass-panel-elevated` — elevated variant
- `.glass-card` — alternate card style
- `.bg-targeting` — dot-grid background pattern
- `.skeleton` — loading skeleton shimmer

### Chart style principles
- NO smooth curves — jagged angular polylines only (Bloomberg terminal aesthetic)
- `strokeLinecap="square"` `strokeLinejoin="miter"` on all chart paths
- Multi-layer drop-shadow for neon glow effect
- Area fills at very low opacity (0.03–0.20) to preserve depth
- Dashed benchmark lines in slate at 45% opacity

---

## 11. Sleeper API Integration (`lib/sleeper.ts`)

Base URL: `https://api.sleeper.app/v1`

**Key types:**
```typescript
SleeperLeague { league_id, name, season, total_rosters, status, sport }
SleeperRoster { roster_id, owner_id, players: string[], starters: string[], settings: { wins, losses, ... } }
SleeperMatchup { roster_id, matchup_id, points, players_points: Record<pid, number>, starters }
```

**Key functions:**
- `fetchNflState()` → `{ season, week, display_week }`
- `fetchUserLeagues(userId, season)` → user's leagues
- `fetchLeagueRosters(leagueId)` → all rosters in league
- `fetchLeagueMatchups(leagueId, week)` → matchup data
- `fetchTransactions(leagueId, week)` → trades/waivers
- `fetchTrendingPlayers(type, lookbackHours, limit)` → trending adds/drops
- `fetchAllPlayers()` → full NFL player database (`PlayerMap`)

**Photo URL**: `https://sleepercdn.com/content/nfl/players/{player_id}.jpg`

---

## 12. KTC (KeepTradeCut) Value System

- Values stored in Supabase `ktc_values` table
- Looked up by `player_name.toLowerCase()` → `ktc_value` (integer, e.g. 8500)
- Display formatting: `≥1000 → "8.5K"`, else `"850"`
- Hero formatting: `"8.5k"` (lowercase k) for empire total headline
- Portfolio value = sum of KTC values across all owned players in all leagues
- Benchmark = average roster KTC across all teams in each league

---

## 13. Billing (Stripe)

**Tiers**: `free`, `pro`, `elite`
**Detection**: `profiles.is_paid` + `profiles.preference_data.subscription_tier`

Routes:
- `POST /api/stripe/create-checkout` — create Stripe Checkout session
- `GET /api/stripe/portal` — billing portal redirect
- `POST /api/stripe/webhook` — Stripe webhook handler (updates `profiles`)
- `GET /api/stripe/billing-summary` — current billing status

---

## 14. AI Coach (`/api/coach`, `/api/trade/coach`)

Uses `@anthropic-ai/sdk` with Claude Sonnet.
- `/dashboard/coach` page — free-form coaching chat
- `/api/trade/coach` — trade-specific analysis with roster context injected as system prompt
- Streaming responses via `ReadableStream`

---

## 15. Environment Variables Required

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
ANTHROPIC_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
```

---

## 16. Hooks

| Hook | File | Purpose |
|------|------|---------|
| `useDashboardSnapshot` | `hooks/useDashboardSnapshot.ts` | Fetches `/api/dashboard/snapshot`, `no-store` cache |
| `useSleeper` | `hooks/useSleeper.ts` | Client-side strict ownership (Set of owned player_ids) |
| `useHubRotation` | `hooks/useHubRotation.ts` | Auto-increments index on interval for card rotation |
| `useDashboardData` | `hooks/useDashboardData.ts` | Alternative Supabase-direct hook for other pages |

---

## 17. Known Issues & Constraints

1. **Ghost player risk**: MUST always use `owner_id === ownerSid` matching — NEVER fall back to `rs[0]`. This was a production bug that showed other managers' players on the user's HUD.

2. **TypeScript Set iteration**: Spreading a `Set<string>` into a new Set (`new Set([...set].filter(...))`) causes TS2802 (downlevelIteration). Use `array.filter(id => set.has(id))` instead — iterate the array, not the Set.

3. **Vercel deploy**: Project is linked (`resell-os/dynasty-command-center`) but production deploy has NOT been executed. Run `vercel --prod` from `G:\SaaSylum\FantasySmartass\dynasty-command-center` after confirming with user.

4. **Snapshot cache key**: Currently `dashboard:snapshot:v4:{userId}`. Increment to `v5` after any breaking changes to `DashboardSnapshot` type.

5. **`useSleeper` vs snapshot ownership**: The hook is defined but may not be used in the main dashboard page's ownership filter (the page uses `data.ownedPlayerIds` from snapshot directly). The `useSleeper` hook exists as a secondary defense layer.

6. **No `downlevelIteration`**: The tsconfig does not enable `downlevelIteration`. Avoid `for...of` on Sets and spreading Sets in TypeScript — use `.forEach()` or convert to array first.

---

## 18. File Tree Summary

```
dynasty-command-center/
├── app/
│   ├── layout.tsx                          # Root: fonts, metadata, Vercel analytics
│   ├── page.tsx                            # Landing page
│   ├── globals.css                         # Design system: glass-panel, glow classes, etc.
│   ├── dashboard/
│   │   ├── layout.tsx                      # Auth guard + NavBar
│   │   ├── page.tsx                        # MAIN HUD (Boom or Bust command center)
│   │   ├── trade/page.tsx                  # Trade lab
│   │   ├── trade/finder/page.tsx           # Trade finder
│   │   ├── rankings/page.tsx               # Rankings
│   │   ├── rankings/arbitrage/page.tsx     # Arbitrage
│   │   ├── portfolio/page.tsx              # Portfolio
│   │   ├── picks/page.tsx                  # Pick analyzer
│   │   ├── rookies/page.tsx                # Rookie rankings
│   │   ├── lineup/page.tsx                 # Lineup optimizer
│   │   ├── optimizer/page.tsx              # Advanced optimizer
│   │   ├── war-room/page.tsx               # War room
│   │   ├── alerts/page.tsx                 # Alerts
│   │   ├── handcuffs/page.tsx              # Handcuffs
│   │   ├── coach/page.tsx                  # AI coach
│   │   ├── managers/page.tsx               # Manager analysis
│   │   ├── league/[id]/page.tsx            # Per-league view
│   │   ├── mission-control/page.tsx        # Mission control
│   │   ├── settings/page.tsx               # Settings
│   │   └── wrapped/page.tsx                # Season wrapped
│   ├── api/
│   │   ├── dashboard/snapshot/route.ts     # PRIMARY DATA API
│   │   ├── sync/route.ts                   # Sleeper sync
│   │   ├── trade/analyze/route.ts          # Trade analysis
│   │   ├── trade/coach/route.ts            # Trade AI
│   │   ├── coach/route.ts                  # AI coach
│   │   ├── coach/chat/route.ts             # Coach streaming
│   │   ├── values/route.ts                 # KTC values
│   │   ├── players/route.ts                # Player lookup
│   │   ├── stripe/                         # Billing
│   │   └── cron/                           # Background jobs
│   ├── auth/login/page.tsx
│   ├── auth/signup/page.tsx
│   ├── onboarding/page.tsx                 # 4-step Sleeper connect wizard
│   ├── admin/                              # Admin dashboard
│   └── wrapped/2025/page.tsx               # Shareable wrapped
├── components/
│   ├── dashboard/
│   │   ├── ProjectionChart.tsx             # Portfolio value chart (jagged SVG)
│   │   ├── PlayerHubCard.tsx               # Boom/Bust radar card
│   │   ├── RosterRester.tsx                # Roster health gauge
│   │   ├── OvervaluedAssets.tsx            # Top 3 sell signals
│   │   ├── TradeHubSidebar.tsx             # Right Command Hub sidebar
│   │   ├── TradeAnalyzerNote.tsx           # Trade insight card
│   │   ├── StarTistCard.tsx                # Portfolio star player
│   │   ├── WaiverWatchlist.tsx             # Waiver wire targets
│   │   ├── MyLeaguesCompact.tsx            # League selector
│   │   └── radarMetrics.ts                 # Radar axes + position colors
│   ├── NavBar.tsx                          # Top navigation
│   ├── AppBackground.tsx                   # Background gradient wrapper
│   └── DashboardIconRail.tsx               # Mobile icon navigation
├── hooks/
│   ├── useDashboardSnapshot.ts             # Snapshot API fetch hook
│   ├── useSleeper.ts                       # Client-side ownership hook
│   ├── useHubRotation.ts                   # Auto-rotation timer
│   └── useDashboardData.ts                 # Supabase-direct data hook
├── lib/
│   ├── sleeper.ts                          # Sleeper API client
│   ├── sleeper/players.ts                  # fetchAllPlayers + PlayerMap type
│   ├── supabase/server.ts                  # Server Supabase client
│   ├── supabase/client.ts                  # Browser Supabase client
│   ├── values/ktc.ts                       # KTC value fetcher
│   ├── playerValueHistory.ts               # Redis-backed KTC history
│   ├── nfl/teamPrimaryHex.ts               # NFL team color map
│   ├── health/leagueHealthScore.ts         # Roster health algorithm
│   └── external/matchups.ts               # External matchup schedule
├── next.config.mjs                         # Image domains, no-cache headers
├── tailwind.config.ts                      # Tailwind + custom font/color config
├── tsconfig.json
└── package.json                            # App name: the-front-office
```

---

## 19. Current UI State vs Target Design

The dashboard has been rebuilt to match a "Bloomberg terminal" glass-morphism mock. Current state:

| Component | Status |
|-----------|--------|
| ProjectionChart | Jagged line, area fill, dashed benchmark — DONE |
| PlayerHubCard (Boom) | Emerald glow, team halo, radar fill 0.4/0.14 — DONE |
| PlayerHubCard (Bust) | Blood red variant — DONE |
| RosterRester | 3× ring width (RING_W=11), cyan/amber/red — DONE |
| OvervaluedAssets | SELL badge with red glow, glass rows — DONE |
| TradeHubSidebar | Bloomberg density (1px padding, 0.5px gaps, 7px text) — DONE |
| glass-panel | Semi-transparent 0.52 alpha, 28px blur — DONE |
| Ghost player prevention | Two-layer (server + client) — DONE |
| Vercel deploy | Linked, NOT yet deployed to production |
