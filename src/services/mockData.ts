import {
  Channel,
  ChannelGroup,
  RawStream,
  PlaylistAccount,
  EpgSource,
  EpgProgram,
  Recording,
  RecurringRule,
  VodMovie,
  VodSeries,
  LiveStreamStatus,
  VodClientStatus,
  PluginItem,
  ChannelLogo,
  ConnectIntegration,
  LogFile,
  SystemNotification,
  StreamProfile,
  OutputProfile,
  UserAgent,
  User,
} from '../types/dispatcharr';

export const initialGroups: ChannelGroup[] = [
  { id: 1, name: 'Sports', channel_count: 5 },
  { id: 2, name: 'Entertainment & Series', channel_count: 6 },
  { id: 3, name: 'News & Info', channel_count: 4 },
  { id: 4, name: 'Movies & Cinema', channel_count: 4 },
  { id: 5, name: 'Documentary', channel_count: 3 },
];

export const initialChannels: Channel[] = [
  {
    id: 101,
    uuid: 'ch-espn-hd-01',
    name: 'ESPN HD',
    channel_number: '101',
    logo_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 1,
    channel_group_name: 'Sports',
    stream_count: 2,
    epg_channel_id: 'espn.us',
  },
  {
    id: 102,
    uuid: 'ch-sky-sports-main',
    name: 'Sky Sports Main Event',
    channel_number: '102',
    logo_url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 1,
    channel_group_name: 'Sports',
    stream_count: 1,
    epg_channel_id: 'skysports.me.uk',
  },
  {
    id: 103,
    uuid: 'ch-bbc-one-hd',
    name: 'BBC One HD',
    channel_number: '103',
    logo_url: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 2,
    channel_group_name: 'Entertainment & Series',
    stream_count: 1,
    epg_channel_id: 'bbcone.uk',
  },
  {
    id: 104,
    uuid: 'ch-sky-cinema-premiere',
    name: 'Sky Cinema Premiere HD',
    channel_number: '104',
    logo_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 4,
    channel_group_name: 'Movies & Cinema',
    stream_count: 2,
    epg_channel_id: 'skycinema.premiere',
  },
  {
    id: 105,
    uuid: 'ch-cnn-international',
    name: 'CNN International',
    channel_number: '105',
    logo_url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 3,
    channel_group_name: 'News & Info',
    stream_count: 1,
    epg_channel_id: 'cnn.int',
  },
  {
    id: 106,
    uuid: 'ch-natgeo-wild',
    name: 'National Geographic Wild',
    channel_number: '106',
    logo_url: 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=120&auto=format&fit=crop&q=60',
    enabled: true,
    channel_group: 5,
    channel_group_name: 'Documentary',
    stream_count: 1,
    epg_channel_id: 'natgeo.wild',
  },
  {
    id: 107,
    uuid: 'ch-discovery-hd',
    name: 'Discovery Channel HD',
    channel_number: '107',
    logo_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=120&auto=format&fit=crop&q=60',
    enabled: false,
    channel_group: 5,
    channel_group_name: 'Documentary',
    stream_count: 0,
    epg_channel_id: 'discovery.hd',
  },
];

export const initialStreams: RawStream[] = [
  {
    id: 1,
    name: 'ESPN US FHD 60FPS [Backup 1]',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 1,
    playlist_name: 'Primary IPTV Provider (Xtream)',
    channel_id: 101,
    channel_name: 'ESPN HD',
    resolution: '1920x1080',
    fps: 60,
    status: 'online',
  },
  {
    id: 2,
    name: 'ESPN US 720p Direct Feed',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 1,
    playlist_name: 'Primary IPTV Provider (Xtream)',
    channel_id: 101,
    channel_name: 'ESPN HD',
    resolution: '1280x720',
    fps: 30,
    status: 'online',
  },
  {
    id: 3,
    name: 'Sky Sports Main Event 1080p50',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 1,
    playlist_name: 'Primary IPTV Provider (Xtream)',
    channel_id: 102,
    channel_name: 'Sky Sports Main Event',
    resolution: '1920x1080',
    fps: 50,
    status: 'online',
  },
  {
    id: 4,
    name: 'BBC One London HD H.264',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 2,
    playlist_name: 'Freeview UK OTA M3U',
    channel_id: 103,
    channel_name: 'BBC One HD',
    resolution: '1920x1080',
    fps: 25,
    status: 'online',
  },
  {
    id: 5,
    name: 'Sky Cinema Premiere 1080p Surround 5.1',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 1,
    playlist_name: 'Primary IPTV Provider (Xtream)',
    channel_id: 104,
    channel_name: 'Sky Cinema Premiere HD',
    resolution: '1920x1080',
    fps: 24,
    status: 'online',
  },
  {
    id: 6,
    name: 'CNN Int 1080p Europe Feed',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    playlist_id: 2,
    playlist_name: 'Freeview UK OTA M3U',
    channel_id: 105,
    channel_name: 'CNN International',
    resolution: '1920x1080',
    fps: 30,
    status: 'online',
  },
];

export const initialPlaylists: PlaylistAccount[] = [
  {
    id: 1,
    name: 'Primary IPTV Provider (Xtream)',
    type: 'xtream',
    url: 'http://iptv.provider-stream.net:8080',
    username: 'subscriber_90210',
    password: '••••••••••••',
    max_streams: 4,
    refresh_interval: 24,
    epg_source: 1,
    enabled: true,
    last_refresh: new Date(Date.now() - 3600000 * 4).toISOString(),
    stream_count: 1420,
  },
  {
    id: 2,
    name: 'Freeview UK OTA M3U',
    type: 'm3u',
    url: 'https://raw.githubusercontent.com/freeview/streams/main/uk.m3u',
    max_streams: 2,
    refresh_interval: 12,
    epg_source: 2,
    enabled: true,
    last_refresh: new Date(Date.now() - 3600000 * 2).toISOString(),
    stream_count: 85,
  },
];

export const initialEpgSources: EpgSource[] = [
  {
    id: 1,
    name: 'XMLTV UK & US Guide (GZ)',
    type: 'xmltv',
    url: 'https://epgshare01.online/epgshare01/epg_ripper_ALL_SOURCES1.xml.gz',
    refresh_interval: 12,
    enabled: true,
    last_refresh: new Date(Date.now() - 3600000 * 6).toISOString(),
    channel_count: 450,
  },
  {
    id: 2,
    name: 'Schedules Direct Lineup',
    type: 'schedules_direct',
    url: 'https://json.schedulesdirect.org/20141201/',
    username: 'sd_user_rhys',
    refresh_interval: 24,
    enabled: true,
    last_refresh: new Date(Date.now() - 3600000 * 18).toISOString(),
    channel_count: 120,
  },
];

const now = Date.now();
export const initialPrograms: Record<string, EpgProgram> = {
  'ch-espn-hd-01': {
    title: 'NBA: Golden State Warriors vs. LA Lakers',
    description: 'Live coverage from Chase Center. Analysis, play-by-play commentary, and court-side post-game interviews.',
    start_time: new Date(now - 1000 * 60 * 45).toISOString(),
    end_time: new Date(now + 1000 * 60 * 75).toISOString(),
    category: 'Basketball / Live Sports',
  },
  'ch-sky-sports-main': {
    title: 'Premier League: Arsenal vs Manchester City',
    description: 'Crucial title race clash live from Emirates Stadium. Gary Neville and Jamie Carragher provide punditry.',
    start_time: new Date(now - 1000 * 60 * 30).toISOString(),
    end_time: new Date(now + 1000 * 60 * 60).toISOString(),
    category: 'Football / Live Sports',
  },
  'ch-bbc-one-hd': {
    title: 'Planet Earth III: Ocean Depths',
    description: 'Sir David Attenborough travels to the abyss to reveal astonishing deep-sea adaptations and bioluminescent coral reefs.',
    start_time: new Date(now - 1000 * 60 * 15).toISOString(),
    end_time: new Date(now + 1000 * 60 * 45).toISOString(),
    category: 'Documentary / Nature',
  },
  'ch-sky-cinema-premiere': {
    title: 'Dune: Part Two (2024)',
    description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    start_time: new Date(now - 1000 * 60 * 60).toISOString(),
    end_time: new Date(now + 1000 * 60 * 100).toISOString(),
    category: 'Sci-Fi / Action',
  },
  'ch-cnn-international': {
    title: 'The Lead with Jake Tapper',
    description: 'In-depth global political analysis, breaking world news updates, and interviews with international leaders.',
    start_time: new Date(now - 1000 * 60 * 20).toISOString(),
    end_time: new Date(now + 1000 * 60 * 40).toISOString(),
    category: 'News & Current Affairs',
  },
  'ch-natgeo-wild': {
    title: 'Predator Island: Big Cats',
    description: 'Tracking pride dynamics in the Okavango Delta during the dry season migrations.',
    start_time: new Date(now - 1000 * 60 * 10).toISOString(),
    end_time: new Date(now + 1000 * 60 * 50).toISOString(),
    category: 'Wildlife',
  },
};

export const initialRecordings: Recording[] = [
  {
    id: 1,
    title: 'Formula 1: Monaco Grand Prix - Qualifying',
    channel_id: 102,
    channel_name: 'Sky Sports Main Event',
    status: 'completed',
    start_time: new Date(now - 3600000 * 24).toISOString(),
    end_time: new Date(now - 3600000 * 22).toISOString(),
    file_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    file_size: 4294967296,
    comskip_status: 'Commercials detected and chaptered (3 breaks)',
  },
  {
    id: 2,
    title: 'NBA: Golden State Warriors vs. LA Lakers',
    channel_id: 101,
    channel_name: 'ESPN HD',
    status: 'recording',
    start_time: new Date(now - 1000 * 60 * 45).toISOString(),
    end_time: new Date(now + 1000 * 60 * 75).toISOString(),
    file_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    file_size: 1850000000,
    comskip_status: 'Processing in background',
  },
  {
    id: 3,
    title: 'Doctor Who: Season Finale',
    channel_id: 103,
    channel_name: 'BBC One HD',
    status: 'scheduled',
    start_time: new Date(now + 3600000 * 4).toISOString(),
    end_time: new Date(now + 3600000 * 5).toISOString(),
  },
  {
    id: 4,
    title: 'Oppenheimer (2023)',
    channel_id: 104,
    channel_name: 'Sky Cinema Premiere HD',
    status: 'completed',
    start_time: new Date(now - 3600000 * 48).toISOString(),
    end_time: new Date(now - 3600000 * 45).toISOString(),
    file_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    file_size: 6800000000,
    comskip_status: 'Clean broadcast (no ads)',
  },
];

export const initialRecurringRules: RecurringRule[] = [
  {
    id: 1,
    title: 'Formula 1 Live Races & Qualifying',
    channel_id: 102,
    channel_name: 'Sky Sports Main Event',
    match_type: 'series',
    days_of_week: ['Saturday', 'Sunday'],
    keep_limit: 10,
  },
  {
    id: 2,
    title: 'Planet Earth III',
    channel_id: 103,
    channel_name: 'BBC One HD',
    match_type: 'title',
    days_of_week: ['Sunday'],
    keep_limit: 8,
  },
];

export const initialMovies: VodMovie[] = [
  {
    id: 1,
    title: 'Dune: Part Two',
    overview: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
    year: '2024',
    rating: 8.6,
    poster_path: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&auto=format&fit=crop&q=80',
    duration: 166,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 2,
    title: 'Oppenheimer',
    overview: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
    year: '2023',
    rating: 8.9,
    poster_path: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=300&auto=format&fit=crop&q=80',
    duration: 180,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 3,
    title: 'Blade Runner 2049',
    overview: 'Young Blade Runner K discovers a long-buried secret that leads him to track down former Blade Runner Rick Deckard.',
    year: '2017',
    rating: 8.0,
    poster_path: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80',
    duration: 164,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    id: 4,
    title: 'Interstellar',
    overview: 'When Earth becomes uninhabitable in the future, a farmer and ex-NASA pilot is tasked to pilot a spacecraft to find a new planet.',
    year: '2014',
    rating: 8.7,
    poster_path: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&auto=format&fit=crop&q=80',
    duration: 169,
    stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export const initialSeries: VodSeries[] = [
  {
    id: 101,
    title: 'Severance',
    overview: 'Mark leads a team of office workers whose memories have been surgically divided between their work and personal lives.',
    year: '2022',
    rating: 8.7,
    poster_path: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80',
    seasons_count: 2,
    episodes_count: 19,
  },
  {
    id: 102,
    title: 'Succession',
    overview: 'The Roy family is known for controlling the biggest media and entertainment company in the world. However, their world changes when their aging father steps down.',
    year: '2023',
    rating: 8.9,
    poster_path: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&auto=format&fit=crop&q=80',
    seasons_count: 4,
    episodes_count: 39,
  },
  {
    id: 103,
    title: 'The Last of Us',
    overview: 'After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity’s last hope.',
    year: '2023',
    rating: 8.8,
    poster_path: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=300&auto=format&fit=crop&q=80',
    seasons_count: 1,
    episodes_count: 9,
  },
];

export const initialLiveStreams: LiveStreamStatus[] = [
  {
    channel_id: 'ch-espn-hd-01',
    channel_name: 'ESPN HD',
    name: 'ESPN HD',
    client_count: 3,
    bitrate: 4850.5,
    uptime: 14200,
    clients: [
      { id: 'cl_apple_tv', ip: '192.168.1.105', user_agent: 'TiviMate/5.1.0' },
      { id: 'cl_living_room', ip: '192.168.1.112', user_agent: 'Kodi/21.0 (Omega)' },
      { id: 'cl_iphone', ip: '192.168.1.144', user_agent: 'Dispatcharr-Client/0.1.0' },
    ],
  },
  {
    channel_id: 'ch-sky-sports-main',
    channel_name: 'Sky Sports Main Event',
    name: 'Sky Sports Main Event',
    client_count: 1,
    bitrate: 6200.0,
    uptime: 3820,
    clients: [
      { id: 'cl_bedroom_shield', ip: '192.168.1.108', user_agent: 'Dispatcharr-Web/1.0' },
    ],
  },
];

export const initialVodClients: VodClientStatus[] = [
  {
    client_id: 'vod_sess_8912',
    title: 'Dune: Part Two (2024)',
    ip: '192.168.1.130',
    duration: 4520,
    bitrate: 8500.0,
  },
];

export const initialPlugins: PluginItem[] = [
  {
    key: 'comskip_analyzer',
    name: 'Comskip Commercial Detector',
    version: '1.4.2',
    description: 'Automatically analyzes completed TS recordings, detects ad blocks, and generates EDL / chapter markers.',
    author: 'Dispatcharr Community',
    enabled: true,
    installed: true,
  },
  {
    key: 'm3u_cleaner_pro',
    name: 'M3U Stream Health Checker',
    version: '2.1.0',
    description: 'Periodically tests response latencies for raw streams and rotates degraded backups.',
    author: 'rdenno',
    enabled: true,
    installed: true,
  },
  {
    key: 'discord_notifications',
    name: 'Discord Live Event Webhook',
    version: '1.0.5',
    description: 'Sends rich embed cards to Discord when recordings start, finish, or error out.',
    author: 'Dispatcharr Core',
    enabled: false,
    installed: true,
  },
];

export const initialDirectoryPlugins: PluginItem[] = [
  {
    key: 'epg_schedules_direct_enhancer',
    name: 'Schedules Direct Metadata Extender',
    version: '1.2.0',
    description: 'Enriches raw XMLTV data with high-resolution poster artwork, episode titles, and TMDB ratings.',
    author: 'Dispatcharr Community',
    enabled: false,
    installed: false,
  },
  {
    key: 'hardware_transcoder_vaapi',
    name: 'VA-API Intel QuickSync Transcoder',
    version: '3.0.1',
    description: 'Leverages hardware video encoding for on-the-fly H.264/HEVC transcoding of high-bitrate streams.',
    author: 'Intel-Linux Contrib',
    enabled: false,
    installed: false,
  },
];

export const initialLogos: ChannelLogo[] = [
  { id: 1, name: 'espn_hd_badge.png', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60', channel_count: 1, file_size: 45200 },
  { id: 2, name: 'sky_sports_white.png', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=120&auto=format&fit=crop&q=60', channel_count: 1, file_size: 38100 },
  { id: 3, name: 'bbc_one_vector.png', url: 'https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=120&auto=format&fit=crop&q=60', channel_count: 1, file_size: 51200 },
  { id: 4, name: 'cnn_globe.png', url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=120&auto=format&fit=crop&q=60', channel_count: 1, file_size: 62000 },
  { id: 5, name: 'unused_station_logo_temp.png', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=120&auto=format&fit=crop&q=60', channel_count: 0, file_size: 98000 },
];

export const initialIntegrations: ConnectIntegration[] = [
  {
    id: 1,
    name: 'Discord Home Lab Alerts',
    integration_type: 'discord',
    url: 'https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz',
    events: ['recording_started', 'recording_completed', 'server_error'],
    enabled: true,
  },
  {
    id: 2,
    name: 'Emby Server DVR Sync',
    integration_type: 'emby',
    url: 'http://192.168.1.50:8096/emby/LiveTv/Tuners',
    events: ['guide_refreshed'],
    enabled: true,
  },
];

export const initialLogs: LogFile[] = [
  { name: 'dispatcharr.log', size: 1048576, updated_at: new Date(now - 60000).toISOString() },
  { name: 'm3u_sync_worker.log', size: 458900, updated_at: new Date(now - 3600000).toISOString() },
  { name: 'dvr_recorder.log', size: 212400, updated_at: new Date(now - 120000).toISOString() },
  { name: 'ffmpeg_transcode_01.log', size: 89000, updated_at: new Date(now - 300000).toISOString() },
];

export const sampleLogContent: Record<string, string> = {
  'dispatcharr.log': `[INFO]  2026-10-24 16:55:01 Core Server initialized on 0.0.0.0:8000
[INFO]  2026-10-24 16:55:02 Loaded 1420 channels across 5 groups
[INFO]  2026-10-24 17:00:15 M3U sync completed successfully for account 'Primary IPTV Provider'
[INFO]  2026-10-24 17:02:40 Client connected to stream /proxy/ts/stream/ch-espn-hd-01 from 192.168.1.105 (TiviMate/5.1.0)
[INFO]  2026-10-24 17:02:41 Stream negotiated: 1920x1080@60fps, Video bitrate 4850 kbps, AAC stereo 192 kbps
[INFO]  2026-10-24 17:04:12 DVR Worker: Started recording rule #2 'NBA Warriors vs Lakers'
[DEBUG] 2026-10-24 17:08:33 Comskip worker triggered for completed chunk in /recordings/dvr_nba_01.ts
[INFO]  2026-10-24 17:09:00 Heartbeat OK: 2 active streams, 4 clients, CPU 6.4%, Memory 248MB`,
  'dvr_recorder.log': `[INFO] 2026-10-24 16:45:00 [DVR Engine] Scheduler tick: 1 active recording, 1 scheduled
[INFO] 2026-10-24 16:45:01 [DVR Engine] Spawning capture process for ESPN HD -> /var/dispatcharr/recordings/dvr_2.ts
[INFO] 2026-10-24 16:45:02 [DVR Engine] Stream container TS synchronized, keyframes every 2.0s
[INFO] 2026-10-24 17:05:00 [DVR Engine] Extended recording +15 minutes via management API call`,
  'm3u_sync_worker.log': `[INFO] 2026-10-24 13:00:00 Fetching M3U playlist from http://iptv.provider-stream.net:8080/get.php
[INFO] 2026-10-24 13:00:04 Received 1420 lines of playlist data (4.2 MB)
[INFO] 2026-10-24 13:00:08 Re-indexed 1420 streams, matched 106 EPG references.
[INFO] 2026-10-24 13:00:10 Sync finished with 0 errors.`,
  'ffmpeg_transcode_01.log': `ffmpeg version 6.1.1 Copyright (c) 2000-2023 the FFmpeg developers
built with gcc 12.2.0 for Linux
Input #0, mpegts, from 'http://upstream-source/stream.ts':
  Duration: N/A, start: 1042.112000, bitrate: N/A
  Stream #0:0[0x100]: Video: h264 (High), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 60 fps
  Stream #0:1[0x101]: Audio: aac (LC), 48000 Hz, stereo, fltp, 192 kb/s
Output #0, hls, to '/var/run/dispatcharr/hls/ch-espn/index.m3u8':
frame= 1854 fps= 60 q=-1.0 size=N/A time=00:30:54.00 bitrate=4850.2kbits/s speed=1.0x`,
};

export const initialNotifications: SystemNotification[] = [
  {
    id: 1,
    title: 'DVR Recording Completed',
    message: 'Formula 1 Monaco GP Qualifying finished recording and Comskip analysis completed.',
    level: 'success',
    timestamp: new Date(now - 3600000 * 2).toISOString(),
    dismissed: false,
  },
  {
    id: 2,
    title: 'M3U Sync Warning',
    message: 'Freeview UK OTA M3U had 3 unreachable streams during the last sync.',
    level: 'warning',
    timestamp: new Date(now - 3600000 * 5).toISOString(),
    dismissed: false,
  },
];

export const initialStreamProfiles: StreamProfile[] = [
  { id: 1, name: 'Direct Stream (Passthrough)', video_codec: 'copy', audio_codec: 'copy', container: 'mpegts' },
  { id: 2, name: 'H.264 1080p Transcode', video_codec: 'libx264', audio_codec: 'aac', resolution: '1920x1080', container: 'hls' },
  { id: 3, name: 'Low Bandwidth 720p', video_codec: 'libx264', audio_codec: 'aac', resolution: '1280x720', container: 'hls' },
];

export const initialOutputProfiles: OutputProfile[] = [
  { id: 1, name: 'Standard HLS Segments', segment_length: 6, output_type: 'hls' },
  { id: 2, name: 'Low Latency HLS (LL-HLS)', segment_length: 2, output_type: 'll-hls' },
];

export const initialUserAgents: UserAgent[] = [
  { id: 1, name: 'VLC Media Player', user_agent_string: 'VLC/3.0.18 LibVLC/3.0.18' },
  { id: 2, name: 'Kodi Media Center', user_agent_string: 'Kodi/21.0 (Linux; Android 12) LibVLC/3.0' },
  { id: 3, name: 'TiviMate IPTV Player', user_agent_string: 'TiviMate/5.1.0 (Android TV)' },
];

export const initialUsers: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@dispatcharr.local',
    user_level: 10,
    custom_properties: { dvr_access: 'manage', vod_movies_enabled: true, vod_series_enabled: true },
    date_joined: '2026-01-10T08:00:00Z',
    last_login: new Date(now - 600000).toISOString(),
  },
  {
    id: 2,
    username: 'family_tv',
    email: 'livingroom@dispatcharr.local',
    user_level: 1,
    custom_properties: { dvr_access: 'view', vod_movies_enabled: true, vod_series_enabled: true },
    date_joined: '2026-02-15T12:00:00Z',
    last_login: new Date(now - 3600000 * 3).toISOString(),
  },
  {
    id: 3,
    username: 'guest_streamer',
    user_level: 0,
    custom_properties: { dvr_access: 'none', vod_movies_enabled: false, vod_series_enabled: false },
    date_joined: '2026-03-01T15:00:00Z',
  },
];
