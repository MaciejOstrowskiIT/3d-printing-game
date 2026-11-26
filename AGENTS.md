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
| #14 `feat/print-models` | Claude | `content/models.ts`, `systems/models.ts`, `tests/models.test.ts` (new); `GameState.mdl/mdls/clk/mp`; `formulas.ts` (`model`, `gpu`, `modelDemand` in `demand`, `clickPower`); manual printing moved from `systems/production.ts` to `systems/models.ts`; `printed` event `share`; actions `tool`, `mdl:*`, `stl:*`; log prefix `*`; `Workshop.tsx` (Models card, tools row, prices per piece); `Side.tsx` print label; `scene/printer.ts` shapes; `tests/bot.ts` |
| `fix/early-balance` (on top of #14) | Claude | `systems/automation.ts` (`autoPrice` controller), `formulas.ts` (`clearingPrice`), `balance.ts` (printer cost, `autoPrice*`), `tree.ts` (`autocena` gating/text), `goals.ts` (goal 2 = sell 30), `tests/bot.ts`, `tests/autoPrice.test.ts` |
| #15 `fix/mobile-touch` | Claude | `styles.css` (touch rules at the top, one media query at the end) |

Merged: #8 analytics, #9 portal assets, #10 workshop discovery, #11 save validation (via #13), #12 market events.

Cross-branch notes:
- `validSave()` calls `validMarketState()` and `validModelState()`; new state with objects or arrays needs its own
  validator there (the generic check only covers numbers and booleans).
- Content is data-driven: new models, events, achievements go into `src/content/` lists; see README "Adding content".

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
