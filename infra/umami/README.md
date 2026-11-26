# Umami analytics (self-hosted)

Anonymous, cookieless analytics for the GitHub Pages build. No consent banner is needed: Umami stores no cookies and no personal data, and visitors are counted with a server-side hash that rotates daily.

## 1. Run it (Proxmox or any Docker host)

On Proxmox, a Debian 12 LXC with `nesting=1` and Docker installed is enough (1 vCPU, 1 GB RAM, 8 GB disk).

```sh
mkdir -p /opt/umami && cd /opt/umami
# copy docker-compose.yml, .env.example and backup.sh from this folder
cp .env.example .env
sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$(openssl rand -hex 24)/; s/^APP_SECRET=.*/APP_SECRET=$(openssl rand -hex 32)/" .env
docker compose up -d
```

Umami listens on `127.0.0.1:3000`. Log in with `admin` / `umami` and **change the password right away**.

## 2. Make it reachable over HTTPS

The game runs on `https://…github.io`, so browsers will only send events to an HTTPS endpoint. Pick one:

- **Cloudflare Tunnel** (no open ports): create a tunnel in Cloudflare Zero Trust, route `stats.yourdomain` to `http://umami:3000`, put the token in `.env` and run `docker compose --profile tunnel up -d`.
- **Your existing reverse proxy** (Nginx Proxy Manager, Traefik, Caddy): proxy `stats.yourdomain` to the container's port 3000.

Check: `curl https://stats.yourdomain/api/heartbeat` returns `{"ok":true}`.

## 3. Connect the game

1. In Umami: *Settings → Websites → Add website*, domain `maciejostrowskiit.github.io`. Copy the **Website ID**.
2. In GitHub: *Settings → Secrets and variables → Actions → Variables*, add:
   - `UMAMI_HOST` = `https://stats.yourdomain`
   - `UMAMI_WEBSITE_ID` = the Website ID
   - `UMAMI_ENDPOINT` (optional) = the same value as `COLLECT_API_ENDPOINT`, if you renamed it
3. Re-run the deploy workflow (or push to `main`). Events appear under *Events* in Umami.

Portal builds (Poki, CrazyGames) never include Umami: the variables are only passed to the GitHub Pages build.

To test locally: `VITE_UMAMI_HOST=… VITE_UMAMI_WEBSITE_ID=… VITE_UMAMI_DEV=1 npm run dev`.
Opt out in a browser with `#notrack` in the URL (remembered), opt back in with `#track=on`.

## Events

Every event carries `min` (minutes of active play on this line), `line` (production line, 1 = first run), `goal` (current goal index), `platform` and `build`.

| Event | Extra data | Answers |
|---|---|---|
| (pageview) | | visits, referrers, countries, devices |
| `open` | `day` (days since first visit in this browser), `lang` | day-1 / day-7 return rate |
| `session` | `kind`: first / continue / new | how many get past the title screen, how many come back |
| `goal` | `index` | **the funnel**: where players stop, and after how many minutes |
| `liftoff` | | how many reach the space phase |
| `end` | `total` | how many finish a line |
| `prestige` | `gain` | how many start a second line |
| `order` | `result` | whether orders are worth keeping |
| `achievement` | `id` | which achievements are reached |
| `ad` | `placement`, `watched` | rewarded-ad completion rate |
| `heartbeat` | | every 5 min of active play: session length distribution |
| `import` | | save import usage |
| `error` | `msg` | uncaught errors (max 3 per page load) |

Useful views in Umami: *Events → goal* filtered by `index` for the funnel, `heartbeat` grouped by `min` for session length, `open` grouped by `day` for retention.

## Backups

`backup.sh` dumps the database into `backups/` and keeps 30 days. Add it to cron: `0 4 * * * /opt/umami/backup.sh`. A Proxmox backup of the whole LXC works too.
