# Roadmap

The task board lives in **GitHub Issues**, not in this file (status edits here conflicted on every parallel PR).

- Open work: <https://github.com/MaciejOstrowskiIT/3d-printing-game/issues>
- Pick one: label `next-up` (ready), lanes `lane:qa` and `lane:gameplay`, size `effort:S|M|L`.
  Claim it by assigning yourself or adding `agent:claude` / `agent:codex`. Open the PR with `Closes #<issue>`.
- Needs Maciej (infra, portal accounts, playtests): label `owner:maciej`.
- Not scheduled: label `backlog`.
- In review = an open PR; done = a merged PR that closed its issue.

## Direction

1. Make the long game (`BAL.pace`, about 70 h for the bot) worth playing: onboarding, offline summary, settings,
   new content and printer types.
2. Keep quality guarded: QA lane (render tests, save fixtures, e2e in CI, pacing report).
3. After a playtest, decide on the second prestige layer and a third phase from the `backlog` issues.

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
| QA2: Debug hook and stage fixtures (Codex) | #43 |
| QA3: Full-game bot playthrough in Chromium (Codex) | #52 |
| ALPHA badge, bug report form, GitHub issue worker | #41 |
| Tab width and Materials layout shifts | #45 |
| Bug report worker deployed, `REPORT_ENDPOINT` set (Maciej) | #41 |
