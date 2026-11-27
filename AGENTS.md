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
- Do not reorder `SYSTEMS`, rename existing state fields or change log-arg prefixes (`@ $ # % ~ & ! ^ * + = /`):
  old saves depend on them.
- One feature per branch, branched from the latest `main`; rebase before opening the PR.

## In flight
| PR / branch | Agent | Touches |
|---|---|---|
| #64 / `feat/clicker-achievement` | Codex | Manual print progress, Clicker achievement in PL/EN, save and prestige tests |
| #62 / `fix/daily-order-streak` | Codex | Daily order copy in PL/EN and Playwright coverage |
| #51 / `fix/continuous-finance-line` | Codex | Live finance chart data, PL/EN tooltip, Playwright rollover coverage |
| #56 / `test/qa4-layout-stability` | Codex | Playwright layout tests and config, workshop and research UI stability, PL/EN maintenance text, README |
| `feat/tree-audit` | Claude | `tests/treeAudit.ts`, `docs/tree-audit.md`, `package.json` script |

Merged: #8–#41 (see `ROADMAP.md` → Done).

Cross-branch notes:
- `validSave()` calls `validMarketState()` and `validModelState()`; new state with objects or arrays needs its own
  validator there (the generic check only covers numbers and booleans).
- Content is data-driven: new models, events, achievements go into `src/content/` lists; see README "Adding content".

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
