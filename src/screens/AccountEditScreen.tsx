import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  useAccount,
  useDeleteAccount,
  useRefreshAccount,
  useSaveAccount,
  useSaveProfile,
  useUserAgents,
} from '../api/hooks';
import type { M3UAccount, M3UProfile } from '../api/types';
import { useToast } from '../components/Toast';
import { Badge, Button, Centered, Confirm, ErrorNote, Field, IconButton, Sheet, Spinner, Toggle, TopBar } from '../components/ui';
import { expiryLabel, statusTone } from './SourcesScreen';

type Form = {
  name: string;
  account_type: string;
  server_url: string;
  username: string;
  password: string;
  max_streams: string;
  user_agent: string;
  refresh_interval: string;
  is_active: boolean;
};

const emptyForm: Form = {
  name: '',
  account_type: 'XC',
  server_url: '',
  username: '',
  password: '',
  max_streams: '1',
  user_agent: '',
  refresh_interval: '24',
  is_active: true,
};

function toForm(a: M3UAccount): Form {
  return {
    name: a.name,
    account_type: a.account_type,
    server_url: a.server_url ?? '',
    username: a.username ?? '',
    password: a.password ?? '',
    max_streams: String(a.max_streams ?? 0),
    user_agent: a.user_agent ? String(a.user_agent) : '',
    refresh_interval: String(a.refresh_interval ?? 24),
    is_active: a.is_active,
  };
}

export default function AccountEditScreen() {
  const param = useParams().id!;
  const isNew = param === 'new';
  const id = isNew ? -1 : Number(param);
  const account = useAccount(id);
  if (!isNew && account.isPending)
    return (
      <>
        <TopBar title="M3U source" back="/sources" />
        <Centered>
          <Spinner />
        </Centered>
      </>
    );
  if (!isNew && account.isError)
    return (
      <>
        <TopBar title="M3U source" back="/sources" />
        <ErrorNote error={account.error} />
      </>
    );
  return <AccountForm account={isNew ? undefined : account.data} />;
}

function AccountForm({ account }: { account?: M3UAccount }) {
  const [form, setForm] = useState<Form>(account ? toForm(account) : emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  // Only send the password when edited, so saving other fields can never blank it
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const userAgents = useUserAgents();
  const save = useSaveAccount();
  const del = useDeleteAccount();
  const refresh = useRefreshAccount();
  const toast = useToast();
  const navigate = useNavigate();
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (account) {
      setForm(toForm(account));
      setPasswordTouched(false);
    }
  }, [account]);

  const isXC = form.account_type === 'XC';
  const expiry = expiryLabel(account?.earliest_expiration ?? account?.exp_date);

  async function submit() {
    const body: Partial<M3UAccount> = {
      name: form.name.trim(),
      account_type: form.account_type,
      server_url: form.server_url.trim(),
      max_streams: Number(form.max_streams) || 0,
      user_agent: form.user_agent ? Number(form.user_agent) : null,
      refresh_interval: Number(form.refresh_interval) || 0,
      is_active: form.is_active,
    };
    if (isXC) {
      body.username = form.username.trim();
      if (passwordTouched || !account) body.password = form.password;
    }
    try {
      const saved = await save.mutateAsync({ id: account?.id, ...body });
      toast(account ? 'Source saved' : 'Source added, importing streams…');
      if (!account) navigate(`/sources/m3u/${saved.id}`, { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save', { tone: 'error' });
    }
  }

  async function remove() {
    if (!account) return;
    try {
      await del.mutateAsync(account.id);
      toast(`Deleted ${account.name}`);
      navigate('/sources', { replace: true });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete', { tone: 'error' });
    }
  }

  return (
    <>
      <TopBar title={account ? account.name : 'New M3U source'} back="/sources" />
      {account && (
        <div className="space-y-2 border-b border-line px-3 py-2">
          <div className="flex items-center gap-1">
          {account.status && <Badge tone={statusTone(account.status)}>{account.status}</Badge>}
          {expiry && <Badge tone={expiry.tone}>{expiry.text}</Badge>}
          <span className="flex-1" />
          <Button
            variant="secondary"
            disabled={refresh.isPending}
            onClick={() =>
              refresh.mutate(account.id, {
                onSuccess: () => toast(`Refreshing ${account.name}`),
                onError: (e) => toast(e.message, { tone: 'error' }),
              })
            }
          >
            Refresh now
          </Button>
          </div>
          {account.last_message && <p className="text-xs text-muted">{account.last_message}</p>}
        </div>
      )}
      <div className="space-y-3 p-3">
        <Field label="Name">
          <input className="field" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Type">
          <select className="field" value={form.account_type} onChange={(e) => set('account_type', e.target.value)}>
            <option value="XC">Xtream Codes</option>
            <option value="STD">M3U URL</option>
          </select>
        </Field>
        <Field label={isXC ? 'Server URL' : 'M3U URL'}>
          <input
            className="field"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            value={form.server_url}
            onChange={(e) => set('server_url', e.target.value)}
          />
        </Field>
        {isXC && (
          <>
            <Field label="Username">
              <input
                className="field"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="off"
                value={form.username}
                onChange={(e) => set('username', e.target.value)}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  className="field pr-11"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password}
                  placeholder={account && !account.password ? 'Unchanged' : undefined}
                  onChange={(e) => {
                    setPasswordTouched(true);
                    set('password', e.target.value);
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-muted"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </Field>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Max streams" hint="0 = unlimited">
            <input className="field" inputMode="numeric" value={form.max_streams} onChange={(e) => set('max_streams', e.target.value)} />
          </Field>
          <Field label="Refresh every (h)" hint="0 = manual only">
            <input
              className="field"
              inputMode="numeric"
              value={form.refresh_interval}
              onChange={(e) => set('refresh_interval', e.target.value)}
            />
          </Field>
        </div>
        <Field label="User agent">
          <select className="field" value={form.user_agent} onChange={(e) => set('user_agent', e.target.value)}>
            <option value="">Default</option>
            {(userAgents.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-surface px-3 py-3 ring-1 ring-line">
          <span className="text-sm">Active</span>
          <Toggle label="Active" checked={form.is_active} onChange={(v) => set('is_active', v)} />
        </div>
        <Button className="w-full" disabled={!form.name.trim() || !form.server_url.trim() || save.isPending} onClick={submit}>
          {save.isPending ? 'Saving…' : account ? 'Save changes' : 'Add source'}
        </Button>
      </div>

      {account && <Profiles account={account} />}

      {account && (
        <div className="p-3 pt-6">
          <Button className="w-full" variant="danger" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={18} /> Delete source
          </Button>
        </div>
      )}
      <Confirm
        open={confirmDelete}
        title={`Delete ${account?.name}?`}
        message="Its streams are removed from every channel that uses them."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}

/** Profiles let one account expose extra connection slots (e.g. alternate credentials via URL rewrite). */
function Profiles({ account }: { account: M3UAccount }) {
  const [editing, setEditing] = useState<M3UProfile | 'new' | null>(null);
  const save = useSaveProfile(account.id);
  const toast = useToast();
  const profiles = account.profiles ?? [];
  return (
    <section className="mt-2 border-t border-line">
      <div className="flex items-center justify-between px-3 pt-4 pb-1">
        <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Profiles</h2>
        <button className="flex items-center gap-1 text-sm font-medium text-accent" onClick={() => setEditing('new')}>
          <Plus size={18} /> Add
        </button>
      </div>
      <ul className="divide-y divide-line">
        {profiles.map((p) => (
          <li key={p.id} className="flex items-center gap-2 py-2.5 pr-2 pl-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {p.name} {p.is_default && <Badge>Default</Badge>}
              </p>
              <p className="text-xs text-muted">
                {p.current_viewers ?? 0}/{p.max_streams || '∞'} streams in use
              </p>
            </div>
            {!p.is_default && (
              <IconButton label="Edit profile" onClick={() => setEditing(p)}>
                <Pencil size={18} />
              </IconButton>
            )}
            <Toggle
              label="Profile active"
              checked={p.is_active}
              onChange={(v) => save.mutate({ id: p.id, is_active: v }, { onError: (e) => toast(e.message, { tone: 'error' }) })}
            />
          </li>
        ))}
      </ul>
      {editing && (
        <ProfileSheet
          accountId={account.id}
          profile={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  );
}

function ProfileSheet({ accountId, profile, onClose }: { accountId: number; profile?: M3UProfile; onClose: () => void }) {
  const [name, setName] = useState(profile?.name ?? '');
  const [maxStreams, setMaxStreams] = useState(String(profile?.max_streams ?? 1));
  const [search, setSearch] = useState(profile?.search_pattern ?? '');
  const [replace, setReplace] = useState(profile?.replace_pattern ?? '');
  const save = useSaveProfile(accountId);
  const toast = useToast();

  async function submit() {
    try {
      await save.mutateAsync({
        id: profile?.id,
        name: name.trim(),
        max_streams: Number(maxStreams) || 0,
        search_pattern: search,
        replace_pattern: replace,
      });
      toast('Profile saved');
      onClose();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save', { tone: 'error' });
    }
  }

  return (
    <Sheet open onClose={onClose} title={profile ? 'Edit profile' : 'New profile'}>
      <div className="space-y-3">
        <Field label="Name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Max streams">
          <input className="field" inputMode="numeric" value={maxStreams} onChange={(e) => setMaxStreams(e.target.value)} />
        </Field>
        <Field label="URL search pattern" hint="Regex applied to each stream URL, e.g. the original username/password">
          <input className="field font-mono" autoCapitalize="none" value={search} onChange={(e) => setSearch(e.target.value)} />
        </Field>
        <Field label="Replace with">
          <input className="field font-mono" autoCapitalize="none" value={replace} onChange={(e) => setReplace(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={!name.trim() || save.isPending} onClick={submit}>
          {save.isPending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </Sheet>
  );
}
