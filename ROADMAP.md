# Roadmap & task board

Move a card by moving its line between columns. When a PR opens, put its number on the card; when it merges, move
the card to **Done**. Agents: see `AGENTS.md` for the files each open PR touches.

**Effort:** S = up to a day · M = a few days · L = a week or more
**Owner:** Dev = coding (Claude/Codex) · Maciej = needs you

---

## 🔍 In review

| Card | PR | Notes |
|---|---|---|
| Rewarded "double offline earnings" | #17 | Merge first |
| Realistic mode (new-line challenge) | #18 | Built on #17 |
| CrazyGames account saves (data module) | #19 | Merge after #18; needs the submission setting below |

## In progress

| Card | Branch | Owner |
|---|---|---|
| Print problems & quality | `feat/print-quality` | Codex |

## 🚦 Next up

| Card | Effort | Owner | Why |
|---|---|---|---|
| **Materials**: PLA, PETG, TPU, resin; each with its own price, durability and matching models | S | Dev | Same data-registry pattern as models; many new combinations for little code |
| **Order of the day**: one special order per day, bonus for a streak | S | Dev | Day-1/day-7 return, measured in Umami (`open.day`) |
| Smooth the farm phase (~20 min): production jumps by 60 printers per farm | S | Dev | Next balance candidate after #16 |

## 🧑‍🔧 Your side (Maciej)

| Card | Notes |
|---|---|
| Umami on Proxmox + HTTPS (Cloudflare Tunnel or your reverse proxy) | `infra/umami/README.md` |
| Set repo variables `UMAMI_HOST` and `UMAMI_WEBSITE_ID`, re-run the deploy | Analytics stays off until then |
| Playtest with 5–10 people, read Umami after a week | Where players drop off decides the backlog order |
| CrazyGames submission: progress saving = "Yes, using the Data Module from the CrazyGames SDK" | Without it the data module is disabled (the game falls back to localStorage) |
| Merge order: #17 → #18 → #19 | |

## 📋 Backlog

### Gameplay
| Card | Effort | Notes |
|---|---|---|
| **Printer types**: resin (small, very detailed figurines), industrial; trade-offs instead of "more of the same" | M | Pairs with materials |
| **Calendar events** tied to the real date (Christmas rush, Halloween masks…) | S | Reuses the market-event system |
| **Story messages** from clients, competitors and the "AI board" (Paperclips-style narrative) | S | Cheap; gives the game character |
| **Second prestige layer**: IPO after a few production lines, shares give permanent bonuses | M | After players reach several lines |
| **Third phase**: e.g. printing Mars bases from regolith after the asteroid belt | L | Decide after the playtest: only if enough players reach space |
| Split the fleet between models (instead of one model for all printers) | M | More tycoon-style management |

### Monetization & portals
| Card | Effort | Notes |
|---|---|---|
| Poki animated thumbnail (1080×1080) | S | Needed before Poki's global release; `promo/video.py` can record it |
| More rewarded placements (e.g. instant order delivery, skip a breakdown) | S | Check `ad` events in Umami first |
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
