# Dispatcharr Mobile

A mobile-first web UI for [Dispatcharr](https://github.com/Dispatcharr/Dispatcharr), built for the
things you actually do from a phone:

- **Fix a channel:** preview it, see each stream's source and last-probed quality, remove dead
  streams (with Undo), reorder failover, search every provider for a replacement, preview it and
  add it. If the channel is live, switch current viewers to a different stream.
- **Manage sources:** M3U and Xtream accounts (credentials, max streams, refresh interval, user
  agent, active toggle, refresh now, profiles) and EPG sources (refresh, active toggle).
- **Watch activity:** live channels with clients, bitrate and resolution; stop a channel or
  disconnect a client.
- **Channels:** search, filter by group, create, rename, renumber, regroup, change stream profile,
  delete.

Everything else (EPG mapping, DVR, VOD, plugins, users, logos, backups) is one tap away via
**More → Open full Dispatcharr**.

## How it's served

The app is a static single-page app served at **`/m/` on the same origin as Dispatcharr** (behind
the same reverse proxy and Authelia). Being same-origin means:

- No CORS and no separate API host: it calls Dispatcharr's `/api/...` and `/proxy/...` directly.
- One login: it uses the same `localStorage` tokens as Dispatcharr's own UI.
- It can be installed as a PWA (Add to Home Screen) and opens at `/m/`.

nginx sends phones that open `/` to `/m/` based on the User-Agent. In the app, **More → Open this
app on phones** sets a `dispatcharr_ui` cookie to opt out. See
[`deploy/nginx-dispatcharr-mobile.conf`](deploy/nginx-dispatcharr-mobile.conf).

Targets Dispatcharr's v0.30 API (`/api/schema/`).

## Development

```bash
npm install
npm run dev        # http://localhost:5180/m/ — proxies /api and /proxy to DISPATCHARR_URL
```

`DISPATCHARR_URL` defaults to `http://127.0.0.1:9191`.

## Deploy

```bash
deploy/deploy.sh            # builds, then copies dist/ to /var/www/dispatcharr-mobile/m on the VPS
```
