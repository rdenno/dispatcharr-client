import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { Channel } from '../api/types';
import { Square, UserX } from 'lucide-react';
import { logoUrl, useActivity, useStopChannel, useStopClient, type ActiveChannel } from '../api/hooks';
import { HealthPanel } from '../components/HealthPanel';
import { useToast } from '../components/Toast';
import { Badge, Centered, ErrorNote, IconButton, Logo, Spinner, TopBar } from '../components/ui';

function duration(seconds?: number) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function ActivityScreen() {
  const activity = useActivity();
  const channels = activity.data?.channels ?? [];
  // The proxy only reports UUIDs; look the channels up once for their logo and ID
  const uuids = channels.map((c) => c.channel_id).sort();
  const lookup = useQuery({
    queryKey: ['channels-by-uuid', uuids],
    enabled: uuids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: () => api<Channel[]>('/api/channels/channels/by-uuids/', { method: 'POST', body: { uuids } }),
  });
  const byUuid = new Map((lookup.data ?? []).map((ch) => [ch.uuid, ch]));
  return (
    <>
      <TopBar title="Activity" subtitle="Live channels · updates every 5s" />
      <HealthPanel />
      {activity.isPending ? (
        <Centered>
          <Spinner />
        </Centered>
      ) : activity.isError ? (
        <ErrorNote error={activity.error} />
      ) : channels.length === 0 ? (
        <Centered>Nothing is streaming right now</Centered>
      ) : (
        <ul className="divide-y divide-line">
          {channels.map((c) => (
            <ActiveChannelRow key={c.channel_id} channel={c} known={byUuid.get(c.channel_id)} />
          ))}
        </ul>
      )}
    </>
  );
}

function ActiveChannelRow({ channel: c, known }: { channel: ActiveChannel; known?: Channel }) {
  const stop = useStopChannel();
  const stopClient = useStopClient();
  const toast = useToast();
  const bitrate = c.avg_bitrate ?? (c.avg_bitrate_kbps ? `${Math.round(c.avg_bitrate_kbps)} kbps` : null);
  return (
    <li className="px-3 py-3">
      <div className="flex items-center gap-3">
        <Logo src={logoUrl(known?.logo_id)} alt={c.channel_name ?? '?'} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{c.channel_name ?? c.channel_id}</p>
          <p className="truncate text-xs text-muted">{c.stream_name}</p>
        </div>
        <IconButton
          label="Stop channel"
          tone="danger"
          onClick={() =>
            stop.mutate(c.channel_id, {
              onSuccess: () => toast(`Stopped ${c.channel_name ?? 'channel'}`),
              onError: (e) => toast(e.message, { tone: 'error' }),
            })
          }
        >
          <Square size={20} />
        </IconButton>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {c.state && <Badge tone={c.state === 'active' && c.healthy !== false ? 'accent' : 'warn'}>{c.healthy === false ? 'unhealthy' : c.state}</Badge>}
        <Badge>
          {c.client_count ?? c.clients?.length ?? 0} client{(c.client_count ?? c.clients?.length) === 1 ? '' : 's'}
        </Badge>
        {c.resolution && <Badge>{c.resolution}</Badge>}
        {c.source_fps && <Badge>{Math.round(c.source_fps)}fps</Badge>}
        {c.video_codec && <Badge>{c.video_codec.toUpperCase()}</Badge>}
        {bitrate && <Badge>{bitrate}</Badge>}
        {duration(c.uptime) && <Badge>Up {duration(c.uptime)}</Badge>}
      </div>
      {(c.clients ?? []).length > 0 && (
        <ul className="mt-2 space-y-1">
          {c.clients!.map((cl) => (
            <li key={cl.client_id} className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {cl.ip_address || cl.client_id}
                  {cl.connected_at && <span className="text-muted"> · {duration(Date.now() / 1000 - cl.connected_at)}</span>}
                </p>
                {cl.user_agent && <p className="truncate text-muted">{cl.user_agent}</p>}
              </div>
              <IconButton
                label="Disconnect client"
                tone="danger"
                onClick={() =>
                  stopClient.mutate(
                    { channelUuid: c.channel_id, clientId: cl.client_id },
                    { onError: (e) => toast(e.message, { tone: 'error' }) },
                  )
                }
              >
                <UserX size={18} />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {known && (
        <Link to={`/channels/${known.id}`} className="mt-2 inline-block text-xs font-medium text-accent">
          Manage streams →
        </Link>
      )}
    </li>
  );
}
