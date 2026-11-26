# Roadmap & task board

Move a card by moving its line between columns. When a PR opens, put its number on the card; when it merges, move
the card to **Done**. Agents: see `AGENTS.md` for the files each open PR touches.

**Effort:** S = up to a day · M = a few days · L = a week or more
**Owner:** Dev = coding (Claude/Codex) · Maciej = needs you

---

## 🔍 In review

| Card | PR | Notes |
|---|---|---|
| Big research tree: 69 nodes in 8 branches on two pages, data-driven research modifiers, 3 new automations | #33 | Pacing: liftoff ~60 min, end ~90 min (bot) |

## 🚦 Next up

| Card | Effort | Owner | Why |
|---|---|---|---|
| **Printer types**: resin (small, very detailed figurines), industrial; trade-offs instead of "more of the same" | M | Dev | Builds on materials and models |
| More rewarded placements (e.g. instant order delivery, skip a breakdown) | S | Dev | More ad revenue; check `ad` events in Umami first |
| Poki animated thumbnail (1080×1080) | S | Dev | Needed before Poki's global release; `promo/video.py` can record it |

## 🧑‍🔧 Your side (Maciej)

| Card | Notes |
|---|---|
| Umami on Proxmox + HTTPS (Cloudflare Tunnel or your reverse proxy) | `infra/umami/README.md` |
| Set repo variables `UMAMI_HOST` and `UMAMI_WEBSITE_ID`, re-run the deploy | Analytics stays off until then |
| Playtest with 5–10 people, read Umami after a week | Where players drop off decides the backlog order |
| CrazyGames submission: progress saving = "Yes, using the Data Module from the CrazyGames SDK" | Without it the data module is disabled (the game falls back to localStorage) |

## 📋 Backlog

### Gameplay
| Card | Effort | Notes |
|---|---|---|
| **Second prestige layer**: IPO after a few production lines, shares give permanent bonuses | M | After players reach several lines |
| **Third phase**: e.g. printing Mars bases from regolith after the asteroid belt | L | Decide after the playtest: only if enough players reach space |
| Split the fleet between models (instead of one model for all printers) | M | More tycoon-style management |

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
