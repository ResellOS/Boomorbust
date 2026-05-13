# Boom or Bust — Formula Engine Reference
# Phase 1F — All 7 proprietary formulas implemented
# Last updated: May 2026

---

## FORMULA 1 — TFO (Team Fit / Opportunity Score)

**File:** `lib/tfo/formula.ts`  
**Output:** 0–100 score + grade + verdict + projection bands  
**Recalculated:** Nightly via `app/api/cron/cache-tfo`

### Master Formula
```
TFO = (OpportunityScore × 0.35)
    + (SchemeScore × 0.25)
    + (ProfileScore × 0.25)
    + (SituationScore × 0.15)
    + InSeasonAdjustment (±10 cap)
```

### Component Definitions
| Component | Inputs | Notes |
|-----------|--------|-------|
| OpportunityScore | `opportunity_score` from bbv_values | Direct 0-100 from data layer |
| SchemeScore | OC scheme key + OC tenure + scheme mismatch | 43-modifier engine; clamped 0-100 |
| ProfileScore | `(ol_grade + wr_cast_grade) / 2 × ageCurveMultiplier` | Age curve tables by position |
| SituationScore | `red_zone_share × 0.62 + normalizeKtcTo100 × 0.38` | KTC normalized from 1500–9000 range |
| InSeasonAdjustment | snap_share, target_share, weekly_ppg | ±4 pts each input, ±10 total cap |

### Grade Thresholds
| Score | Grade |
|-------|-------|
| 88–100 | ELITE |
| 75–87 | HIGH_VALUE |
| 60–74 | VIABLE |
| 45–59 | SPECULATIVE |
| 0–44 | AVOID |

### Verdict Thresholds
| Score | Verdict |
|-------|---------|
| 85+ | BOOM |
| 72–84 | LEAN_BOOM |
| 58–71 | NEUTRAL |
| 44–57 | LEAN_BUST |
| 0–43 | BUST |

### Age Curve Multipliers (position-specific tables)
- **QB:** 1.0 (age 22–32) → 0.95 (33–35) → 0.82 (36–38) → 0.70 (39+)
- **RB (Power):** 1.0 (22–25) → 0.88 (26) → 0.78 (27) → 0.65 (28) → 0.48 (29+)
- **RB (Receiving):** 1.0 (22–26) → 0.90 (27) → 0.80 (28) → 0.68 (29) → 0.55 (30+)
- **WR:** 0.92 (22–24) → 1.0 (25–28) → 0.93 (29–30) → 0.84 (31–32) → 0.72 (33+)
- **TE:** 0.90 (22–24) → 1.0 (25–28) → 0.93 (29–31) → 0.82 (32–33) → 0.68 (34+)

### OC Tenure Modifiers
| Tenure | Modifier |
|--------|----------|
| Year 1 (scheme mismatch) | −14 |
| Year 1 (young QB) | −12 |
| Year 1 (normal) | −10 |
| Year 2 | +5 |
| Year 3+ | min(+12, 5 + (year−2)×5) |

---

## FORMULA 2 — BVI (Boom or Bust Value Index)

**File:** `lib/bvi/engine.ts`  
**Output:** 0–10,000 KTC-scale score + signal + display string  
**Display format:** `BVI: 8,420 | KTC: 7,100 | △+1,320 UNDERVALUED`

### Master Formula
```
BVI quality (0–100) = TFO Trajectory  × 0.30
                    + Scheme Stability × 0.20
                    + Age Curve Pos    × 0.20
                    + Positional Scar  × 0.15
                    + Trade Momentum   × 0.15

bvi_score (KTC-scale) = round(quality × 100)
delta                 = bvi_score − ktc_value
```

### Component Definitions
| Component | How Computed |
|-----------|--------------|
| TFO Trajectory | Latest TFO ± trajectory bonus (RISING +8, FALLING −8, STABLE 0) |
| Scheme Stability | Low TFO variance over 3 snapshots = stable scheme. Stored as sfs_score if available |
| Age Curve Position | ageCurveMultiplier(position, age) × 100 |
| Positional Scarcity | Static: QB=72, TE=68, RB=50, WR=42 (boosted by league density) |
| Trade Momentum | 40 base + (30d trade count × 9.6), capped 88 |

### Signal Thresholds
| Delta | Signal |
|-------|--------|
| ≥ +400 | UNDERVALUED |
| −400 to +399 | FAIR |
| ≤ −400 | OVERVALUED |

### KTC Scoring Multipliers
| Scoring Type | QB | WR | TE | RB |
|---|---|---|---|---|
| superflex | 1.25 | 1.00 | 1.00 | 1.00 |
| ppr / half_ppr | 1.00 | 1.04 | 1.08 | 1.00 |
| standard | 1.00 | 1.00 | 1.00 | 1.08 |

---

## FORMULA 3 — BBSM (Waiver Wire Score)

**File:** `lib/bbsm/formula.ts`  
**Output:** 0–100 score + grade + add/drop signal

### Master Formula
```
BBSM = (P3W_Projected × 0.40) + (Trend_Velocity × 0.35) + (Roster_Need × 0.25)
```

### Component Definitions
| Component | Source |
|-----------|--------|
| P3W_Projected | TFO score (direct proxy for projected 3-week value) |
| Trend_Velocity | KTC delta week-over-week normalized: `(delta / 1000) × 50 + 50` |
| Roster_Need | Caller-supplied roster context 0–100 (default 75 if not provided) |

### Signal Thresholds
| Score | Grade | Signal |
|-------|-------|--------|
| 70+ | ELITE | STRONG BUY |
| 55–69 | HIGH VALUE | HIGH VALUE STASH |
| 40–54 | VIABLE | HOLD |
| 25–39 | SPECULATIVE | MONITOR |
| 0–24 | AVOID | FADE |

---

## FORMULA 4 — MRS (Medical Risk Score)

**File:** `lib/mrs/engine.ts`  
**Output:** Risk percentage 0–95 + tier + flags  
**Base risk:** 15%  |  **Cap:** 95%

### Master Formula
```
MRS = 15 (base)
    + Σ(injuryBaseRisk × positionMultiplier × ageMultiplier)
    + positionalAgeRisk
    − 3 (if clean 5-year history)
    + 8 (if 2+ injury seasons in last 4 years)
```

### Injury Base Risk Values
| Injury Type | Risk Addition |
|-------------|---------------|
| Hamstring recurring | +18% |
| Concussion multiple (same season) | +25% |
| ACL Year 1 return | +20% |
| MCL Year 1 return | +20% |
| Back chronic | +20% |
| Concussion single | +10% |
| ACL Year 2 | +10% |
| High ankle recurring | +15% |
| Shoulder (QB) | +15% |
| Foot/ankle chronic | +12% |
| High ankle single | +7% |
| Hamstring single | +8% |
| Turf toe | +8% |
| ACL Year 3+ | +5% |

### Age Compound Multipliers
| Age | Multiplier |
|-----|-----------|
| ≤24 | 1.0× |
| 25–26 | 1.1× |
| 27–28 | 1.2× |
| 29–30 | 1.5× |
| 31+ | 2.0× |

### Positional Age Thresholds (absorbed from IRS)
| Condition | Risk Addition |
|-----------|---------------|
| RB age ≥ 28 | +12% |
| QB age ≥ 35 | +12% |
| QB age 32–34 | +6% |

### Risk Tiers
| Score | Tier | Color |
|-------|------|-------|
| < 20% | GREEN | `#22c55e` |
| 20–35% | YELLOW | `#FBBF24` |
| > 35% | RED | `#EF4444` |

---

## FORMULA 5 — RTS (Rookie Transition Score)

**File:** `lib/rts/engine.ts`  
**Output:** 0–100 score + grade + projected Year-2 TFO  
**Data source:** `scouting_profiles` table (measurables + landing_spot_data jsonb)

### Master Formula
```
RTS = (Athletic Score  × 0.25)
    + (Production Score × 0.30)
    + (Draft Capital    × 0.20)
    + (Landing Spot     × 0.25)
```

### Component Definitions

**Athletic Score** — priority: SPARQ percentile → RAS (×10) → raw components (40-time, vertical, broad jump).  
RB special: Speed Score blend `weight × (200 / forty^4)` normalized to 60–140 range.

**Production Score** — `domScore × 0.40 + marketShare × 0.30 + breakoutAgeScore × 0.30` then × competition multiplier (Power5=1.0, G5=0.85, FCS=0.70).

**Draft Capital Score**
| Draft Position | Score |
|----------------|-------|
| Round 1 picks 1–5 | 100 |
| Round 1 picks 6–15 | 85 |
| Round 1 picks 16–32 | 70 |
| Round 2 | 50 |
| Round 3 | 30 |
| Round 4+ / Undrafted | 15 |

**Landing Spot Score** — `depthChart × 0.40 + schemeScore × 0.35 + supportingCast × 0.25` ± QB tier modifier (elite +8, bad −12) ± vacated volume bonus (120+ targets/carries = +8).

### Projected Year-2 TFO
```
projected_tfo_year2 = (rts_score × ageCurveMultiplier(position, age+2))
                    × (1 + (landingSpotScore − 60) / 100 × 0.25)
                    × 0.90 + 5
```

### Grade Thresholds
Same as TFO: ELITE (88+), HIGH (75+), VIABLE (60+), SPECULATIVE (45+), AVOID (<45)

---

## FORMULA 6 — DMS (Dynasty Matchup Score)

**File:** `lib/dms/engine.ts`  
**Output:** 0–100 score + tier  
**Stored:** `tfo_cache.dms_score` + `tfo_cache.dms_tier` (nightly)

### Master Formula
```
DMS = (MatchupGrade × 0.50) + (GameScript × 0.30) + (ConditionsGrade × 0.20)
```

### Component Definitions

**MatchupGrade** — opponent defense rank (DVOA-based) converted to 0–100.  
- Rank 32 (softest) = 95 | Rank 16 (neutral) = 62 | Rank 1 (hardest) = 30  
- Pass positions (QB, WR, TE) use DVOA_PASS_DEF rank.  
- Rush positions (RB) use DVOA_RUSH_DEF rank.

**GameScript** — `clamp(((vegasImplied − 15) / 20) × 100) + 5 if home`.  
- Implied 23 pts → 50 (neutral) | 35+ pts → 100 (shootout) | 15 pts → 0 (lock game)

**ConditionsGrade** — base 80 (outdoor), 100 (dome).  
- Wind 10+ mph: −5 | 15+ mph: −12 | 20+ mph: −20  
- Precip 50+%: −8 | 80+%: −15

### Tier Thresholds
| Score | Tier |
|-------|------|
| 75+ | BOOM |
| 58–74 | FAVORABLE |
| 40–57 | STABLE |
| 25–39 | TOUGH |
| <25 | BUST |

### Flags
| Flag | Trigger |
|------|---------|
| ELITE_DEFENSE | Opponent pass/rush rank ≤ 5 |
| POROUS_DEFENSE | Opponent rank ≥ 28 |
| HIGH_WIND_WARNING | Wind ≥ 20 mph |
| SHOOTOUT_GAME | Vegas implied ≥ 30 |
| LOW_TOTAL_GAME | Vegas implied ≤ 17 |
| DOME_GAME | isDome = true |

**Default (off-season / no matchup data):** dms_score = 0, dms_tier = 'STABLE'

---

## FORMULA 7 — SOSPP (Strength of Schedule Per Position)

**File:** `lib/sospp/engine.ts`  
**Output:** 0–100 score + tier + avg_opponent_rank  
**Use case:** Dynasty buy/sell window signal based on upcoming schedule slate.

### Master Formula
```
SOSPP = avg(defenseRankToMatchupGrade(opponentRank)) over next N weeks (max 8)
```

### Inputs
| Input | Description |
|-------|-------------|
| position | QB / RB / WR / TE — determines pass vs rush defense rankings |
| upcomingOpponents | Ordered list of NFL team codes for weeks ahead |

### How It Works
1. Map each upcoming opponent to their DVOA defensive rank (pass or rush per position)
2. Convert each rank to a matchup grade (0–100)
3. Average across all N weeks
4. Classify into tier

### Tier Thresholds
| Score | Tier | Dynasty Action |
|-------|------|----------------|
| 80+ | ELITE | Aggressive buy window |
| 65–79 | FAVORABLE | Hold or buy dip |
| 48–64 | NEUTRAL | Monitor |
| 32–47 | DIFFICULT | Consider selling high |
| <32 | BRUTAL | Sell high if possible |

### Flags
| Flag | Trigger |
|------|---------|
| BRUTAL_RUN_OF_DEFENSES | 3+ upcoming opponents with rank ≤ 5 |
| ELITE_STRETCH_AHEAD | 3+ upcoming opponents with rank ≥ 25 |
| TOUGH_SCHEDULE_BLOCK | Average opponent rank ≤ 8 |
| SOFT_SCHEDULE_BLOCK | Average opponent rank ≥ 24 |
| NO_SCHEDULE_DATA | Empty opponent list (off-season) → defaults to NEUTRAL / 50 |

---

## FORMULA DEPENDENCIES

```
SOSPP ──────────────────────────────────┐
DMS  ──────────────────────────────────┐│
                                       ││
TFO ──► BVI ──► BBSM                   ││
 │                                     ││
 └──► RTS (rookies only, year 1–2)     ││
                                       ││
MRS (independent — injury history DB)  ││
DMS (independent — schedule + weather) ◄┘
SOSPP (independent — schedule slate)   ◄┘
```

## STORAGE MAP

| Formula | Primary Store | Cache |
|---------|--------------|-------|
| TFO | `tfo_cache` | nightly cron |
| BVI | `player_values` | calculated on BVI cron |
| BBSM | computed at query time | optional Redis |
| MRS | `medical_history` input → result in memory | calculated on demand |
| RTS | `scouting_profiles.rts_score` | updated on calculateRTS |
| DMS | `tfo_cache.dms_score` + `tfo_cache.dms_tier` | nightly with TFO |
| SOSPP | computed at query time | optional Redis |
