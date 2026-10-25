# Dispatcharr Web Client

A web-based management and streaming client for [Dispatcharr](https://github.com/dispatcharr/dispatcharr), built with React 19, TypeScript, Vite, Tailwind CSS, and Lucide icons.

## Features

- **Full Feature Parity with Dispatcharr Client**:
  - **Channels & Raw Streams**: Search, filter, edit channels, play live TS streams, assign channel numbers sequentially, auto-match EPG, and manage channel groups.
  - **M3U & EPG Manager**: Add/edit/sync M3U playlists and Xtream Codes accounts, manage XMLTV / Schedules Direct sources, trigger force imports, and sync VOD catalogs.
  - **TV Guide (EPG)**: Browse electronic program guide with live broadcast timelines and on-air synopsis, with direct one-click DVR recording scheduling.
  - **DVR Manager**: Manage ongoing, upcoming, and completed recordings, extend runtimes by +15m, trigger Comskip ad-detection, stop active captures, and manage recurring series recording rules.
  - **VOD Library**: Browse Movies and TV Series with cover artwork, plot synopses, ratings, and integrated playback.
  - **Server Stats & Live Monitoring**: Real-time polling of active TS streams and VOD client sessions with bandwidth bitrate gauges and disconnect controls.
  - **Plugins & Directory**: Browse, install, update, and toggle installed plugins from community repositories.
  - **User & Access Management**: Manage user accounts, granular permissions (DVR manage/view, VOD flags), and generate external player API keys.
  - **Logo Manager**: Upload station logos, clean up unused/orphaned logos, and link station branding to channels.
  - **Connect & Webhooks**: Configure external notification webhooks (Discord, Telegram, Slack, Emby) with custom event subscriptions.
  - **System & Diagnostic Logs**: Real-time monospace log viewer with line filtering and export download support.
  - **Settings & Profiles**: Configure stream profiles (codecs, containers), output profiles (HLS segments), user-agent overrides, backup/restore snapshots, and DVR storage tuning.
  - **Notification Center**: Global notification bell with live unread badge count and dismiss-all support.
  - **Integrated Video Player**: Responsive streaming player for live TS feeds and VOD/recordings with fullscreen, volume, and playback controls.
  - **Dual Mode Support**: Connects directly to any self-hosted Dispatcharr instance or runs in standalone Demo Mode with complete preloaded IPTV mock data for immediate exploration.

## Development

```bash
# Install dependencies
npm install

# Start local development server on port 3000
npm run dev

# Build production bundle
npm run build
```
