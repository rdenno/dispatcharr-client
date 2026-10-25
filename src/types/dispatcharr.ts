// Dispatcharr Data Models and Types

export interface UserCustomProperties {
  dvr_access?: 'none' | 'view' | 'manage';
  vod_movies_enabled?: boolean;
  vod_series_enabled?: boolean;
  navOrder?: string[];
  hiddenNav?: string[];
  [key: string]: any;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  user_level: number; // 0 = Streamer, 1 = Standard, 10 = Admin
  custom_properties?: UserCustomProperties;
  date_joined?: string;
  last_login?: string;
}

export interface ChannelGroup {
  id: number;
  name: string;
  channel_count?: number;
}

export interface ChannelProfile {
  id: number;
  name: string;
}

export interface StreamProfile {
  id: number;
  name: string;
  video_codec?: string;
  audio_codec?: string;
  container?: string;
  resolution?: string;
}

export interface OutputProfile {
  id: number;
  name: string;
  segment_length?: number;
  output_type?: string;
}

export interface UserAgent {
  id: number;
  name: string;
  user_agent_string: string;
}

export interface Channel {
  id: number;
  uuid?: string;
  name: string;
  channel_number?: string | number;
  logo_url?: string;
  enabled: boolean;
  channel_group?: number | null;
  channel_group_name?: string;
  stream_profile?: number | null;
  stream_count?: number;
  epg_channel_id?: string;
}

export interface RawStream {
  id: number;
  name: string;
  url: string;
  playlist_id?: number;
  playlist_name?: string;
  channel_id?: number | null;
  channel_name?: string;
  resolution?: string;
  fps?: number;
  status?: string;
}

export interface PlaylistAccount {
  id: number;
  name: string;
  type: 'm3u' | 'xtream';
  url: string;
  username?: string;
  password?: string;
  max_streams?: number;
  refresh_interval?: number;
  epg_source?: number | null;
  stream_profile?: number | null;
  user_agent?: number | null;
  enabled: boolean;
  last_refresh?: string;
  stream_count?: number;
}

export interface EpgSource {
  id: number;
  name: string;
  type: 'xmltv' | 'schedules_direct';
  url: string;
  username?: string;
  password?: string;
  refresh_interval?: number;
  enabled: boolean;
  last_refresh?: string;
  channel_count?: number;
}

export interface EpgProgram {
  id?: number | string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category?: string;
  poster_url?: string;
  season?: number;
  episode?: number;
}

export interface Recording {
  id: number;
  title: string;
  channel_id: number;
  channel_name?: string;
  channel_logo?: string;
  status: 'recording' | 'scheduled' | 'completed' | 'failed' | 'upcoming';
  start_time: string;
  end_time: string;
  file_url?: string;
  file_size?: number;
  comskip_status?: string;
}

export interface RecurringRule {
  id: number;
  title: string;
  channel_id?: number | null;
  channel_name?: string;
  match_type: 'title' | 'exact' | 'series';
  days_of_week?: string[];
  keep_limit?: number;
}

export interface VodMovie {
  id: number;
  name?: string;
  title?: string;
  overview?: string;
  plot?: string;
  release_date?: string;
  year?: string;
  poster_path?: string;
  cover?: string;
  logo_url?: string;
  rating?: number;
  vote_average?: number;
  duration?: number;
  stream_url?: string;
}

export interface VodSeries {
  id: number;
  name?: string;
  title?: string;
  overview?: string;
  plot?: string;
  release_date?: string;
  year?: string;
  poster_path?: string;
  cover?: string;
  rating?: number;
  seasons_count?: number;
  episodes_count?: number;
}

export interface LiveStreamStatus {
  channel_id?: string;
  channel_name?: string;
  name?: string;
  client_count?: number;
  clients?: Array<{ id: string; ip: string; user_agent: string }>;
  bitrate?: number; // in kbps
  uptime?: number; // in seconds
}

export interface VodClientStatus {
  client_id?: string;
  title?: string;
  ip?: string;
  duration?: number;
  bitrate?: number;
}

export interface PluginItem {
  id?: string;
  key: string;
  name: string;
  title?: string;
  version: string;
  description: string;
  author?: string;
  enabled: boolean;
  installed?: boolean;
}

export interface ChannelLogo {
  id: number;
  name: string;
  url: string;
  channel_count?: number;
  file_size?: number;
}

export interface ConnectIntegration {
  id: number;
  name: string;
  integration_type: 'discord' | 'telegram' | 'slack' | 'webhook' | 'emby';
  url: string;
  events?: string[];
  enabled: boolean;
}

export interface LogFile {
  name: string;
  size?: number;
  updated_at?: string;
}

export interface SystemNotification {
  id: string | number;
  title: string;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  dismissed?: boolean;
}
