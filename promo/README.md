# Promo assets

Covers, screenshots and preview videos for portal submissions, generated from the real game so they stay in sync with the art.

```sh
pip install playwright && playwright install chromium   # once; ffmpeg must be on PATH
npm run promo                                         # -> promo/out/ (git-ignored)
```

| File | Size | Where |
|---|---|---|
| `cover-landscape.png` | 1920×1080 | CrazyGames landscape cover |
| `cover-portrait.png` | 800×1200 | CrazyGames portrait cover |
| `cover-square.png` | 800×800 | CrazyGames square cover |
| `cover-poki.png` | 1024×1024 | Poki thumbnail (no text, full bleed) |
| `cover-icon512.png` | 512×512 | app icon, itch.io, social |
| `video-landscape.mp4` | 1920×1080, ~17 s | CrazyGames landscape preview |
| `video-portrait.mp4` | 1080×1620, ~17 s | CrazyGames portrait preview |
| `screenshot-*.png` | 1920×1080, mobile 1170×2532 | store pages, itch.io |

How it works:
- `snapshots.ts` plays the game with the balance bot and saves states at key moments into `states/` (committed).
- `covers.html` + `covers.ts` compose covers from the game's own SVG art (printer close-up, isometric factory floor).
- `render.py` loads states into the built game and screenshots it, then screenshots each cover.
- `video.py` records real-time gameplay (no fast-forward, no sound, cover as the first frame) via the Chrome screencast and encodes H.264 with ffmpeg.

Cover rules followed: CrazyGames allows only the game title as text and no icons or store logos; Poki wants a square, full-bleed image without text, borders or rounded corners. Poki also asks for an animated thumbnail (1080×1080) before global release; not generated yet.
Store texts: `listing.md`.
