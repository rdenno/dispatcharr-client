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

- **Stream health:** a scanner (below) checks channel streams a few times a day; results show as
  badges on streams, dots on channels and a panel on the Activity tab.

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

## Stream health scanner

[`scanner/`](scanner) is a small container (Python + ffmpeg) that runs next to Dispatcharr.
Every `SCAN_INTERVAL_HOURS` (default 6) and on demand (**Activity → Scan now**) it:

1. Takes the channels in one channel profile (`PROFILE_NAME`, default `Plex`), skipping
   auto-created event channels and any `EXCLUDE_GROUPS`.
2. Samples each of their streams for 25 s through Dispatcharr's preview path, one at a time,
   skipping any M3U account someone is currently watching (if all are busy it retries later).
   The video is copied, not decoded; only keyframes are decoded as tiny thumbnails. About
   2-3% of one CPU core while running, no GPU.
3. Judges each stream: **fail** for no video, stalls, low or dropped frame rate, frozen/black
   picture, looping picture or very low bitrate; **warn** for low bitrate, missing audio,
   timestamp jumps (these break Plex) or footage identical to the previous scan.
4. With `AUTO_FIX=true`, when a channel's primary fails it moves the best passing stream on
   the channel to the top; if none pass, it searches for alternatives (skipping streams named
   like the failed ones, since the same stream on another source usually fails too), probes up
   to `MAX_CANDIDATES` and adds the best one to the top. A primary that someone is watching
   and Dispatcharr reports healthy is left alone.

Setup: copy `scanner/` somewhere permanent, create `.env` from `.env.example` (an API key from
Dispatcharr → user menu → Generate API Key, and a random `SCANNER_TOKEN`), then
`docker compose up -d --build`. nginx proxies `/m/health/` to it and adds the token; see
[`deploy/nginx-dispatcharr-mobile.conf`](deploy/nginx-dispatcharr-mobile.conf).
