# Dispatcharr Android Client

A native Android mobile-first management and streaming client for [Dispatcharr](https://github.com/dispatcharr/dispatcharr), built with Kotlin, Jetpack Compose, Material 3, and Media3 (ExoPlayer).

## Features

- **Full Parity with Dispatcharr WebUI**:
  - **Channels & Raw Streams**: Search, filter, edit channels, play live streams, assign channel numbers, auto-match EPG, and manage channel groups.
  - **M3U & EPG Manager**: Add/edit/sync M3U playlists and Xtream Codes accounts, manage XMLTV / Schedules Direct sources, trigger force imports.
  - **TV Guide (EPG)**: Browse electronic program guide, view on-air broadcasts with synopsis and schedules, trigger DVR recordings directly from programs.
  - **DVR Manager**: Manage ongoing, upcoming, and completed recordings, extend runtimes, trigger Comskip ad-detection, and manage recurring series recording rules.
  - **VOD Library**: Browse Movies and TV Series with cover artwork, metadata, ratings, and integrated playback.
  - **Server Stats & Live Monitoring**: Monitor active TS streams and VOD client sessions with live bandwidth/bitrates and disconnect controls.
  - **Plugins & Directory**: Browse, install, update, and manage installed plugins from community repositories.
  - **User & Access Management**: Manage user accounts, permissions/roles, and generate API keys.
  - **Logo Manager**: Upload station logos, clean up unused logos, and link logos to channels.
  - **Connect & Webhooks**: Configure external notifications and webhooks (Discord, Telegram, Slack).
  - **System Logs**: View server diagnostic logs in real-time.
  - **Settings & Profiles**: Configure stream profiles, output profiles, user-agent overrides, backup/restore, and core server settings.
  - **Notifications**: Integrated notification center with unread count badge and dismiss-all support.
  - **Integrated Live & VOD Player**: Low-overhead hardware decoding via Android Media3 ExoPlayer with orientation locking.

## Building from Source

```bash
./gradlew assembleDebug
```

The compiled APK will be at `app/build/outputs/apk/debug/app-debug.apk`.

## Releases

Automated releases and installable APKs are published via GitHub Actions CI in the [Releases](https://github.com/rdenno/dispatcharr-client/releases) tab.
