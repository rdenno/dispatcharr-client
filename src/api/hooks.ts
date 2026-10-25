import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type {
  Channel,
  ChannelGroup,
  ChannelProfile,
  EPGSource,
  M3UAccount,
  M3UProfile,
  Me,
  Paginated,
  Stream,
  StreamProfile,
  UserAgent,
} from './types';

const PAGE_SIZE = 50;

export const keys = {
  me: ['me'] as const,
  version: ['version'] as const,
  channels: (search: string, group: string | null) => ['channels', search, group] as const,
  channel: (id: number) => ['channel', id] as const,
  channelStreams: (id: number) => ['channel-streams', id] as const,
  streamSearch: (search: string, account: number | null) => ['stream-search', search, account] as const,
  groups: ['groups'] as const,
  accounts: ['m3u-accounts'] as const,
  account: (id: number) => ['m3u-account', id] as const,
  epgSources: ['epg-sources'] as const,
  userAgents: ['user-agents'] as const,
  streamProfiles: ['stream-profiles'] as const,
  activity: ['activity'] as const,
  profiles: ['channel-profiles'] as const,
};

export const logoUrl = (logoId: number | null | undefined) =>
  logoId ? `/api/channels/logos/${logoId}/cache/` : null;

/** Preview URL for a single stream (by hash) or a whole channel (by UUID, with failover). */
export const previewUrl = (hashOrUuid: string) => `/proxy/ts/stream/${hashOrUuid}`;

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => api<Me>('/api/accounts/users/me/') });
}

export function useVersion() {
  return useQuery({
    queryKey: keys.version,
    queryFn: () => api<{ version: string }>('/api/core/version/'),
    staleTime: Infinity,
  });
}

/** `group` is the group's name: Dispatcharr's channel_group filter matches names, not IDs. */
export function useChannels(search: string, group: string | null, enabled = true) {
  return useInfiniteQuery({
    queryKey: keys.channels(search, group),
    enabled,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<Channel>>('/api/channels/channels/', {
        query: {
          page: pageParam,
          page_size: PAGE_SIZE,
          search,
          channel_group: group,
          ordering: 'channel_number',
        },
        signal,
      }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
}

export function useChannel(id: number) {
  return useQuery({ queryKey: keys.channel(id), queryFn: () => api<Channel>(`/api/channels/channels/${id}/`) });
}

export function useChannelStreams(channel: Channel | undefined) {
  return useQuery({
    queryKey: keys.channelStreams(channel?.id ?? -1),
    enabled: !!channel,
    queryFn: async () => {
      if (!channel || channel.streams.length === 0) return [];
      const streams = await api<Stream[]>('/api/channels/streams/by-ids/', {
        method: 'POST',
        body: { ids: channel.streams },
      });
      // Keep the channel's failover order
      const byId = new Map(streams.map((s) => [s.id, s]));
      return channel.streams.map((id) => byId.get(id)).filter((s): s is Stream => !!s);
    },
  });
}

/**
 * `phrase` matches the whole text in the stream name (precise); `words` matches every word
 * anywhere in the name (broad, for renamed streams like "Chiefs vs Seahawks").
 */
export function useStreamSearch(search: string, account: number | null, mode: 'phrase' | 'words', enabled = true) {
  return useInfiniteQuery({
    queryKey: [...keys.streamSearch(search, account), mode],
    enabled: enabled && search.trim().length >= 2,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api<Paginated<Stream>>('/api/channels/streams/', {
        query: {
          page: pageParam,
          page_size: PAGE_SIZE,
          [mode === 'phrase' ? 'name' : 'search']: search.trim(),
          m3u_account: account,
        },
        signal,
      }),
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
  });
}

export function useGroups() {
  return useQuery({
    queryKey: keys.groups,
    queryFn: () => api<ChannelGroup[]>('/api/channels/groups/'),
    staleTime: 5 * 60_000,
  });
}

export function useAccounts() {
  return useQuery({ queryKey: keys.accounts, queryFn: () => api<M3UAccount[]>('/api/m3u/accounts/') });
}

export function useAccount(id: number) {
  return useQuery({
    queryKey: keys.account(id),
    enabled: id > 0,
    queryFn: () => api<M3UAccount>(`/api/m3u/accounts/${id}/`),
  });
}

export function useEpgSources() {
  return useQuery({ queryKey: keys.epgSources, queryFn: () => api<EPGSource[]>('/api/epg/sources/') });
}

export function useUserAgents() {
  return useQuery({
    queryKey: keys.userAgents,
    queryFn: () => api<UserAgent[]>('/api/core/useragents/'),
    staleTime: 5 * 60_000,
  });
}

export function useStreamProfiles() {
  return useQuery({
    queryKey: keys.streamProfiles,
    queryFn: () => api<StreamProfile[]>('/api/core/streamprofiles/'),
    staleTime: 5 * 60_000,
  });
}

/** Live proxy status: active channels and their clients. Shape varies by version, so it stays loose. */
export function useActivity() {
  return useQuery({
    queryKey: keys.activity,
    queryFn: () => api<{ channels?: ActiveChannel[]; count?: number }>('/proxy/ts/status'),
    refetchInterval: 5000,
  });
}

export interface ActiveChannel {
  /** Channel UUID, or the stream hash when a single stream is being previewed */
  channel_id: string;
  channel_name?: string;
  state?: string;
  healthy?: boolean;
  stream_id?: number;
  stream_name?: string;
  m3u_profile_id?: number;
  client_count?: number;
  uptime?: number;
  started_at?: number;
  avg_bitrate?: string;
  avg_bitrate_kbps?: number;
  total_bytes?: number;
  resolution?: string;
  source_fps?: number;
  video_codec?: string;
  ffmpeg_speed?: number;
  clients?: { client_id: string; ip_address?: string; user_agent?: string; connected_at?: number; user_id?: number }[];
  [key: string]: unknown;
}

export function useChannelProfiles() {
  return useQuery({ queryKey: keys.profiles, queryFn: () => api<ChannelProfile[]>('/api/channels/profiles/') });
}

// --- Mutations ---

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: Partial<Channel> & { id: number }) =>
      api<Channel>(`/api/channels/channels/${id}/`, { method: 'PATCH', body: patch }),
    onMutate: async ({ id, ...patch }) => {
      // Optimistic so reordering/removing streams feels instant
      await qc.cancelQueries({ queryKey: keys.channel(id) });
      const previous = qc.getQueryData<Channel>(keys.channel(id));
      if (previous) qc.setQueryData(keys.channel(id), { ...previous, ...patch });
      return { previous };
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.channel(id), ctx.previous);
    },
    onSuccess: (channel) => {
      qc.setQueryData(keys.channel(channel.id), channel);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: keys.channelStreams(id) });
      qc.invalidateQueries({ queryKey: ['channels'] });
    },
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Channel>) => api<Channel>('/api/channels/channels/', { method: 'POST', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/channels/channels/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['channels'] }),
  });
}

export function useSaveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<M3UAccount> & { id?: number }) =>
      id
        ? api<M3UAccount>(`/api/m3u/accounts/${id}/`, { method: 'PATCH', body })
        : api<M3UAccount>('/api/m3u/accounts/', { method: 'POST', body }),
    onSuccess: (account) => {
      qc.setQueryData(keys.account(account.id), account);
      qc.invalidateQueries({ queryKey: keys.accounts });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/m3u/accounts/${id}/`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.accounts }),
  });
}

export function useRefreshAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/api/m3u/refresh/${id}/`, { method: 'POST' }),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: keys.accounts }), 2000),
  });
}

export function useSaveProfile(accountId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<M3UProfile> & { id?: number }) =>
      id
        ? api<M3UProfile>(`/api/m3u/accounts/${accountId}/profiles/${id}/`, { method: 'PATCH', body })
        : api<M3UProfile>(`/api/m3u/accounts/${accountId}/profiles/`, { method: 'POST', body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.account(accountId) });
      qc.invalidateQueries({ queryKey: keys.accounts });
    },
  });
}

export function useRefreshEpg() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api('/api/epg/import/', { method: 'POST', body: { id } }),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: keys.epgSources }), 2000),
  });
}

export function useSaveEpgSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<EPGSource> & { id: number }) =>
      api<EPGSource>(`/api/epg/sources/${id}/`, { method: 'PATCH', body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.epgSources }),
  });
}

export function useStopChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelUuid: string) => api(`/proxy/ts/stop/${channelUuid}`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.activity }),
  });
}

export function useStopClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelUuid, clientId }: { channelUuid: string; clientId: string }) =>
      api(`/proxy/ts/stop_client/${channelUuid}`, { method: 'POST', body: { client_id: clientId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.activity }),
  });
}

/** Switch a live channel to a specific stream without restarting viewers. */
export function useChangeLiveStream() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ channelUuid, streamId }: { channelUuid: string; streamId: number }) =>
      api(`/proxy/ts/change_stream/${channelUuid}`, { method: 'POST', body: { stream_id: streamId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.activity }),
  });
}

/** Include or exclude a channel from a channel profile (what Plex/HDHR outputs see). */
export function useSetProfileMembership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, channelId, enabled }: { profileId: number; channelId: number; enabled: boolean }) =>
      api(`/api/channels/profiles/${profileId}/channels/bulk-update/`, {
        method: 'PATCH',
        body: { channels: [{ channel_id: channelId, enabled }] },
      }),
    onMutate: async ({ profileId, channelId, enabled }) => {
      await qc.cancelQueries({ queryKey: keys.profiles });
      const previous = qc.getQueryData<ChannelProfile[]>(keys.profiles);
      qc.setQueryData<ChannelProfile[]>(keys.profiles, (list) =>
        list?.map((p) =>
          p.id !== profileId
            ? p
            : {
                ...p,
                channels: enabled
                  ? [...new Set([...p.channels, channelId])]
                  : p.channels.filter((id) => id !== channelId),
              },
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(keys.profiles, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.profiles }),
  });
}
