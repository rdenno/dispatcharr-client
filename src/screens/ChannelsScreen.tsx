import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { logoUrl, useChannels, useCreateChannel, useGroups, useHealth, useSetProfileMembership } from '../api/hooks';
import { Badge, Button, Centered, ErrorNote, Field, Logo, Sheet, Spinner, Toggle, TopBar } from '../components/ui';
import { useToast } from '../components/Toast';
import { useDebounced, useOnVisible } from '../lib/useDebounced';
import { useSelectedProfile } from '../lib/useSelectedProfile';

export default function ChannelsScreen() {
  // Search and group live in the URL so Back from a channel restores the list
  const [params, setParams] = useSearchParams();
  const search = params.get('q') ?? '';
  const group = params.get('group') ? Number(params.get('group')) : null;
  const debouncedSearch = useDebounced(search);
  const [creating, setCreating] = useState(false);
  const { profiles, profile, members, select: selectProfile } = useSelectedProfile();
  const setMembership = useSetProfileMembership();
  const toast = useToast();
  const health = useHealth();

  const groups = useGroups();
  const selectedGroupName = group !== null ? (groups.data?.find((g) => g.id === group)?.name ?? null) : null;
  // Wait for the group list before filtering, or the first request would be unfiltered
  const channels = useChannels(debouncedSearch, selectedGroupName, group === null || groups.isSuccess);
  const items = useMemo(() => channels.data?.pages.flatMap((p) => p.results) ?? [], [channels.data]);
  const total = channels.data?.pages[0]?.count;
  const groupName = useMemo(() => new Map((groups.data ?? []).map((g) => [g.id, g.name])), [groups.data]);
  // Only groups that actually contain channels are useful as filters
  const filterGroups = useMemo(
    () => (groups.data ?? []).filter((g) => (g.channel_count ?? 0) > 0).sort((a, b) => a.name.localeCompare(b.name)),
    [groups.data],
  );
  const sentinel = useOnVisible(() => channels.fetchNextPage(), !!channels.hasNextPage && !channels.isFetchingNextPage);

  const setParam = (key: string, value: string | null) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  return (
    <>
      <TopBar
        title="Channels"
        subtitle={
          total !== undefined
            ? `${total} channel${total === 1 ? '' : 's'}${profile ? ` · ${profile.channels.length} in ${profile.name}` : ''}`
            : undefined
        }
        right={
          <>
            {profiles.length > 0 && (
              <label className="flex items-center gap-1 rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-line">
                <span className="sr-only">Profile shown on channel switches</span>
                <select
                  className="max-w-28 bg-transparent text-sm outline-none"
                  value={profile?.id ?? 'none'}
                  onChange={(e) => selectProfile(e.target.value === 'none' ? null : Number(e.target.value))}
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="none">No profile</option>
                </select>
              </label>
            )}
            <button aria-label="New channel" className="rounded-full p-2 text-accent" onClick={() => setCreating(true)}>
              <Plus size={24} />
            </button>
          </>
        }
      />
      <div className="sticky top-14 z-10 space-y-2 border-b border-line bg-bg px-3 py-2">
        <div className="relative">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className="field pl-9"
            placeholder="Search channels"
            value={search}
            onChange={(e) => setParam('q', e.target.value)}
            type="search"
          />
        </div>
        {filterGroups.length > 0 && (
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 py-1">
            <Chip active={group === null} onClick={() => setParam('group', null)}>
              All
            </Chip>
            {filterGroups.map((g) => (
              <Chip key={g.id} active={group === g.id} onClick={() => setParam('group', group === g.id ? null : String(g.id))}>
                {g.name}
                <span className="ml-1 opacity-60">{g.channel_count}</span>
              </Chip>
            ))}
          </div>
        )}
      </div>

      {channels.isPending ? (
        <Centered>
          <Spinner />
        </Centered>
      ) : channels.isError ? (
        <ErrorNote error={channels.error} />
      ) : items.length === 0 ? (
        <Centered>No channels found</Centered>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((ch) => (
            <li key={ch.id} className="flex items-center">
              <Link to={`/channels/${ch.id}`} className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pl-3 active:bg-surface">
                <span className="w-10 shrink-0 text-right font-mono text-sm text-muted">{ch.channel_number ?? '–'}</span>
                <Logo src={logoUrl(ch.logo_id)} alt={ch.name} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <HealthDot status={health.data?.channels[String(ch.id)]?.status} />
                    <span className="truncate">{ch.name}</span>
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                    {ch.streams.length === 0 ? (
                      <Badge tone="danger">No streams</Badge>
                    ) : (
                      <span className="shrink-0">
                        {ch.streams.length} stream{ch.streams.length === 1 ? '' : 's'} ·
                      </span>
                    )}
                    <span className="truncate">
                      {ch.channel_group_id ? groupName.get(ch.channel_group_id) : 'No group'}
                    </span>
                  </p>
                </div>
              </Link>
              {profile && (
                <div className="px-3">
                  <Toggle
                    label={`In ${profile.name}`}
                    checked={members.has(ch.id)}
                    onChange={(enabled) =>
                      setMembership.mutate(
                        { profileId: profile.id, channelId: ch.id, enabled },
                        { onError: (e) => toast(e.message, { tone: 'error' }) },
                      )
                    }
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div ref={sentinel} className="h-12">
        {channels.isFetchingNextPage && (
          <Centered>
            <Spinner />
          </Centered>
        )}
      </div>

      <CreateChannelSheet open={creating} onClose={() => setCreating(false)} />
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ring-1',
        active ? 'bg-accent/15 text-accent ring-accent/40' : 'bg-surface text-muted ring-line',
      )}
    >
      {children}
    </button>
  );
}

function CreateChannelSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [groupId, setGroupId] = useState('');
  const groups = useGroups();
  const create = useCreateChannel();
  const toast = useToast();
  const navigate = useNavigate();

  async function submit() {
    try {
      const ch = await create.mutateAsync({
        name: name.trim(),
        channel_number: number ? Number(number) : undefined,
        channel_group_id: groupId ? Number(groupId) : undefined,
      });
      onClose();
      setName('');
      setNumber('');
      navigate(`/channels/${ch.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create channel', { tone: 'error' });
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New channel">
      <div className="space-y-3">
        <Field label="Name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Channel number" hint="Leave empty to use the next free number">
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
        <Button className="w-full" disabled={!name.trim() || create.isPending} onClick={submit}>
          {create.isPending ? 'Creating…' : 'Create channel'}
        </Button>
      </div>
    </Sheet>
  );
}

/** Red/amber dot when the last health scan found the channel failing or degraded. */
function HealthDot({ status }: { status?: string }) {
  if (status !== 'fail' && status !== 'warn') return null;
  return (
    <span
      title={status === 'fail' ? 'Failing in the last health scan' : 'Warning in the last health scan'}
      className={clsx('h-2 w-2 shrink-0 rounded-full', status === 'fail' ? 'bg-danger' : 'bg-warn')}
    />
  );
}
