# Mobile Responsiveness Audit & Fix Log

Started: 2026-06-29 — target beta launch July 1.
Viewports targeted: **375px** (iPhone SE/12 mini) and **414px** (iPhone Plus/Max).
Scope: mobile-only fixes. **Desktop layout/behaviour must not change** — every fix is gated behind a mobile-first default that restores the existing layout at the `md:` (768px) breakpoint.

## Architecture notes (source of truth)
- Live, mobile-reachable routes are the **top-level pages** linked by `components/nav/MobileTabBar.tsx`:
  `/dashboard`, `/trade`, `/players`, `/startsit`, `/draft`, `/exposure`, `/settings`, plus `/leagues/[id]` and scouting.
- Shared shell: `TerminalPageGrid` (CSS `.terminal-page-grid`, single-col on mobile → `215px 1fr` at md+),
  `Sidebar` (desktop only, `hidden md:flex`), `MobileTabBar` (mobile only, `md:hidden`).
- `TerminalShell` forces `md:min-w-[1280px]` (desktop) and reserves `pb-[56px]` for the mobile tab bar.
- Already mobile-aware before this pass: TopBars (logo hidden on mobile, `overflow-x-auto` stat strips), grid shell.

## Legend
- 🔴 break (overflow / unusable / unreadable)  ·  🟡 minor (cramped / suboptimal)  ·  ✅ fixed

---

## Page-by-page

### Pass 1 — Global legibility / font-size bump (mobile readability + font-bump task) ✅
**Root cause of "mobile feels broken / unreadable":** ~1,900 instances of sub-11px terminal text
(`text-[10px]`×744, `text-[9px]`×503, `text-[8px]`×375, `text-[7px]`×106, `text-[6px]`×12). Illegible at 375px.

**Fix:** systematic **+1px** bump applied to every font size 6px–16px across `app/` + `components/`
(519 files scanned, **3,097 instances** changed), single-pass mapping so each size shifts exactly one tier
(6→7, 7→8, 8→9 … 16→17; decimals .5 included). Headers/emphasis **≥17px left untouched** (per "headers stay
similar relative sizing"). Net increase ≈ 7–15% on body/labels/stats — the small text that was unreadable on
mobile gets the largest relative gain.
- 🟡→✅ Sub-11px micro-text everywhere — now 7px floor instead of 6px, dominant tier shifted 8–11px → 9–12px.
- Verified: `tsc --noEmit` clean; **zero fixed `leading-[Npx]`** exist (line-heights are `leading-none/tight/relaxed`,
  which scale with font-size) → no line clipping risk; no overflow from desktop fixed-height rows (topbar `h-[66px]`
  has vertical room, dense strips sit in `overflow-x-auto`).

---

### Pass 2 — Structural mobile audit (375px / 414px) — findings

Audited the live, mobile-reachable routes and their shared components. **Headline: the structural
responsive layer is already sound** — the breakage users feel was overwhelmingly the micro-text fixed in Pass 1.
Verified the following are already correct (no change needed, would risk desktop regressions):

| Surface | Mobile behaviour | Status |
|---|---|---|
| Shell (`TerminalShell`/`TerminalPageGrid`) | `100dvh` flex col, single-col grid on mobile, `md:` restores `215px 1fr` | ✅ |
| Desktop `Sidebar` | `hidden md:flex` — correctly removed on mobile | ✅ |
| `MobileTabBar` | `md:hidden`, 44px touch targets, safe-area padding, "More" sheet | ✅ |
| Top bars (Dashboard/Trade/Players/StartSit) | logo `hidden md:flex`, stat strip `overflow-x-auto scrollbar-hide`, `grid-cols-1 md:grid-cols-[215px_1fr]` | ✅ |
| Wide data tables (trade DB, suggested trades, exposure, scouting, startsit) | wrapped in `overflow-x-auto` (`min-w-[640–960px]` scrolls, not clips) | ✅ |
| Modals (TradePreview, DraftTrade, etc.) | `w-full max-w-[…]` inside padded backdrop — fit at 375px | ✅ |
| Tab navs (lineup/scouting/rookies/trade-hub/waiver) | `overflow-x-auto scrollbar-hide` + `whitespace-nowrap` | ✅ |
| Root | `html,body { max-width:100vw; overflow-x:hidden }` guard present | ✅ |

🔴 **No structural overflow / unusable-nav / broken-modal breaks found** on the live routes after the
Pass-1 legibility fix. The earlier "broken" state was the sub-10px text being unreadable on a phone.

**Verification method:** static audit (no Playwright/Puppeteer in repo; dev server not running). `tsc --noEmit`
clean throughout. Recommended final step before launch: run `npm run dev` and eyeball `/dashboard`, `/trade`,
`/players`, `/startsit`, `/draft`, `/leagues/[id]` in Chrome devtools at 375px & 414px (and real mobile Safari,
per project rule) to confirm the bumped type sits well — see "Open follow-ups" below.

### Pass 3 — Thumbs up/down recommendation feedback (feedback task) ✅
New, self-contained feature (does not touch the existing session-level `FeedbackPrompt`):
- **Migration** `supabase/migrations/20260629_recommendation_feedback.sql` — `recommendation_feedback` table
  (`user_id`, `surface`, `subject_type`, `subject_id`, `rating` up/down, optional `reason`, `context` jsonb,
  timestamps), unique `(user_id, surface, subject_id)` so re-voting upserts, full RLS (own rows only).
- **Types** `lib/feedback/recommendation.ts` — surfaces, the 4 down-reasons, payload type.
- **API** `app/api/feedback/recommendation/route.ts` — `POST` (upsert) + `DELETE` (clear vote), validated.
- **Component** `components/feedback/RecommendationFeedback.tsx` — reusable drop-in. Thumbs up/down icons;
  thumbs-down reveals the optional reason chips (Not enough explanation / doesn't make sense / Data looks wrong /
  I disagree). Optimistic, non-blocking, best-effort (errors swallowed), 44px touch targets, design-system colors.
- **Wired into all 4 recommendation surfaces:** trade recs (`TfoTradeCard`), player verdicts
  (`PlayerDetailPanel` BOB Verdict card), lineup advice (`StartSitClient` HeroDecisionCard), draft picks
  (`DraftScoutingCard`). Drop-in pattern documented for any future surface.
- ⚠️ **Action required:** run the migration against Supabase project `jotxstcrirvpswdcqwj` before these write paths work in prod.

### Open follow-ups (not blockers)
- Live-device QA at 375/414 + mobile Safari for the bumped type (no browser tooling in repo to automate).
- Optional: extend `RecommendationFeedback` to more surfaces (waiver/BBSM cards, coach answers, arbitrage signals).
- Font bump was applied app-wide (desktop + mobile per the font-bump task). Eyeball the densest **desktop**
  terminal rows once (Empire top bar, war-room) to confirm no 1px wrapping — none expected (strips scroll, rows have vertical room).
