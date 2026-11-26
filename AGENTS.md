# Notes for coding agents

More than one agent works on this repo in parallel (Claude, Codex). Read this before you start, and update the
"In flight" table when you open or merge a PR.

## Rules
- Code, comments, commits, PR titles and descriptions: **English**. Player-facing text: PL + EN.
- `npm test` and `npm run typecheck` must pass. Balance changes: check `tests/balance.sim.test.ts` (bot pacing).
- Architecture (details in README): `core/` pure TS, no DOM · `systems/` one mechanic per file, registered in
  `SYSTEMS` (core/game.ts) · `content/` data and balance numbers · `ui/` Preact · `platform/` portal adapters.
- **GameState**: add new fields at the end of the interface and give them a default in `createState()`.
  `migrate()` fills missing fields from the defaults, so most additions need no migration. If a field changes meaning,
  bump `SAVE_VERSION` and append a migration; never edit old ones.
- Do not reorder `SYSTEMS`, rename existing state fields or change log-arg prefixes (`@ $ # % ~ & ! ^`):
  old saves depend on them.
- One feature per branch, branched from the latest `main`; rebase before opening the PR.

## In flight
| PR / branch | Agent | Touches |
|---|---|---|
| #10 `feat/market-events` | Claude | `content/events.ts`, `systems/marketEvents.ts` (new); `GameState.mev/mevT/mfx`; `formulas.ts` (`marketMul` in `demand` and `spoolPrice`); `GameEvent` `market`; actions `mevyes/mevno`; i18n `L.mev*`, `mevExp`, `fx*`; `Workshop.tsx` Events; `ui/store.ts` (one `track` line); `tests/bot.ts` |
| `feat/offline-mobile` (incl. `feat/workshop-discovery`) | Codex | `core/saveValidation.ts` (new), `save.ts` (`migrate` validates, rebuilds research multipliers), `catchUp` return value, `GameState.serverThrough`, `ui/store.ts`, `ui/workshopClock.ts`, `Research.tsx`, `Side.tsx`, `App.tsx`, `styles.css` |

Merged: #8 analytics, #9 portal assets.

Cross-branch notes:
- `feat/offline-mobile` + `feat/market-events` merge cleanly (checked locally: typecheck OK, 46 tests pass).
- **For `saveValidation.ts`:** call `validMarketState(s)` from `systems/marketEvents.ts` in `validSave()`. The generic
  number/boolean check does not cover `mev` (object or null) or `mfx` (array); a tampered `mev.cost < 0` would pay out
  on accept (acceptance now refuses non-positive prices too, but the save should be rejected).
- `GameState.play` (from #8) is a plain number: active seconds on the current line.

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
