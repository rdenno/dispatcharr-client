import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowDown, ArrowUp, ChevronsUp, Pencil, Play, Plus, Trash2, Tv } from 'lucide-react';
import {
  logoUrl,
  previewUrl,
  useAccounts,
  useActivity,
  useChangeLiveStream,
  useChannel,
  useChannelStreams,
  useDeleteChannel,
  useGroups,
  useStreamProfiles,
  useUpdateChannel,
} from '../api/hooks';
import type { Channel, Stream } from '../api/types';
import { Player } from '../components/Player';
import { StreamRow } from '../components/StreamRow';
import { StreamPicker } from '../components/StreamPicker';
import { useToast } from '../components/Toast';
import { Button, Centered, Confirm, ErrorNote, Field, IconButton, Logo, Sheet, Spinner, TopBar } from '../components/ui';

type Preview = { url: string; title: string; streamId?: number };

export default function ChannelDetailScreen() {
  const id = Number(useParams().id);
  const channel = useChannel(id);
  const streams = useChannelStreams(channel.data);
  const accounts = useAccounts();
  const activity = useActivity();
  const update = useUpdateChannel();
  const changeLive = useChangeLiveStream();
  const toast = useToast();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);

  const accountMap = useMemo(() => new Map((accounts.data ?? []).map((a) => [a.id, a])), [accounts.data]);
  const ch = channel.data;
  // Whether this channel is currently live in the proxy (someone is watching it)
  const live = ch ? activity.data?.channels?.find((c) => c.channel_id === ch.uuid) : undefined;

  if (channel.isPending) {
    return (
      <>
        <TopBar title="Channel" back />
        <Centered>
          <Spinner />
        </Centered>
      </>
    );
  }
  if (channel.isError || !ch) {
    return (
      <>
        <TopBar title="Channel" back />
        <ErrorNote error={channel.error} />
      </>
    );
  }

  const order = ch.streams;
  const list = streams.data ?? [];

  function saveOrder(next: number[], undoMessage?: string) {
    if (!ch) return;
    const previous = ch.streams;
    update.mutate(
      { id: ch.id, streams: next },
      {
        onError: (err) => toast(err instanceof Error ? err.message : 'Could not save', { tone: 'error' }),
        onSuccess: () => {
          if (undoMessage) {
            toast(undoMessage, { action: { label: 'Undo', run: () => update.mutate({ id: ch.id, streams: previous }) } });
          }
        },
      },
    );
  }

  function move(index: number, to: number) {
    const next = [...order];
    const [item] = next.splice(index, 1);
    next.splice(to, 0, item);
    saveOrder(next);
  }

  function remove(stream: Stream) {
    if (preview?.streamId === stream.id) setPreview(null);
    saveOrder(
      order.filter((s) => s !== stream.id),
      `Removed “${stream.name}”`,
    );
  }

  function add(stream: Stream) {
    if (order.includes(stream.id)) return;
    saveOrder([...order, stream.id]);
    toast(`Added “${stream.name}”`);
  }

  return (
    <>
      <TopBar
        back="/channels"
        title={
          <span className="flex items-center gap-2">
            {ch.channel_number != null && <span className="font-mono text-muted">{ch.channel_number}</span>}
            {ch.name}
          </span>
        }
        subtitle={live ? `Live now · ${live.client_count ?? 0} viewer${live.client_count === 1 ? '' : 's'}` : undefined}
        right={
          <IconButton label="Edit channel" onClick={() => setEditing(true)}>
            <Pencil size={20} />
          </IconButton>
        }
      />

      {preview ? (
        <Player key={preview.url} url={preview.url} title={preview.title} onClose={() => setPreview(null)} />
      ) : (
        <div className="flex items-center gap-3 border-b border-line px-3 py-3">
          <Logo src={logoUrl(ch.logo_id)} alt={ch.name} size={48} />
          <div className="min-w-0 flex-1 text-sm text-muted">
            Preview plays through Dispatcharr and uses one connection from the stream's M3U account.
          </div>
          <Button
            disabled={order.length === 0}
            onClick={() => setPreview({ url: previewUrl(ch.uuid), title: `${ch.name} (with failover)` })}
          >
            <Tv size={18} /> Watch
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between px-3 pt-4 pb-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
          Streams · tried in this order
        </h2>
        <button className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => setPicking(true)}>
          <Plus size={18} /> Add
        </button>
      </div>

      {streams.isPending && order.length > 0 ? (
        <Centered>
          <Spinner />
        </Centered>
      ) : list.length === 0 ? (
        <Centered>
          <p>This channel has no streams.</p>
          <Button onClick={() => setPicking(true)}>
            <Plus size={18} /> Find a stream
          </Button>
        </Centered>
      ) : (
        <ul className="divide-y divide-line">
          {list.map((stream, index) => (
            <li key={stream.id}>
              <StreamRow
                stream={stream}
                accounts={accountMap}
                highlight={preview?.streamId === stream.id}
                leading={<span className="w-5 pt-0.5 text-center font-mono text-sm text-muted">{index + 1}</span>}
                actions={
                  <>
                    <IconButton
                      label="Preview"
                      tone="accent"
                      disabled={!stream.stream_hash}
                      onClick={() =>
                        stream.stream_hash &&
                        setPreview({ url: previewUrl(stream.stream_hash), title: stream.name, streamId: stream.id })
                      }
                    >
                      <Play size={20} />
                    </IconButton>
                    <StreamMenu
                      index={index}
                      count={list.length}
                      live={!!live}
                      onTop={() => move(index, 0)}
                      onUp={() => move(index, index - 1)}
                      onDown={() => move(index, index + 1)}
                      onRemove={() => remove(stream)}
                      onSwitchLive={() =>
                        changeLive.mutate(
                          { channelUuid: ch.uuid, streamId: stream.id },
                          {
                            onSuccess: () => toast('Live channel switched to this stream'),
                            onError: (err) => toast(err.message, { tone: 'error' }),
                          },
                        )
                      }
                    />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}

      <StreamPicker
        open={picking}
        onClose={() => setPicking(false)}
        initialQuery={cleanName(ch.name)}
        accounts={accounts.data ?? []}
        inChannel={order}
        onAdd={add}
        onPreview={(s) => s.stream_hash && setPreview({ url: previewUrl(s.stream_hash), title: s.name, streamId: s.id })}
      />
      <EditChannelSheet open={editing} onClose={() => setEditing(false)} channel={ch} />
    </>
  );
}

/** Strip quality/region tags so the default stream search matches more providers. */
function cleanName(name: string) {
  return name
    .replace(/\b(HD|FHD|UHD|4K|SD|HEVC|H\.?265|US|USA|UK|CA)\b/gi, '')
    .replace(/[|:[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function StreamMenu(props: {
  index: number;
  count: number;
  live: boolean;
  onTop: () => void;
  onUp: () => void;
  onDown: () => void;
  onRemove: () => void;
  onSwitchLive: () => void;
}) {
  const [open, setOpen] = useState(false);
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  const first = props.index === 0;
  const last = props.index === props.count - 1;
  return (
    <>
      <IconButton label="Move up" disabled={first} onClick={props.onUp}>
        <ArrowUp size={20} />
      </IconButton>
      <IconButton label="More" onClick={() => setOpen(true)}>
        <span className="block px-0.5 text-lg leading-none">⋯</span>
      </IconButton>
      <Sheet open={open} onClose={() => setOpen(false)} title="Stream">
        <div className="space-y-1">
          <MenuItem icon={<ChevronsUp size={20} />} label="Make primary" disabled={first} onClick={run(props.onTop)} />
          <MenuItem icon={<ArrowUp size={20} />} label="Move up" disabled={first} onClick={run(props.onUp)} />
          <MenuItem icon={<ArrowDown size={20} />} label="Move down" disabled={last} onClick={run(props.onDown)} />
          {props.live && (
            <MenuItem icon={<Tv size={20} />} label="Switch live viewers to this stream" onClick={run(props.onSwitchLive)} />
          )}
          <MenuItem icon={<Trash2 size={20} />} label="Remove from channel" danger onClick={run(props.onRemove)} />
        </div>
      </Sheet>
    </>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  disabled,
  danger,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left active:bg-surface-2 disabled:opacity-30 ${danger ? 'text-danger' : ''}`}
    >
      {icon}
      {label}
    </button>
  );
}

function EditChannelSheet({ open, onClose, channel }: { open: boolean; onClose: () => void; channel: Channel }) {
  const [name, setName] = useState(channel.name);
  const [number, setNumber] = useState(channel.channel_number?.toString() ?? '');
  const [groupId, setGroupId] = useState(channel.channel_group_id?.toString() ?? '');
  const [profileId, setProfileId] = useState(channel.stream_profile_id?.toString() ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const groups = useGroups();
  const profiles = useStreamProfiles();
  const update = useUpdateChannel();
  const del = useDeleteChannel();
  const toast = useToast();
  const navigate = useNavigate();

  async function save() {
    try {
      await update.mutateAsync({
        id: channel.id,
        name: name.trim(),
        channel_number: number === '' ? null : Number(number),
        channel_group_id: groupId ? Number(groupId) : null,
        stream_profile_id: profileId ? Number(profileId) : null,
      });
      toast('Channel saved');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save', { tone: 'error' });
    }
  }

  async function remove() {
    try {
      await del.mutateAsync(channel.id);
      toast(`Deleted “${channel.name}”`);
      navigate('/channels', { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', { tone: 'error' });
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Edit channel">
      <div className="space-y-3">
        <Field label="Name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Channel number">
          <input className="field" inputMode="decimal" value={number} onChange={(e) => setNumber(e.target.value)} />
        </Field>
        <Field label="Group">
          <select className="field" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">No group</option>
            {(groups.data ?? [])
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Stream profile">
          <select className="field" value={profileId} onChange={(e) => setProfileId(e.target.value)}>
            <option value="">Default</option>
            {(profiles.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Button className="w-full" disabled={!name.trim() || update.isPending} onClick={save}>
          {update.isPending ? 'Saving…' : 'Save'}
        </Button>
        <Button className="w-full" variant="danger" onClick={() => setConfirmDelete(true)}>
          <Trash2 size={18} /> Delete channel
        </Button>
      </div>
      <Confirm
        open={confirmDelete}
        title={`Delete “${channel.name}”?`}
        message="The channel is removed from Dispatcharr and every output (Plex, M3U, EPG). Its streams stay available."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Sheet>
  );
}
