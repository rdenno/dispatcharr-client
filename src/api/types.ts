// Shapes from Dispatcharr's OpenAPI schema (/api/schema/), v0.30.

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Channel {
  id: number;
  uuid: string;
  name: string;
  channel_number: number | null;
  channel_group_id: number | null;
  tvg_id: string | null;
  epg_data_id: number | null;
  logo_id: number | null;
  stream_profile_id: number | null;
  /** Stream IDs in failover order */
  streams: number[];
  hidden_from_output?: boolean;
  is_adult?: boolean;
  auto_created?: boolean;
  effective_name?: string;
  effective_channel_number?: number | null;
}

export interface StreamStats {
  resolution?: string;
  video_codec?: string;
  audio_codec?: string;
  source_fps?: number;
  video_bitrate?: number;
  ffmpeg_output_bitrate?: number;
  audio_channels?: string;
  [key: string]: unknown;
}

export interface Stream {
  id: number;
  name: string;
  url: string | null;
  m3u_account: number | null;
  logo_url: string | null;
  tvg_id: string | null;
  channel_group: number | null;
  stream_hash: string | null;
  current_viewers?: number;
  last_seen?: string | null;
  updated_at?: string;
  is_stale?: boolean;
  is_custom?: boolean;
  stream_stats?: StreamStats | null;
  stream_stats_updated_at?: string | null;
}

export interface ChannelGroup {
  id: number;
  name: string;
  channel_count?: number;
  m3u_account_count?: number;
}

export interface Logo {
  id: number;
  name: string;
  url: string;
  cache_url: string;
}

export interface M3UProfile {
  id: number;
  name: string;
  max_streams: number;
  is_active: boolean;
  is_default: boolean;
  current_viewers?: number;
  search_pattern?: string;
  replace_pattern?: string;
  exp_date?: string | null;
}

export interface M3UAccount {
  id: number;
  name: string;
  server_url: string | null;
  file_path?: string | null;
  account_type: 'STD' | 'XC' | string;
  username: string | null;
  password?: string | null;
  max_streams: number;
  is_active: boolean;
  user_agent: number | null;
  refresh_interval: number;
  priority?: number;
  status?: string;
  last_message?: string | null;
  updated_at?: string;
  profiles?: M3UProfile[];
  exp_date?: string | null;
  earliest_expiration?: string | null;
  enable_vod?: boolean;
  stale_stream_days?: number;
}

export interface EPGSource {
  id: number;
  name: string;
  source_type: string;
  url: string | null;
  is_active: boolean;
  refresh_interval: number;
  status?: string;
  last_message?: string | null;
  updated_at?: string;
  epg_data_count?: number;
}

export interface UserAgent {
  id: number;
  name: string;
  user_agent: string;
  is_active?: boolean;
}

export interface StreamProfile {
  id: number;
  name: string;
  is_active: boolean;
}

export interface Me {
  id: number;
  username: string;
  email?: string;
  user_level?: number;
}

export interface ChannelProfile {
  id: number;
  name: string;
  /** IDs of the channels enabled in this profile */
  channels: number[];
}

// --- Stream health scanner (dispatcharr-client/scanner), served at /m/health/ ---

export type HealthStatus = 'ok' | 'warn' | 'fail';

export interface StreamHealth {
  stream_id: number;
  name: string;
  account: string;
  status: HealthStatus;
  issues: string[];
  metrics: { resolution?: string; fps?: number; kbps?: number; codec?: string };
  checked_at: number;
}

export interface ChannelHealth {
  channel_id: number;
  name: string;
  status: HealthStatus | 'busy' | 'unknown';
  checked_at: number;
}

export interface HealthAction {
  at: number;
  channel_id: number;
  channel_name: string;
  kind: 'promoted' | 'added';
  stream_id: number;
  stream_name: string;
  account: string;
  reason: string;
}

export interface HealthResults {
  status: {
    running: boolean;
    phase: string;
    progress?: [number, number];
    current_channel?: string | null;
    started_at?: number;
    finished_at?: number;
    next_run?: number;
    last_error?: string | null;
  };
  settings: { profile: string; interval_hours: number; auto_fix: boolean };
  streams: Record<string, StreamHealth>;
  channels: Record<string, ChannelHealth>;
  actions: HealthAction[];
}
