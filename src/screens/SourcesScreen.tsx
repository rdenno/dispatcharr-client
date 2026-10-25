import { Link, useSearchParams } from 'react-router';
import { ChevronRight, Plus, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import {
  useAccounts,
  useEpgSources,
  useRefreshAccount,
  useRefreshEpg,
  useSaveAccount,
  useSaveEpgSource,
} from '../api/hooks';
import type { EPGSource, M3UAccount } from '../api/types';
import { useToast } from '../components/Toast';
import { Badge, Centered, ErrorNote, IconButton, Spinner, Toggle, TopBar, timeAgo } from '../components/ui';

export function statusTone(status?: string): 'accent' | 'warn' | 'danger' | 'muted' {
  if (!status) return 'muted';
  if (/success|idle|ok/i.test(status)) return 'accent';
  if (/error|fail/i.test(status)) return 'danger';
  if (/fetch|pars|process|refresh|pending|download/i.test(status)) return 'warn';
  return 'muted';
}

export function expiryLabel(iso?: string | null) {
  if (!iso) return null;
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days < 0) return { text: 'Expired', tone: 'danger' as const };
  return { text: `Expires in ${days}d`, tone: days <= 7 ? ('warn' as const) : ('muted' as const) };
}

export default function SourcesScreen() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'epg' ? 'epg' : 'm3u';

  return (
    <>
      <TopBar
        title="Sources"
        right={
          tab === 'm3u' ? (
            <Link aria-label="Add M3U source" to="/sources/m3u/new" className="rounded-full p-2 text-accent">
              <Plus size={24} />
            </Link>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 gap-1 border-b border-line p-2">
        {(['m3u', 'epg'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setParams({ tab: t }, { replace: true })}
            className={clsx(
              'rounded-lg py-2 text-sm font-medium',
              tab === t ? 'bg-surface-2 text-white' : 'text-muted',
            )}
          >
            {t === 'm3u' ? 'M3U / Xtream' : 'EPG'}
          </button>
        ))}
      </div>
      {tab === 'm3u' ? <M3UList /> : <EPGList />}
    </>
  );
}

function M3UList() {
  const accounts = useAccounts();
  if (accounts.isPending)
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  if (accounts.isError) return <ErrorNote error={accounts.error} />;
  const list = accounts.data.slice().sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.name.localeCompare(b.name));
  if (list.length === 0) return <Centered>No M3U sources yet</Centered>;
  return (
    <ul className="divide-y divide-line">
      {list.map((a) => (
        <AccountRow key={a.id} account={a} />
      ))}
    </ul>
  );
}

function AccountRow({ account }: { account: M3UAccount }) {
  const refresh = useRefreshAccount();
  const save = useSaveAccount();
  const toast = useToast();
  const expiry = expiryLabel(account.earliest_expiration ?? account.exp_date);
  const viewers = (account.profiles ?? []).reduce((n, p) => n + (p.current_viewers ?? 0), 0);

  return (
    <li className="flex items-center gap-1 pr-1">
      <Link to={`/sources/m3u/${account.id}`} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 active:bg-surface">
        <div className="min-w-0 flex-1">
          <p className={clsx('truncate font-medium', !account.is_active && 'text-muted')}>{account.name}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge>{account.account_type === 'XC' ? 'Xtream' : 'M3U'}</Badge>
            {account.status && <Badge tone={statusTone(account.status)}>{account.status}</Badge>}
            <Badge>
              {viewers}/{account.max_streams || '∞'} streams
            </Badge>
            {expiry && <Badge tone={expiry.tone}>{expiry.text}</Badge>}
          </div>
          {account.last_message && <p className="mt-1 line-clamp-2 text-xs text-muted">{account.last_message}</p>}
          {account.updated_at && <p className="mt-0.5 text-[11px] text-muted">Updated {timeAgo(account.updated_at)}</p>}
        </div>
        <ChevronRight size={18} className="shrink-0 text-muted" />
      </Link>
      <IconButton
        label="Refresh"
        tone="accent"
        disabled={refresh.isPending}
        onClick={() =>
          refresh.mutate(account.id, {
            onSuccess: () => toast(`Refreshing ${account.name}`),
            onError: (e) => toast(e.message, { tone: 'error' }),
          })
        }
      >
        <RefreshCw size={20} className={refresh.isPending ? 'animate-spin' : ''} />
      </IconButton>
      <Toggle
        label="Active"
        checked={account.is_active}
        onChange={(v) =>
          save.mutate({ id: account.id, is_active: v }, { onError: (e) => toast(e.message, { tone: 'error' }) })
        }
      />
    </li>
  );
}

function EPGList() {
  const sources = useEpgSources();
  if (sources.isPending)
    return (
      <Centered>
        <Spinner />
      </Centered>
    );
  if (sources.isError) return <ErrorNote error={sources.error} />;
  if (sources.data.length === 0) return <Centered>No EPG sources</Centered>;
  return (
    <ul className="divide-y divide-line">
      {sources.data.map((s) => (
        <EPGRow key={s.id} source={s} />
      ))}
    </ul>
  );
}

function EPGRow({ source }: { source: EPGSource }) {
  const refresh = useRefreshEpg();
  const save = useSaveEpgSource();
  const toast = useToast();
  return (
    <li className="flex items-center gap-1 py-3 pr-1 pl-3">
      <div className="min-w-0 flex-1">
        <p className={clsx('truncate font-medium', !source.is_active && 'text-muted')}>{source.name}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <Badge>{source.source_type}</Badge>
          {source.status && <Badge tone={statusTone(source.status)}>{source.status}</Badge>}
          {source.epg_data_count !== undefined && <Badge>{source.epg_data_count} channels</Badge>}
        </div>
        {source.last_message && <p className="mt-1 line-clamp-2 text-xs text-muted">{source.last_message}</p>}
        {source.updated_at && <p className="mt-0.5 text-[11px] text-muted">Updated {timeAgo(source.updated_at)}</p>}
      </div>
      <IconButton
        label="Refresh"
        tone="accent"
        disabled={refresh.isPending}
        onClick={() =>
          refresh.mutate(source.id, {
            onSuccess: () => toast(`Refreshing ${source.name}`),
            onError: (e) => toast(e.message, { tone: 'error' }),
          })
        }
      >
        <RefreshCw size={20} className={refresh.isPending ? 'animate-spin' : ''} />
      </IconButton>
      <Toggle
        label="Active"
        checked={source.is_active}
        onChange={(v) => save.mutate({ id: source.id, is_active: v }, { onError: (e) => toast(e.message, { tone: 'error' }) })}
      />
    </li>
  );
}
