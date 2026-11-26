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
- Do not reorder `SYSTEMS`, rename existing state fields or change log-arg prefixes (`@ $ # % ~ & ! ^ *`):
  old saves depend on them.
- One feature per branch, branched from the latest `main`; rebase before opening the PR.

## In flight
| PR / branch | Agent | Touches |
|---|---|---|
| #13 `chore/land-save-validation` | Claude | brings #11 (Codex: save validation, verified offline clock) to `main`; hooks `validMarketState()` and `play >= 0` into `validSave()` |
| `feat/print-models` | Claude | `content/models.ts`, `systems/models.ts`, `tests/models.test.ts` (new); `GameState.mdl/mdls/clk/mp`; `formulas.ts` (`model`, `gpu`, `modelDemand` in `demand`, `clickPower`); manual printing moved from `systems/production.ts` to `systems/models.ts`; `printed` event `share`; actions `tool`, `mdl:*`, `stl:*`; log prefix `*`; `Workshop.tsx` (Models card, tools row, prices per piece); `Side.tsx` print label; `scene/printer.ts` shapes; `tests/bot.ts` |

Merged: #8 analytics, #9 portal assets, #10 workshop discovery, #12 market events. #11 was merged into
`feat/workshop-discovery` only; #13 lands it.

Cross-branch notes:
- After #13 is in `main`, `validSave()` should also call `validModelState()` from `systems/models.ts` (done in
  `feat/print-models` once it is rebased on that `main`).
- Content is data-driven: new models, events, achievements go into `src/content/` lists; see README "Adding content".

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
