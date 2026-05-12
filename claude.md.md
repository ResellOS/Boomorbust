# Boom or Bust — Project State Summary
*Paste this into a new Claude session to continue development*

---

## 1. CURRENT GOAL & HIGH-LEVEL ARCHITECTURE

**Project:** "Boom or Bust" — a Sleeper-only dynasty fantasy football portfolio manager.
**Tagline:** Manage your dynasty like a front office / The Bloomberg Terminal for dynasty football.
**Positioning:** Multi-league intelligence as the primary competitive moat over KTC and Dynasty Nerds.
**Builder context:** Solo builder, no coding background. Uses Cursor (for features) and Claude Code (for bug fixes). Prompts are pasted into Claude Code. Claude.ai is for planning.

### Tech Stack
| Layer | Tech |
|---|---|
| Framework | Next.js 14 App Router |
| Database | Supabase (Postgres + Auth) |
| Cache | Upstash Redis |
| Hosting | Vercel |
| Styling | Tailwind CSS |
| State | Zustand |
| AI | Anthropic Claude API (claude-sonnet-4-...) |
| Email | Resend |
| Payments | Stripe |

### Repo & Live URL
- **Repo:** `G:\SaaSylum\FantasySmartass\dynasty-command-center`
- **Live:** `https://dynasty-command-center-gules.vercel.app`
- **Vercel project:** `resell-os/dynasty-command-center` (also seen as `resell-os/boomorbust`)

### App Name Note
The app was originally called "Dynasty Command Center." It was renamed to **"Boom or Bust"** and the domain is `boomorbust.app`. Some internal docs still reference the old name — documentation-only, does not affect the build.

---

## 2. PROPRIETARY FORMULAS & KEY LOGIC

### F-FIG (Fantasy-Factor Impact Graph)
Pentagon area mapping — computes a player's "Impact Surface Area."

**Formula:**
```
Score = 0.5 * sin(72°) * (V1V2 + V2V3 + V3V4 + V4V5 + V5V1)
```

**Position-specific axes:**
| Axis | QB | RB | WR/TE |
|---|---|---|---|
| V1 | Passing Volume | Rushing Value | Target Share |
| V2 | Rushing Value | Target Share | Air Yards |
| V3 | O-Line Quality | O-Line Quality | Separation |
| V4 | WR Quality | Explosive % | YAC |
| V5 | RedZone Efficiency | RedZone Touches | RedZone Targets |

**Shape triggers / HUD logic:**
- **Full Saturation (Emerald Glow):** All 5 vectors high → elite floor
- **Skewed Shape:** Dependency detected (e.g. V5 spike + low V1 = "TD Dependent")
- **Collapsed Shape (Blood Red Glow):** All vectors < 30th percentile → BUST warning regardless of name value

**F-FIG scope:** NFL rookies/prospects AFTER the draft with landing spot data.
**F-FIG vs BBB:** BBB (Boom-Bust Scouting Model) grades college players still in school. F-FIG grades them post-draft.
**Transparency positioning:** Presented honestly — "We built this model and backtested it against 25 years of data. Here's where it's been right and wrong." Honesty is the marketing.
**Performance report:** Both a ticker on the landing page AND a full page accessible from nav. Record shown as e.g. "42-18-2."

---

### EMPIRE SCORE
```
Σ (Player KTC Value) | Filter: owner_id == sleeper_user_id
```
Aggregates total KTC market value across all synchronized Sleeper leagues. Shown in header strip with `tabular-nums`.

---

### BBSM (Boom-Bust Scouting Model)
Waiver wire "AI Add Score":
```
[(P3W_Projected * 0.45) + (Trend_Velocity * 0.30) + (Roster_Need_Weight * 0.25)]
```

---

### TFO Formula Engine (`lib/tfo/formula.ts`)
43-modifier projection formula covering QB/RB/WR/TE.

**Outputs:** TFO score (0–100), grade, verdict, projected yards/TDs, confidence, flags, reasoning.
**Features:** Age curves by archetype, scheme scoring by OC family, dual-track dual-threat projections.
**Verdicts & pentagon size multipliers:**
| Verdict | Multiplier |
|---|---|
| BOOM | 1.0 (full saturated shape) |
| LEAN_BOOM | 0.85 |
| NEUTRAL | 0.70 |
| LEAN_BUST | 0.55 |
| BUST | 0.40 (collapsed shape) |

---

### radarMetrics.ts
Pentagon radar wired to TFO formula outputs. BOOM players show full saturated pentagon; BUST players show collapsed shape.

**Position-colored axis labels:**
```
WR → #22D3EE (cyan)
RB → #36E7A1 (green)
QB → #FBBF24 (amber)
TE → #A78BFA (purple)
```
Labels: 8px font, truncated to 6 chars max, positioned at each pentagon vertex.

**Player Hub card display below name/position:**
```
TFO {score} · {grade}          ← JetBrains Mono, 11px, accent color
{reasoning string, 1 line max} ← JetBrains Mono, 10px, #64748B
```

---

## 3. FOUR PRODUCT PILLARS

```
PILLAR 1 — START/SIT
  "Who plays for me this week?"
  Primary: Lineup (/dashboard/lineup)
  Output: BOOM or BUST verdict per player
  Edge: TFO formula + matchup + weather

PILLAR 2 — TRADE
  "Should I make this trade?"
  Primary: Trade Lab (/dashboard/trade)
  Output: WIN / EVEN / LOSS + reasoning
  Edge: 3-year window + scheme fit + age curve

PILLAR 3 — ADD/DROP
  "Who do I pick up?"
  Primary: Dashboard waiver section
  Output: BBSM score + BOOM/BUST signal
  Edge: Trending adds before the market reacts

PILLAR 4 — DRAFT + SCOUT
  "Who do I take in the rookie draft?"
  Primary: Rookies + Scouting pages
  Output: F-FIG grade + BBB score
  Edge: Full dynasty lifecycle (pre/in/off-season)
```

---

## 4. WHAT HAS BEEN BUILT

### Completed / Deployed
- ✅ Project scaffold (Next.js 14, Supabase, Vercel)
- ✅ Auth pages (sign up, login, onboarding)
- ✅ Supabase schema + all migrations applied
- ✅ Sleeper API service + sync routes
- ✅ Dashboard page (Empire header, Player Hub cards, portfolio chart, waiver watchlist, roster health donut, league cards)
- ✅ `lib/tfo/formula.ts` — full 43-modifier TFO engine
- ✅ `components/dashboard/radarMetrics.ts` — pentagon wired to TFO
- ✅ `components/dashboard/PlayerHubCard.tsx` — BOOM/BUST radar cards, `RADAR_R = 94`
- ✅ Dynasty value engine (KTC integration via `getEnrichedRankings()`)
- ✅ Trade Analyzer with plain-English AI explanations
- ✅ Sit/Start optimizer (API mismatch fixed, working end to end)
- ✅ Draft pick advisor
- ✅ Portfolio view with jagged mountain-peak chart + dashed league average benchmark
- ✅ Injury broadcaster
- ✅ Handcuff tracker
- ✅ Trade Finder
- ✅ Weekly digest email (Resend)
- ✅ Dynasty Coach AI chat (`/dashboard/coach`)
- ✅ Dynasty Wrapped (viral January feature)
- ✅ Stripe payment integration (3 tiers)
- ✅ Arbitrage page — live KTC, TFO score/grade/signal, player sidebar with trajectory chart (purple = process, green = results)
- ✅ Optimizer scan wired to real API (Diamond/Gem/Starter/Nuke tiers)
- ✅ Glassmorphism pass + JetBrains Mono typography
- ✅ `createClient()` moved inside async functions on all 15 dashboard pages (TypeScript clean, `npx tsc --noEmit` exit 0)
- ✅ Dashboard null crash fix — `ktFor()` guards falsy `full_name`; KTC map build skips null `player_name`
- ✅ Vercel linked to `resell-os/boomorbust`

### Prompts Written (original series)
Prompts 1–30 written and executed covering everything above. Prompts 31–35 were scoped (data freshness infrastructure, cron jobs, admin health dashboard) but may not be fully written yet.

### Prompts Written (F-FIG / redesign series, likely Prompts 60+)
- Prompt 74: BBB Score engine (college players still in school)
- Prompt 75: F-FIG Scouting Engine (post-draft, NFL prospects with landing spot data)
- Additional redesign prompts: Landing page redesign, Dashboard visual upgrade, Pentagon axis labels, Arbitrage sidebar trajectory chart

---

## 5. WHAT'S NEXT — OUTSTANDING TASKS

### High Priority (blocking or near-blocking)
- [ ] **Scouting Terminal page** (`/dashboard/scouting`) — entire page is NOT YET BUILT. Needs:
  - Waiver Radar panel (left)
  - Process vs Results Engine with trajectory chart (center)
  - WR Efficiency Matrix radar — axes: Separation Grade, Routes Run %, TPRR, Matchup Multiplier, Depth Chart Priority, Boom/Bust Risk
  - Heatmap & Scheme Fit section (route heatmap on football field with hotspot %s)
  - Separation Score bar charts (vs Man/Zone, by cushion distance)
  - Top Hidden Gems cards with trend lines + BOOM/BUST badges
  - AI Summary panel ("True Talent Delta" callout)
- [ ] **Landing page redesign** — new pricing tiers ($5 Rookie / $10 Veteran / $20 All-Pro Terminal shown in mockup), new nav, feature comparison table, social proof section, F-FIG performance ticker + full hits/misses page
- [ ] **Trade Hub sidebar** — live market trends panel (Bust Risk, Boom Potential, Trans Gaps, Avg Mountial, Vend Risk with live % changes), Latest Offers panel (incoming trade offers across leagues), Player Gaps panel (cross-league player gap analysis)

### Unresolved Bugs / Gaps
- [ ] Pentagon shapes on Player Hub cards may still look too uniform between BOOM MVP and BUST THREAT cards — verify `forecast='boom'` / `forecast='bust'` is correctly passed from dashboard page to `getRadarMetrics`
- [ ] `lineup/optimize/route.ts` and `lineup/borderline/route.ts` — full file contents needed before certain prompts can be written
- [ ] Pricing tiers in the app still reflect old values ($4.99 Pro / $9.99 Elite) — needs to be updated to match new landing page tiers
- [ ] Prompts 31–35 (data freshness, cron jobs, stale data indicators, DVOA sync, fuzzy name matching, admin health dashboard) — confirm whether these were actually written and executed

### Post-Launch Roadmap Features (scoped, not yet built)
- Live rookie draft assistant
- Dynasty age clock / contention windows
- Cross-league trade arbitrage detection
- Opponent scouting reports
- Public trade board (across app users)
- Single "Dynasty Score" per league
- Real-time push notifications
- Personalized NFL news filter
- Season-long performance tracking

---

## 6. DESIGN SYSTEM & STYLE CONSTRAINTS

### Design Language
- **Aesthetic:** Dark ops / War Room HUD. Bloomberg Terminal density. Glassmorphism.
- **Glass panels:** `backdrop-blur: 24px; bg-opacity: 65%; border: white/10`
- **Typography:** JetBrains Mono forced for ALL numerical data, scores, deltas
- **Portfolio chart:** Jagged mountain-peak trend + dashed "League Average" benchmark
- **Command Hub:** Compressed Bloomberg-terminal sidebar, "Wiggle" sparklines, Sell/Buy indicators
- **Status chrome:** Neon cyan glows, "Winning Ticker" pill badge

### Color Palette (locked)
```
WR accent:    #22D3EE  (cyan)
RB accent:    #36E7A1  (green)
QB accent:    #FBBF24  (amber)
TE accent:    #A78BFA  (purple)
Bust/red:     #EF4444
Live dot:     #EF4444  with pulse
Tier: Elite → #FBBF24 (amber)
Tier: Pro →   #22D3EE (cyan)
Pentagon benchmark trace: rgba(34,211,238,0.38)
Trade preview charts: #36E7A1 / #22D3EE
```

### No black drop shadows on non-neon elements
- `PlayerHubCard`: No `rgba(0,0,0,0.35)` outer drop shadow — card glow is boom/bust neon only
- `OvervaluedAssets` SELL badge: Red glow only, no black `textShadow`
- `ProjectionChart`: No white halo `textShadow`
- `globals.css` glass-panel: No gray outer drops

### Pricing Tiers
| Tier | Price |
|---|---|
| Free | $0 |
| Pro | $4.99/mo (original) or $5 Rookie (new mockup) |
| Elite | $9.99/mo (original) or $10 Veteran (new mockup) |
| (new) All-Pro Terminal | $20/mo (from landing page mockup) |
*Tiers are in flux — confirm which set is canonical before updating Stripe.*

---

## 7. WORKING STYLE RULES

```
- Use Cursor for new features
- Use Claude Code for bug fixes (runs with --dangerously-skip-permissions)
- Always commit before starting a new work session
- npx tsc --noEmit must pass (exit 0) before any deploy
- Test specifically on mobile Safari — most bugs found there
- Dashboard players with null full_name must be guarded (crash fix is deployed)
- createClient() must be called inside async functions, not at component body level
- No hardcoded user IDs in source code
- Queue overnight prompts for Claude Code to run unattended
```
