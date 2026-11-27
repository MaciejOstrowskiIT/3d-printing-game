# Notes for coding agents

More than one agent works on this repo in parallel (Claude, Codex). Read this before you start, and check
what is in flight on GitHub (see "In flight" below).

Planned work: GitHub Issues (see `ROADMAP.md` for the labels and direction). Pick an unassigned `next-up` issue,
assign yourself, and open the PR with `Closes #<issue>`.

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
- **Styles** live in `src/styles/NN-area.css`, entered through `src/styles/index.css`. The file number is the cascade
  order; put new rules in the file for their area, so parallel PRs rarely touch the same file.
- One feature per branch, branched from the latest `main`; rebase before opening the PR.

## In flight
There is no table in this file any more: it conflicted on every parallel PR. Open PRs are the source of truth.
- Before you start: `gh pr list --state open` and skim the titles; for overlap, `gh pr diff <n> --name-only`.
- When you open a PR, add a line **Touches:** to its description listing the files or areas it changes, so other
  agents can check for overlap without opening the diff.
- Do not add per-PR rows or status lists to this file or to `ROADMAP.md` (status lives in issues and PRs).

Merged: #8–#41 (see `ROADMAP.md` → Done).

Cross-branch notes:
- `validSave()` calls `validMarketState()` and `validModelState()`; new state with objects or arrays needs its own
  validator there (the generic check only covers numbers and booleans).
- Content is data-driven: new models, events, achievements go into `src/content/` lists; see README "Adding content".

Waiting for the cheat-proofing work: rewarded "double offline earnings" and CrazyGames account saves (both touch
`save.ts`, offline catch-up and the platform save API).
