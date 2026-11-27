# Roadmap & task board

Move a card by moving its line between columns. When a PR opens, put its number on the card; when it merges, move
the card to **Done**. Agents: see `AGENTS.md` for the files each open PR touches.

**Effort:** S = up to a day · M = a few days · L = a week or more
**Owner:** Dev = coding (Claude/Codex) · Maciej = needs you

---

## 🔍 In review

| Card | PR | Notes |
|---|---|---|
| **Keep the live finance line continuous** | #51 | Smooth transition into a new empty interval |
| **QA2: Debug hook and stage fixtures** | #43 | Five promo stages and time stepping |
| **Bug report preview mode** | #46 | Form visible in dev and QA `#debug` without a transport |

## In progress

| Card | Branch | Owner |
|---|---|---|
| **QA3: Full-game bot playthrough in Chromium** | `test/qa3-browser-playthrough` | Codex |

## 🚦 Next up

**How to take a card (Claude and Codex alike):** pick the top card of a lane that nobody has claimed, move it to
"In progress" with your branch name and agent, and push that one-line change to `main` first so the other agent sees
it. Then paste the card's prompt as your task. One card = one branch = one PR. When it merges, move the card to Done.
Lanes are independent: QA cards depend only on earlier QA cards, Gameplay cards are independent of each other.

Every prompt below implicitly starts with: *"Read `AGENTS.md` and `README.md` first. Follow the rules there. Run
`npm test` and `npm run typecheck` before opening the PR. Update the 'In flight' table in `AGENTS.md`."*

### 🧪 Lane QA: test the whole flow (do in order; QA1 is done, QA2 is in review)

| # | Card | Effort | Prompt |
|---|---|---|---|
| QA4 | **Layout stability check ("nothing jumps")** | M | Add `e2e/layout.spec.ts`. For each stage fixture (QA2) at 1280×800 and 390×844: (1) collect Cumulative Layout Shift with a `PerformanceObserver` over 20 s of live ticking and assert it stays below 0.02; (2) every 1 s record the bounding boxes of the main cards, tab bar, HUD, Print button and buy buttons, and assert none moves by more than 2 px vertically while the player does nothing (unlock/purchase moments excluded, list them explicitly); (3) assert no horizontal scrollbar (`scrollWidth <= clientWidth`) and that no element overflows the viewport. Fix the layout bugs you find in small commits (`font-variant-numeric: tabular-nums`, min-widths, reserved space for toasts and event cards) or, if a fix is big, add a Backlog card instead of fixing it. |
| QA5 | **Component render tests without a browser** | S | Add `jsdom` + `@testing-library/preact` and `tests/ui.render.test.tsx`. Using `playthrough(..., observe)` from `tests/bot.ts`, snapshot the game state at about 15 moments (every goal, liftoff, after prestige) and render `<App/>` for each in PL and EN. Assert it renders without throwing, has no `NaN`/`undefined`/`Infinity`/raw i18n keys in the text, and that every `<button>` has a non-empty accessible name. Keep it fast (under 20 s). |
| QA6 | **i18n and content integrity tests** | S | Add `tests/i18n.test.ts`: PL and EN dictionaries have exactly the same keys, no empty values, the same `{placeholders}` in both, and every key used in `src/` via `t('...')` exists (grep the sources in the test). Also check that every goal, achievement, tree node, model, material and event has texts in both languages, and fix whatever it finds. |
| QA7 | **Save compatibility fixtures** | S | Add `tests/fixtures/saves/` with one real save per `SAVE_VERSION` (generate them from git history of `core/save.ts` if needed, otherwise hand-built) plus a save mid-space-phase and one after a prestige. Test that each loads through `migrate()` + `validSave()`, runs 10 minutes of ticks with no NaN in any numeric field, and renders in the QA5 harness. This is the guard for the `AGENTS.md` rule "do not rename state fields". |
| QA8 | **Visual regression baseline (opt-in)** | M | Add `npm run e2e:visual`: screenshots of each stage fixture at desktop and mobile with animations frozen (`prefers-reduced-motion`, fixed seed, fixed clock), compared with Playwright's `toHaveScreenshot` against baselines committed in `e2e/__screenshots__/` (chromium on Linux only, to keep it stable; generate baselines in the same Docker image or CI that checks them). Not part of the default `npm test`. Document how to update baselines. |
| QA9 | **Run e2e in CI** | S | Add an `e2e` job to `.github/workflows/deploy.yml`, running on pull requests after `build`: install Playwright chromium, run `npm run e2e` (QA1 to QA4, not visual), upload `e2e/out` screenshots and the Playwright report as artifacts when it fails. The deploy job must `need` it. Keep total CI time under 6 minutes; if the QA3 playthrough is slower, run it only on `main` and nightly (`schedule`). |
| QA10 | **Pacing report from the bot** | S | Add `npm run pacing`: a script that plays the bot with 5 seeds and prints a table of time per goal, time between purchases (longest idle gap with nothing affordable), and money/s over time. Flag any gap longer than 3 minutes of game time before liftoff as a "dead zone". Commit the output of the current build to `docs/pacing.md` as the baseline and list the dead zones as Backlog cards. No balance changes in this PR. |

### 🎮 Lane Gameplay (independent, any order)

| Card | Effort | Prompt |
|---|---|---|
| **First 5 minutes: guided onboarding** | S | Add a lightweight hint system for the first game minutes: a single dismissible hint bar (data-driven list in `content/hints.ts`, PL/EN) that points at the next useful action (print, sell, buy the first printer, spool, first research). Hints trigger from state conditions, show at most once, are stored in the save (new field at the end of `GameState`, default in `createState()`), and never appear after the first prestige. Add a test that the bot sees the hints in order and that every hint has both languages. Check `balance.sim.test.ts` is unchanged. |
| **Offline return summary** | S | When the player returns after offline catch-up, show one panel with what happened while away: time away, money earned, prints made, filament used, any breakdowns or events missed, and the rewarded "double" button if available. Make it a data object returned by the offline catch-up in `core/game.ts` (pure, tested) and a small Preact component. It must not shift the layout of the workshop behind it (modal or overlay). |
| **Settings panel** | S | Add a Settings dialog (gear icon next to Save): sound volume slider and mute, language, number notation (short `1.2M` / scientific / full), reduced motion (stops the printer animation and screen shake, also respects `prefers-reduced-motion`), and "show hints". Persist through the platform preferences API, not in `GameState`. Make sure `fmt` helpers read the notation setting in one place. |
| **Printer types: resin** | M | First half of the "Printer types" card. Add a resin printer as a second printer type next to FDM: small build volume (only models whose `shape` fits), very high detail value multiplier, slower, consumes resin (a new material) and needs a wash-and-cure delay. Data-driven in `content/` with a `printerType` field on models; N-type allocation should reuse the production line model from #39 (see `systems/fleet.ts`). Add `tests/printerTypes.test.ts`, keep old saves working (migration or defaults), keep the balance bot within range. Industrial printers come in a later card. |
| **Printer types: industrial** | M | Depends on resin. Add the industrial printer: expensive, large models only (dragon, statues), needs power infrastructure and a technician (reduces breakdowns). Same data-driven pattern as resin. Add a trade-off test: neither type may dominate on profit per slot in the bot economy at any stage. |
| **More rewarded placements** | S | Add two rewarded placements next to Overtime: "Instant delivery" for the current special order, and "Skip breakdown" (repair all printers instantly). Each has its own cooldown stored in the save, hidden where ads are unavailable, tracked with `track('ad', ...)`. Test with `#mockads`. Make sure they cannot be abused by editing the clock (use the verified clock from `workshopClock.ts` / save validation). |
| **More content: models, events, achievements** | S | Add 4 print models (data only, `content/models.ts`), 6 market events, 3 calendar events and 10 achievements, matching the existing style and unlock curve. All PL + EN. Tests in `tests/models.test.ts`, `marketEvents.test.ts`, `calendar.test.ts` must pass, and add the missing achievements test (every achievement is reachable by the bot or listed as manual). Do not rename or remove existing ids. |
| **End screen and run summary** | S | Improve the end and prestige screens: stats of the run (play time, total earned, prints, best model, goals timeline), a shareable text summary with a "Copy" button, and a clear call to action for the next line (patent preview). No new state beyond what `workshopStats` already tracks, or add fields at the end of `GameState` with defaults. |
| **Accessibility pass** | S | Keyboard: every action reachable with Tab/Enter/Space and visible focus rings; `aria-live="polite"` for the log and toasts (throttled, not every tick); correct `role`s on tabs and the mobile nav; contrast at least 4.5:1 for body text (check with a script over the CSS variables); respect `prefers-reduced-motion`. Add an axe-core check to the Playwright suite if QA1 is merged, otherwise list findings in the PR. |
| **Performance pass** | S | Profile the 10 Hz loop and rendering on a mid-range phone profile (Chrome CPU throttling 4x) at the `factory` and `space` fixtures. Find components that rerender every tick without value changes (`useS` selectors), memoize them, and cap the scene animation work. Report before/after numbers (scripting time per second, long tasks) in the PR. Target: under 10% main-thread time in idle play. |
| Poki animated thumbnail (1080×1080) | S | Needed before Poki's global release. Extend `promo/video.py` to record a looping 1080×1080 animated WebP/GIF thumbnail (3 to 5 s, under Poki's size limit) from the `factory` state; document in `promo/README.md`. |

## 🧑‍🔧 Your side (Maciej)

| Card | Notes |
|---|---|
| Umami on Proxmox + HTTPS (Cloudflare Tunnel or your reverse proxy) | `infra/umami/README.md` |
| Set repo variables `UMAMI_HOST` and `UMAMI_WEBSITE_ID`, re-run the deploy | Analytics stays off until then |
| Playtest with 5–10 people, read Umami after a week | Where players drop off decides the backlog order |
| Bug reports: renew the fine-grained `GITHUB_TOKEN` before it expires (`cd infra/report-worker && npx wrangler secret put GITHUB_TOKEN`); reports become public issues labelled `bug-report` | Worker: `https://drukarnia-report.printworks-game.workers.dev`, repo variable `REPORT_ENDPOINT` is set. If reports stop arriving, check the token first |
| CrazyGames submission: progress saving = "Yes, using the Data Module from the CrazyGames SDK" | Without it the data module is disabled (the game falls back to localStorage) |

## 📋 Backlog

### Gameplay
| Card | Effort | Notes |
|---|---|---|
| **Second prestige layer**: IPO after a few production lines, shares give permanent bonuses | M | After players reach several lines |
| **Third phase**: e.g. printing Mars bases from regolith after the asteroid belt | L | Decide after the playtest: only if enough players reach space |

### Monetization & portals
| Card | Effort | Notes |
|---|---|---|
| CrazyGames leaderboard / achievements integration | M | If the portal features it for idle games |

### Tech & quality
| Card | Effort | Notes |
|---|---|---|
| Verify mobile touch fixes on a real iPhone (#15) | S | WebKit was not available for automated checks |
| Update the claude.ai game artifact to the Preact build | S | It still shows the old single-file version |
| Delete merged branches / enable "Automatically delete head branches" | S | Maciej's call |

## ✅ Done

| Card | PR |
|---|---|
| Smooth workshop finance chart scrolling | #47 |
| Workshop finance line chart | #44 |
| Preact + Vite architecture, tests, balance bot | #1 |
| GitHub Pages deploy | #2 |
| Portal adapters (CrazyGames, Poki) + rewarded boost | #3, #5 |
| Achievements | #5 |
| Prestige: production lines and patents | #6 |
| Title screen, save export/import | #7 |
| Self-hosted Umami analytics | #8 |
| Portal assets: covers, screenshots, preview videos, boot screen | #9 |
| Workshop discovery (Codex) | #10 |
| Save validation, verified offline clock (Codex) | #11 via #13 |
| Market events, `AGENTS.md` | #12 |
| Print models and click tools | #14 |
| Mobile touch fixes | #15 |
| Early-game rebalance, smooth dynamic pricing | #16 |
| Rewarded double offline earnings | #17 |
| Realistic mode | #18 |
| CrazyGames account saves | #19 |
| Order of the day | #21 |
| Smooth farm phase | #22 |
| Calendar events | #23 |
| Save dialog keyboard fixes (Codex) | #24 |
| Materials (Codex) | #25 |
| Print quality (Codex) | #26 |
| Story messages | #27 |
| Filament run-out handling | #28 |
| Research visibility | #30 |
| Big research tree | #33 |
| Split the fleet between two models | #35 |
| Workshop redesign: production line, investments, mobile nav | #39 |
| QA1: Browser smoke test harness (Codex) | #40 |
| ALPHA badge, bug report form, GitHub issue worker | #41 |
| Tab width and Materials layout shifts | #45 |
| Bug report worker deployed, `REPORT_ENDPOINT` set (Maciej) | #41 |
