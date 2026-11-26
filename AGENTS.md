# Notes for coding agents

More than one agent works on this repo in parallel (Claude, Codex). Read this before you start, and update the
"In flight" table when you open or merge a PR.

Planned work and its order: `ROADMAP.md` (task board). Pick cards from "Next up" and move them as you go.

## Rules
- Code, comments, commits, PR titles and descriptions: **English**. Player-facing text: PL + EN.
- `npm test` and `npm run typecheck` must pass. Balance changes: check `tests/balance.sim.test.ts` (bot pacing).
- Architecture (details in README): `core/` pure TS, no DOM · `systems/` one mechanic per file, registered in
  `SYSTEMS` (core/game.ts) · `content/` data and balance numbers · `ui/` Preact · `platform/` portal adapters.
- **GameState**: add new fields at the end of the interface and give them a default in `createState()`.
  `migrate()` fills missing fields from the defaults, so most additions need no migration. If a field changes meaning,
  bump `SAVE_VERSION` and append a migration; never edit old ones.
- Do not reorder `SYSTEMS`, rename existing state fields or change log-arg prefixes (`@ $ # % ~ & ! ^ * + =`):
  old saves depend on them.
- One feature per branch, branched from the latest `main`; rebase before opening the PR.

## In flight
| PR / branch | Agent | Touches |
|---|---|---|
| `feat/offline-double` | Claude | `systems/offlineBonus.ts` (new, appended to `SYSTEMS`); `GameState.offB/offBi/offBT`; `catchUp` sums sales revenue; action `offx2`; `validSave()` hook; `ui/store.ts` (`watchAd()` generalised); `App.tsx` away report; `market.ts` trend pick without retry loop |
| `feat/realistic-mode` (on top of #17) | Claude | `GameState.slow`; `formulas.ts` (`rateBase`/`clickPower` ÷ slow, `printSeconds`, `isRealistic`); `prestige.ts` (`prestige(s, ctx, realistic)`, `patentsFor` ×2); action `prestigeR`; `catchUp` 24 h cap; `validSave()` hook; `Prestige.tsx`, `App.tsx` End, `Hud.tsx` badge; achievement `realist`; `tests/bot.ts` (`init` arg) |

Merged: #8–#16 (analytics, portal assets, workshop discovery, save validation, market events, print models, mobile touch, early balance).

Cross-branch notes:
- `validSave()` calls `validMarketState()` and `validModelState()`; new state with objects or arrays needs its own
  validator there (the generic check only covers numbers and booleans).
- Content is data-driven: new models, events, achievements go into `src/content/` lists; see README "Adding content".

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
