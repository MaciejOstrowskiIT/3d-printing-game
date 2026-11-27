# Drukarnia / Printworks

A browser incremental game in the spirit of Universal Paperclips, set in the world of 3D printing. You start with a single printer in a garage and end up turning an asteroid belt into figurines.

**Play:** https://maciejostrowskiit.github.io/3d-printing-game/

Roadmap and task board: [`ROADMAP.md`](ROADMAP.md).

## Getting started

```bash
npm install
npm run dev        # dev server with hot reload
npm test           # unit tests + a bot that plays the whole game
npm run treeaudit  # research tree audit -> docs/tree-audit.md (about a minute, plays the bot)
npm run build      # dist/index.html: one self-contained file (GitHub Pages)
npm run build:crazygames   # dist-crazygames/index.html with the CrazyGames SDK
npm run build:poki         # dist-poki/index.html with the Poki SDK
```

### Browser smoke tests

After `npm install`, install Playwright's Chromium and run the suite:

```bash
npx playwright install chromium
npm run e2e
```

Playwright builds the game, serves `dist/` with Vite Preview, and checks the title screen,
manual printing and navigation on desktop and at 390×844 with touch enabled. Add
`-- --headed` to watch the tests or `-- --project=chromium-mobile` to run only the phone
scenario. Failure traces are written to `e2e/out/`.

### Layout stability

`npm run e2e:layout` checks all five promo saves in Chromium at 1280×800 and 390×844.
It requires [CLS](https://web.dev/articles/cls) below 0.02 over 20 seconds of live play,
limits vertical movement to 2 px using one-second samples, and checks for
horizontal overflow. Run a single stage
with `npm run e2e:layout -- -g factory`. Each case attaches its measurements to
the Playwright result. The same tests also run in `npm run e2e`.

The vertical position baseline resets only at goal or phase changes, research unlocks,
or purchases of models, printers, farms, panels, drones and factories. Every reset
is listed in the measurements. CLS and horizontal overflow cover the entire window.

### Debugging game stages

`npm run dev` exposes `window.__drk` after the game boots. To test a built version,
run `npm run build:qa` and `npm run preview -- --mode qa --outDir dist-qa`, then open
the preview with `#debug` in the URL. The release and portal builds exclude the hook.

Use `load(json)` with a save object or JSON string, `step(seconds)` to advance the
simulation in chunks of at most 0.25 s, `act(action)` to dispatch a normal game action,
and `state()` to read a detached snapshot. Loading a fixture opens the game screen and
keeps the persisted save intact. The real-time loop continues to run.

Debug specs live under `e2e/debug/` and use the separate QA preview. Navigate to
`/#debug` and call `loadStage(page, 'factory')` to load a committed promo state.

Run the full bot playthrough in Polish and English with
`npm run e2e -- playthrough --project=chromium-qa-desktop`. Screenshots of goals,
liftoff, the ending and prestige are stored under `e2e/out/`.

### Portals and rewarded ads

The platform is chosen at build time (`--mode crazygames|poki`, see `.env.*`); unused adapters are tree-shaken out. Each adapter loads its SDK, reports loading/gameplay events, mutes audio and pauses the game during ads, and exposes `showRewardedAd()`.

Saves and preferences go through the platform and are read only after `platform.init()` (see `main.tsx`), because a portal SDK may hold them.

**CrazyGames saves** use the SDK data module, so progress follows the player's CrazyGames account across devices (guests keep it in localStorage; the portal reloads the game after a login). On first run an existing localStorage save is copied into the module, so returning players keep their progress. If the module is unavailable, the adapter falls back to localStorage. **In the CrazyGames submission form, set progress saving to "Yes, using the Data Module from the CrazyGames SDK"**, otherwise the module is disabled.

The only rewarded placement so far is **Overtime**: 2× production for 5 minutes, then a 10-minute cooldown. It is hidden where ads are not available. To test the flow without a portal, run `npm run dev` or open the build with `#mockads` in the URL.

## Deployment

`.github/workflows/deploy.yml` runs tests and the build on every pull request, and on every push to `main` it also deploys `dist/` to GitHub Pages. Pages must use **GitHub Actions** as its source (Settings → Pages → Build and deployment).

## Analytics

The GitHub Pages build can send anonymous events to a self-hosted [Umami](https://umami.is) instance: goal funnel with play time, liftoff, prestige, retention by day, rewarded-ad completion, uncaught errors. It is off unless the `UMAMI_HOST` and `UMAMI_WEBSITE_ID` repository variables are set. Setup, Docker Compose and the event list: [`infra/umami/README.md`](infra/umami/README.md).

In code, call `track(name, data)` from `src/ui/analytics.ts`; it forwards to the portal SDK and to Umami and adds context (minutes played, line, goal, build). The build id (`version+sha`) is shown on the title screen.

## Alpha badge and bug reports

A faint `ALPHA` badge sits in the top-right corner (`ui/components/AlphaBadge.tsx`; delete it when leaving alpha). The **Report a bug** button (Settings and title screen) opens a dialog with one free-text field. No contact details are asked for; only build, play time, line, goal, language and viewport are attached. One report per 15 s, remembered across reloads (`platform/report.ts`).

Where reports go: if `VITE_REPORT_ENDPOINT` is set, a JSON `POST` (`{type:'bug_report', description, ...context, at}`) goes there; otherwise they are sent as an Umami `bug_report` event (text split into `d1..d3`), so with analytics on no extra backend is needed. With neither, the button is hidden. The endpoint is the Cloudflare Worker in [`infra/report-worker`](infra/report-worker/README.md), which opens a GitHub issue (set the `REPORT_ENDPOINT` repository variable). Never put a GitHub token or a Discord/Slack webhook straight into the client build, it would be public.

## Architecture

Three layers. The core knows nothing about the browser, the UI only reads state and dispatches actions, and everything that depends on where the game runs sits behind the platform interface.

```
src/
  core/        game core, plain TypeScript, no DOM
    state.ts     GameState: a plain object saved as JSON
    formulas.ts  pure formulas: costs, demand, rates, power
    game.ts      tick loop (SYSTEMS list), player actions, offline catch-up
    ctx.ts       tick context: randomness, events, log, sound effects
    save.ts      save versions and migrations
  systems/     one mechanic per file, signature (state, dt, ctx) => void
  content/     game data: balance.ts (all numbers), tree.ts, goals.ts, colors.ts, i18n/
  ui/          Preact + @preact/signals
    store.ts     game instance, 10 Hz loop, useS() state selector, saving
    components/  App, Side, Hud, Workshop, Research, common
    scene/       isometric floor and printer animation (imperative SVG)
  platform/    Platform interface + local adapter (localStorage); Poki and CrazyGames adapters go here
legacy/        previous single-file version, kept for comparison
tests/         system tests and the balance bot
```

### Adding a mechanic

1. Add a file in `src/systems/` exporting `(s, dt, ctx) => void`.
2. Register it in the `SYSTEMS` list in `src/core/game.ts`.
3. Add new state fields to `GameState` and `createState()`. If you change the meaning of existing fields, bump `SAVE_VERSION` and add a migration in `save.ts`.
4. Put numbers in `content/balance.ts` and texts in `content/i18n/pl.ts` and `en.ts`.
5. Run `npm test`: the balance bot shows whether pacing still holds.

### Adding content (data-driven)
Content lives in `src/content/` as plain lists. Each list has one place that reads it and a test that checks every entry, so new content needs no code changes:

| Content | File | Checked by |
|---|---|---|
| Print models (figurine, bust, dragon…) | `content/models.ts` | `tests/models.test.ts` (numbers, shape fits the printer, PL/EN texts, unlock order) |
| Market events | `content/events.ts` | `tests/marketEvents.test.ts` |
| Calendar events (real dates) | `content/calendar.ts` | `tests/calendar.test.ts` |
| Story messages | `content/story.ts` | `tests/story.test.ts` (texts, and the bot sees every message in a full game) |
| Achievements | `content/achievements.ts` | `tests/achievements.test.ts` (bot coverage and manual challenges) |
| Patents | `content/patents.ts` | `tests/prestige.test.ts` |
| Research tree | `content/tree.ts` | `tests/systems.test.ts` |

To add a print model, append an entry to `MODELS`: print time (`seconds`), `value` (pay per printer-second), `market` (how many buyers), `material` (filament per printer-second), `design` price, `unlockAt` and a `shape` (layer widths for the printer animation and the card silhouette). Ids go into saves, so never rename or remove one. The economy stays in figurines (one printer-second of work), so goals, stock and the space phase are unaffected by the selected model; see the comment at the top of `content/models.ts`.

### Rules

- **The UI never mutates game state directly.** It dispatches actions via `act('...')`. The only exception is view-only state (active tab, research branch) via `ui(fn)`.
- **Randomness only through `ctx.rng()`**, so tests are deterministic.
- **Events instead of cross-calls.** The core emits `log`, `sfx`, `printed`, `goal`, `order`, `phase` and `end`. The log, audio, animation and analytics (`platform.track`) listen to them.
- **Backward-compatible saves.** The `drukarnia-v3` localStorage key is kept and old saves load through migrations.
- **English in code**: identifiers, comments, commits and PRs. Player-facing texts live in the PL/EN dictionaries.

## Features

- Manual printing (click, hold or Space), sales with price and demand, filament price changing about every 10 s.
- Filament colours and a trending colour (+30% customers).
- Special orders, printer breakdowns, power for farms.
- Computer: reputation points, processors, memory, compute.
- Research tree: Production, Sales, Automation, Space and more, plus an optional Quantum branch (10 nodes, paid only in quantum points from the quantum computer). Nothing in it is needed to finish the game; `balance.sim.test.ts` checks that a bot using it stays in the same pacing range.
- 17 goals guiding the player through the whole game.
- Space phase: drones, orbital factories, asteroid belt.
- Isometric scene (garage → workshop → factory floor → orbit) with a printer close-up inset and layer-by-layer animation.
- 38 achievements (one hidden) with toasts; older saves unlock earned ones silently.
- Prestige: after liftoff, start a new production line for patents (`floor(2 · log10(total / 1e5)^1.5)`), spent on 9 permanent upgrades in `content/patents.ts`.
- Title screen (continue, new game, load a save) and a Save dialog: export as a `DRK1:` text code (copy or download) and import from text or a file.
- PL / EN, sound (WebAudio), offline progress up to 8 h.

## Balance

The bot in `tests/bot.ts` finishes the game in about 78–89 minutes (liftoff after 42–52 min). A human plays slower, roughly 2–3 hours. `balance.sim.test.ts` keeps these times within the agreed range.

**Game length knob:** `BAL.pace` in `content/balance.ts` stretches the whole game (1 = the numbers above, 5 = shipped, ~5× longer; the bot then needs ~7 h, a realistic line another 10× on top). It divides every flow rate: printers, clicks, demand, compute and space. Costs and goals stay put, so they feel proportionally higher. Real-time timers (events, offers, spool drift, boost) are untouched. Unit tests run at pace 1 (`tests/setup.ts`); the balance sim runs at `BAL.pace` and scales its thresholds.
