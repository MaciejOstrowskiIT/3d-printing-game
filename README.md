# Drukarnia / Printworks

A browser incremental game in the spirit of Universal Paperclips, set in the world of 3D printing. You start with a single printer in a garage and end up turning an asteroid belt into figurines.

**Play:** https://maciejostrowskiit.github.io/3d-printing-game/

## Getting started

```bash
npm install
npm run dev        # dev server with hot reload
npm test           # unit tests + a bot that plays the whole game
npm run build      # dist/index.html: one self-contained file (GitHub Pages)
npm run build:crazygames   # dist-crazygames/index.html with the CrazyGames SDK
npm run build:poki         # dist-poki/index.html with the Poki SDK
```

### Portals and rewarded ads

The platform is chosen at build time (`--mode crazygames|poki`, see `.env.*`); unused adapters are tree-shaken out. Each adapter loads its SDK, reports loading/gameplay events, mutes audio and pauses the game during ads, and exposes `showRewardedAd()`.

The only rewarded placement so far is **Overtime**: 2× production for 5 minutes, then a 10-minute cooldown. It is hidden where ads are not available. To test the flow without a portal, run `npm run dev` or open the build with `#mockads` in the URL.

## Deployment

`.github/workflows/deploy.yml` runs tests and the build on every pull request, and on every push to `main` it also deploys `dist/` to GitHub Pages. Pages must use **GitHub Actions** as its source (Settings → Pages → Build and deployment).

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
- Research tree: Production, Sales, Automation, Space.
- 17 goals guiding the player through the whole game.
- Space phase: drones, orbital factories, asteroid belt.
- Isometric scene (garage → workshop → factory floor → orbit) with a printer close-up inset and layer-by-layer animation.
- 20 achievements (one hidden) with toasts; older saves unlock earned ones silently.
- Prestige: after liftoff, start a new production line for patents (`floor(2 · log10(total / 1e5)^1.5)`), spent on 9 permanent upgrades in `content/patents.ts`.
- Title screen (continue, new game, load a save) and a Save dialog: export as a `DRK1:` text code (copy or download) and import from text or a file.
- PL / EN, sound (WebAudio), offline progress up to 8 h.

## Balance

The bot in `tests/bot.ts` finishes the game in about 78–89 minutes (liftoff after 42–52 min). A human plays slower, roughly 2–3 hours. `balance.sim.test.ts` keeps these times within the agreed range.
