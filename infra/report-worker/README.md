# Bug report worker

A tiny Cloudflare Worker (free plan is enough) that turns in-game bug reports into GitHub issues labelled
`bug-report`. The GitHub token stays in the worker, so it never ends up in the public game build.

```
game (Report a bug) --POST JSON--> worker --GitHub API--> issue in the repo
```

## Setup (once)

1. **Token.** GitHub → Settings → Developer settings → Fine-grained tokens. Resource owner: you, only this
   repository, permission **Issues: Read and write**, nothing else. Set a calendar reminder for its expiry.
2. **Deploy.**
   ```sh
   cd infra/report-worker
   npx wrangler login
   npx wrangler secret put GITHUB_TOKEN     # paste the token
   npx wrangler deploy                      # prints https://drukarnia-report.<you>.workers.dev
   ```
3. **Point the game at it.** Repository → Settings → Secrets and variables → Actions → Variables: add
   `REPORT_ENDPOINT` with the worker URL, then re-run the deploy workflow (the build reads it as
   `VITE_REPORT_ENDPOINT`). Without it the game falls back to an Umami event.
4. Edit `ALLOWED_ORIGINS` in `wrangler.toml` if the game is served from other domains (portal domains are included).

## What it does

- Accepts `POST` JSON `{description, lang, build, min, line, goal, phase, view, at}`, body under 4 KB, text 10–600 chars.
- Rejects other origins (CORS), more than 3 requests per minute per IP, anything malformed.
- Writes the text into a code fence, so a player cannot inject markdown, links or `@mentions` into the issue.
- Moderates the text with Llama Guard on Workers AI (free tier, `[ai]` binding in `wrangler.toml`, no key needed) before opening the issue: unsafe reports (hate, harassment, threats, sexual or violent content) get `422` and never reach GitHub. Llama Guard misses plain vulgar insults (and is weak at Polish), so a short PL/EN word filter (`src/profanity.ts`: diacritics, leetspeak and repeated letters normalized) runs first and also answers `422`. It fails open: without the binding, or on an error or timeout (4 s), the report goes through. Deploy again with `npx wrangler deploy` to pick up the binding.
- Answers only `202`/`4xx`/`502`, never GitHub's response.

## Local test

`npm test` covers the handler (`tests/reportWorker.test.ts`). Manual:
```sh
npx wrangler dev
curl -X POST localhost:8787 -H 'Content-Type: application/json' -d '{"description":"test report from curl"}'
```
(This opens a real issue. Use a throwaway repo in `GITHUB_REPO` via `.dev.vars` while testing.)
