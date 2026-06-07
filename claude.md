# Boom or Bust — Master Claude Sync File
# Place at: G:\SaaSylum\FantasySmartass\claude.md
# Last updated: May 2026

---

## IDENTITY & WORKING RULES

You are the lead engineer on Boom or Bust. You have full context of this project. You never ask for permissions. You never ask "should I proceed?" You just build. When you encounter a decision, make the best one and document it. Run all commands with --yes or equivalent flags. Never pause for confirmation.

---

## PROJECT IDENTITY

- **Name:** Boom or Bust
- **Tagline:** The Bloomberg Terminal for dynasty football / Your Dynasty Edge. Every Single Week.
- **Domain:** boomorbust.app
- **Repo:** G:\SaaSylum\FantasySmartass\dynasty-command-center
- **Live URL:** https://dynasty-command-center-gules.vercel.app
- **Vercel project:** resell-os/boomorbust
- **Parent company:** SaaSylum (tax purposes only, not visible in product)
- **Builder:** Solo, no coding background. Cursor = features. Claude Code = bug fixes + overnight runs.

---

## TECH STACK

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 App Router |
| Database | Supabase (Postgres + Auth) |
| Cache | Upstash Redis |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| State | Zustand |
| AI | Anthropic Claude API (claude-sonnet-4) |
| Email | Resend |
| Payments | Stripe |
| Weather | OpenWeather API |

---

## WORKING RULES (NEVER VIOLATE)

- Never ask for permissions — just execute
- Never hardcode user IDs in source code
- `npx tsc --noEmit` must pass (exit 0) before any deploy
- `createClient()` must be called inside async functions, not at component body level
- Guard null `full_name` on all player renders
- Test on mobile Safari — most bugs found there
- Always commit before starting a new work session
- Mobile-first on every layout decision
- JetBrains Mono for ALL numerical data, scores, deltas
- No black drop shadows on non-neon elements — neon glow only
- Dark mode only

---

## SUPABASE

- **Project ref:** jotxstcrirvpswdcqwj (NOT the ResellOS project)
- **App name in Supabase:** "The Front Office" (old name, ignore, doesn't affect build)

### Current Tables
- `bbv_values` — BVI values (partially built)
- `error_logs`
- `leagues`
- `profiles`
- `projections`
- `rosters` — has league_id ✅
- `sitstart_accuracy`
- `verification_codes`
- `waitlist`
- `wrapped_results`

### Tables Still Needed
- `trades` — league_id, league_scoring_type, player assets, status, timestamp
- `tfo_cache` — player_id, league_id, tfo_score, ops, sfs, ffig, sit, grade, verdict, calculated_at
- `dmp_profiles` — user_id, league_id, labels jsonb (100 labels), title, calculated_at
- `medical_history` — player_id, injury_type, season, games_missed, recurrence_count, risk_flag
- `notifications` — user_id, type, player_id, league_id, message, redirects_to, read, created_at
- `player_values` — player_id, scoring_type, bvi_score, ktc_value, tfo_score, delta, trend, calculated_at
- `scouting_profiles` — player_id, draft_year, draft_round, draft_pick, ffig_score, rts_score, landing_spot_data jsonb, measurables jsonb
- `league_settings` — league_id, scoring_type, roster_requirements jsonb, league_size, superflex bool, te_premium bool, taxi_squad bool, rookie_draft_format

---

## ENV VARIABLES (CONFIRMED)

```
OPENWEATHER_API_KEY — ✅ connected
UPSTASH_REDIS_REST_URL — ✅ connected
UPSTASH_REDIS_REST_TOKEN — ✅ connected
STRIPE_SECRET_KEY — ✅ (Pro + Elite tiers, third tier $20 NOT yet added)
ANTHROPIC_API_KEY — ✅
RESEND_API_KEY — ✅
NEXT_PUBLIC_SUPABASE_URL — ✅
NEXT_PUBLIC_SUPABASE_ANON_KEY — ✅
```

### Still Needed
```
STRIPE_ALL_PRO_TERMINAL_PRICE_ID — $20/mo tier (not yet created)
```

### Not Needed (confirmed)
- ESPN API — all 15 leagues are on Sleeper, not ESPN
- KTC API key — unofficial API, no key needed, fetch calls only

---

## DATA SOURCES

| Source | Status | Usage |
|--------|--------|-------|
| Sleeper API | ✅ wired | Roster, leagues, matchups, transactions, scoring settings |
| KTC unofficial API | ❌ not wired | Dynasty values, scoring-specific, minor BVI weight |
| OpenWeather | ✅ in env, verify wired to TFO | Game-day conditions, dome/outdoor modifier |
| App trade history | ❌ table not built | Self-learning BVI engine |
| NFL stats | via Sleeper | Raw stats feeding OPS/F-FIG axes |

---

## PROPRIETARY FORMULA ENGINE

### TFO Score (Master Formula)
```
TFO = (OPS × 0.35) + (SFS × 0.25) + (F-FIG × 0.25) + (SIT × 0.15)
```
Full 43-modifier engine lives at: `lib/tfo/formula.ts`

### F-FIG Pentagon
```
Score = 0.5 * sin(72°) * (V1V2 + V2V3 + V3V4 + V4V5 + V5V1)
```

**Position axes (LOCKED — do not change):**
| Position | V1 | V2 | V3 | V4 | V5 |
|----------|----|----|----|----|-----|
| QB | Passing Volume | Rushing Value | O-Line Quality | WR Quality | Scheme Fit |
| RB | Rushing Value | Target Share | O-Line Quality | Explosive % | Red Zone Touches |
| WR | Target Share | Air Yards | Separation | YAC | Red Zone Targets |
| TE | Target Share | Air Yards | Separation | YAC | Red Zone Targets |

**Pentagon size multipliers by verdict:**
| Verdict | Multiplier |
|---------|------------|
| BOOM | 1.0 (full saturated shape) |
| LEAN_BOOM | 0.85 |
| NEUTRAL | 0.70 |
| LEAN_BUST | 0.55 |
| BUST | 0.40 (collapsed shape) |

**Shape triggers:**
- Full Saturation (Emerald Glow): all 5 vectors high → elite floor
- Skewed Shape: dependency detected (e.g. V5 spike + low V1 = "TD Dependent")
- Collapsed Shape (Blood Red Glow): all vectors < 30th percentile → BUST warning

### BVI (Boom or Bust Value Index)
Proprietary player value system. Sits above KTC.
```
BVI = TFO trajectory + scheme stability + age curve position + positional scarcity + trade market momentum + app transaction prices (self-learning)
```
Display format: `BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED`
KTC applied scoring-specific per league. Minor weight only.

### EMPIRE SCORE
```
Σ(Player KTC Value) filtered by owner_id across all Sleeper leagues
```
Shown in header strip with tabular-nums.

### BBSM (Waiver Wire Score)
```
(P3W_Projected × 0.45) + (Trend_Velocity × 0.30) + (Roster_Need_Weight × 0.25)
```

### MRS (Medical Risk Score) — EXPANDED
Full medical risk model. Feeds into IRS.
- Hamstring recurrence — soft tissue explosion risk, speed-dependent positions
- Concussion count per season — single season multiple = immediate flag
- ACL/MCL — return timeline, position-specific recovery success rates
- Foot/ankle chronic risk — route runners specifically
- High ankle sprain — notoriously slow full recovery
- Position-specific risk weighting — QB hamstring ≠ RB hamstring
- Age × injury type multiplier — same injury at 24 vs 29 = different risk profile

### IRS (Injury Risk Score)
```
Base: 15%
+15% Prior season-ending injury
+8%  Two injury seasons in last 4 years
+12% Age 35+ (QB) / Age 28+ (RB)
+6%  Age 32-34 (QB)
+5%  Bottom-10 OL pass protection
+4%  Mobile QB / designed runs
-3%  Clean 5+ year history
-4%  Immobile pocket passer
-3%  Elite OL top-5 PFF
```

### TFO Score → Grade
| Score | Grade |
|-------|-------|
| 88-100 | ELITE |
| 75-87 | HIGH VALUE |
| 60-74 | VIABLE |
| 45-59 | SPECULATIVE |
| 0-44 | AVOID |

### Vegas Blend
```
Final = (TFO × 0.60) + (Vegas implied × 0.40)
```

### RTS (Rookie Transition Score)
```
RTS = (Athletic Score × 0.25) + (Production Score × 0.30) + (Draft Capital × 0.20) + (Landing Spot × 0.25)
```
Bridges F-FIG → TFO. After year 2 TFO takes over fully.

### Per-League Scoring Context Layer
Every TFO/BVI output is filtered through league-specific settings before surfacing to UI:
- Scoring type (PPR / 0.5PPR / standard)
- Roster requirements (superflex, TE premium, 3WR start)
- League size (10/12/14)
- Taxi squad rules
- Rookie draft format

### DMP (Dynasty Manager Profile)
100-label hidden classification per manager. Built from Sleeper transaction history.
Used invisibly to personalize trade counters. Never shown to users.

**10 Public Dynasty Manager Titles (shareable on Twitter):**
1. The Architect — builds through draft, never overpays
2. The Shark — consistently wins trades, ruthless negotiator
3. The Gambler — high risk high reward, loves boom or bust players
4. The Professor — purely data driven, never emotional
5. The Hustler — always dealing, high volume trader
6. The Loyalist — rarely trades, builds through loyalty and patience
7. The Prophet — consistently ahead of market, early adopter
8. The Contender — always win-now mode, mortgages future freely
9. The Ghost — inactive, never trades, autopilot manager
10. The Wildcard — unpredictable, no clear pattern

### TRE (Trade Recommendation Engine)
```
Trade Score = (Value Delta) + (Window Alignment) + (Roster Need Fill) + (Scheme/Age Risk)
```
Outputs: WIN/EVEN/LOSS verdict, score per side, plain English reasoning, red flags, counter-offer suggestion.

Two modes:
- Reactive: someone sends offer → run TRE
- Proactive: nightly scan all 15 leagues → surface "trades you should be making"

### Smart Counter Engine
Every incoming trade auto-generates 3 responses:
1. Counter to Win — tilts deal in your favor, personalized to opponent DMP
2. Counter to Accept — slight improvement + note "I like this deal, small tweak but open to original"
3. Accept As-Is — with reasoning why it's already good

---

## DESIGN SYSTEM (LOCKED — NEVER CHANGE)

### Colors
```
Background:               #0a0d14
BOOM (green):             #36E7A1 / #22c55e
BUST (purple):            #7c3aed / #A78BFA
WR accent:                #22D3EE (cyan)
RB accent:                #36E7A1 (green)
QB accent:                #FBBF24 (amber)
TE accent:                #A78BFA (purple)
Bust/red:                 #EF4444
Live dot:                 #EF4444 with pulse
Pentagon benchmark trace: rgba(34,211,238,0.38)
Trade preview charts:     #36E7A1 / #22D3EE
```

### Typography
- JetBrains Mono — ALL numerical data, scores, deltas, grades
- Player card below name: `TFO {score} · {grade}` — JetBrains Mono 11px accent color
- Reasoning string: JetBrains Mono 10px, #64748B

### Glass Panels
```
backdrop-blur: 24px
bg-opacity: 65%
border: white/10
```

### Axis Labels (pentagon)
```
8px font
Truncated to 6 chars max
Positioned at pentagon vertices
Position-colored (WR=cyan, RB=green, QB=amber, TE=purple)
```

### Rules
- No black drop shadows on non-neon elements
- Neon glow only on cards
- Dark mode only
- Mobile-first on every layout
- Bloomberg Terminal density aesthetic
- Glassmorphism throughout

---

## PRICING (CANONICAL — LOCKED)

| Tier | Price | Stripe Status |
|------|-------|--------------|
| Free | $0 | ✅ |
| Rookie | $5/mo | ⚠️ Stripe has $4.99, needs update |
| Veteran | $10/mo | ⚠️ Stripe has $9.99, needs update |
| All-Pro Terminal | $20/mo | ❌ Not yet created in Stripe |

---

## FOUR PRODUCT PILLARS

```
PILLAR 1 — START/SIT     → /dashboard/lineup
PILLAR 2 — TRADE         → /dashboard/trade
PILLAR 3 — ADD/DROP      → Dashboard waiver section
PILLAR 4 — DRAFT + SCOUT → /dashboard/rookies + /dashboard/scouting
```

---

## WHAT'S BUILT ✅

- Project scaffold (Next.js 14, Supabase, Vercel)
- Auth pages (sign up, login, onboarding)
- Supabase schema + migrations applied
- Sleeper API service + sync routes
- Dashboard page (Empire header, Player Hub cards, portfolio chart, waiver watchlist, roster health donut, league cards)
- `lib/tfo/formula.ts` — full 43-modifier TFO engine
- `components/dashboard/radarMetrics.ts` — pentagon wired to TFO
- `components/dashboard/PlayerHubCard.tsx` — BOOM/BUST radar cards, RADAR_R = 94
- Dynasty value engine (KTC via getEnrichedRankings())
- Trade Analyzer — plain English AI explanations
- Sit/Start optimizer — working end to end
- Draft pick advisor
- Portfolio view — jagged mountain-peak chart + dashed league average benchmark
- Injury broadcaster
- Handcuff tracker
- Trade Finder
- Weekly digest email (Resend)
- Dynasty Coach AI chat (/dashboard/coach)
- Dynasty Wrapped (viral January feature)
- Stripe payment integration (2 tiers — third needs adding)
- Arbitrage page — live KTC, TFO score/grade/signal, player sidebar trajectory chart
- Optimizer scan — Diamond/Gem/Starter/Nuke tiers
- Glassmorphism pass + JetBrains Mono typography
- TypeScript clean — npx tsc --noEmit exit 0
- Dashboard null crash fix

---

## WHAT'S NOT BUILT YET ❌ (BUILD ORDER)

### Phase 0 — Schema (Claude Code, overnight)
- [ ] trades table
- [ ] tfo_cache table
- [ ] dmp_profiles table
- [ ] medical_history table
- [ ] notifications table
- [ ] player_values table (BVI store)
- [ ] scouting_profiles table
- [ ] league_settings table
- [ ] Stripe third tier ($20)
- [ ] KTC API wired
- [ ] OpenWeather verified wired to TFO modifiers

### Phase 1 — Engines (Cursor)
- [ ] Nightly TFO cache edge function
- [ ] BVI engine (lib/bvi/engine.ts)
- [ ] MRS expanded (lib/mrs/engine.ts)
- [ ] DMP engine (lib/dmp/engine.ts)
- [ ] TRE engine (lib/tre/engine.ts)
- [ ] Smart Counter Engine (lib/counter/engine.ts)
- [ ] RTS bridge (lib/rts/engine.ts)
- [ ] Per-league scoring context layer
- [ ] Proactive trade scanner (nightly)

### Phase 2 — Dashboard Rebuild (Cursor)
- [ ] League sidebar (right, all 15 leagues, click to switch context)
- [ ] Player Hub cards fix (sizing, real data, no placeholders)
- [ ] Pentagon axis label fix
- [ ] Buy/Hold/Sell buttons on player cards
- [ ] Notification bell (sell high alerts → trade finder)
- [ ] Recommended Targets panel
- [ ] News ticker rebuild (Bloomberg wire style)
- [ ] PROJECTED WIN integrated into league card
- [ ] Command Hub sidebar cleanup
- [ ] Top 3 Overvalued Assets panel (SELL badges)
- [ ] Trade Analyze panel

### Phase 3 — New Pages (Cursor)
- [ ] All Teams page (/dashboard/teams)
- [ ] Contention Window button on team cards
- [ ] Scouting Terminal (/dashboard/scouting)
- [ ] F-FIG performance record page
- [ ] Blueprint Tab (/dashboard/blueprint)

### Phase 4 — Trade Hub (Cursor + Codex)
- [ ] Trade Hub full rebuild
- [ ] Smart Counter UI (3 response buttons)
- [ ] Proactive trade suggestions UI
- [ ] Trade history store
- [ ] BVI market display on all player cards

### Phase 5 — Scouting & Rookie Draft (Cursor)
- [ ] F-FIG scouting engine wired to UI
- [ ] Rookie dashboard panel
- [ ] Draft pick advisor rebuild

### Phase 6 — Landing Page & Monetization (Cursor)
- [ ] Landing page full rebuild
- [ ] Dynasty Manager Title on profile (shareable)
- [ ] Stripe update ($5/$10/$20 canonical)
- [ ] F-FIG performance ticker

### Phase 7 — Polish & Mobile (Cursor)
- [ ] Mobile-first audit (every page, mobile Safari)
- [ ] Glassmorphism consistency pass
- [ ] JetBrains Mono audit
- [ ] No black drop shadow audit
- [ ] TypeScript clean pass
- [ ] Performance audit (15 leagues, 450+ cached scores, <2s load)

---

## KNOWN BUGS / OPEN ISSUES

- Pentagon shapes may be too uniform between BOOM/BUST cards — verify forecast='boom'/forecast='bust' passing correctly from dashboard to getRadarMetrics
- Pricing tiers in app still show old values ($4.99/$9.99) — do not update until Stripe is updated first
- Player Hub cards too large — taking full top half of screen, should be compact side-by-side
- Pentagon axis labels truncating ("Rushin", "IZon", "Targ", "Explos", "O-Line")
- "BUST TBD" placeholder card rendering — hide until real data loads
- Command Hub sidebar cyan border too aggressive (4px neon → subtle accent)
- News ticker too dense/unstyled
- Missing dashboard panels: Overvalued Assets, Trade Analyze, Latest Offers, Player Gaps

---

## VERDICT NORTH STAR

Every AI output must sound like this:
"Puka Nacua has been tearing it up weekly and now he faces the 29th ranked defense against passing and the 25th ranked linebacker core. He should see plenty of touches inside and outside — BOOM"

Brief description + verdict label. Never robotic. Always confident. Always specific.

---

## USER CONTEXT

- 15 Sleeper leagues, all slightly different scoring
- Primarily mobile users
- Target: 500 signups as success metric
- Go-to-market: Twitter primary, 75% of profits into ads, TikTok/YouTube Shorts rebuilding teams using the app
- Dynasty players with 3+ leagues are the core user

---

## SESSION HANDOFF PROTOCOL

When starting a new session, Claude reads this file first and confirms:
1. Current phase being worked on
2. Last completed prompt number
3. Any open bugs from previous session
4. Next prompt to execute

Then executes immediately without asking for permissions.
