import { Link } from 'react-router';
import { HeartPulse, Play } from 'lucide-react';
import { useHealth, useStartScan } from '../api/hooks';
import { useToast } from './Toast';
import { Badge, Button, timeAgo } from './ui';

const ago = (ts?: number) => (ts ? timeAgo(new Date(ts * 1000).toISOString()) : null);

function until(ts?: number) {
  if (!ts) return null;
  const min = Math.round((ts * 1000 - Date.now()) / 60_000);
  if (min <= 0) return 'soon';
  return min < 60 ? `in ${min}m` : `in ${Math.round(min / 60)}h`;
}

/** Stream health scanner status, problems and recent automatic fixes. */
export function HealthPanel() {
  const health = useHealth();
  const scan = useStartScan();
  const toast = useToast();
  const data = health.data;
  if (!data) return null; // scanner not deployed

  const { status } = data;
  const problems = Object.values(data.channels)
    .filter((c) => c.status === 'fail' || c.status === 'warn')
    .sort((a, b) => (a.status === b.status ? a.name.localeCompare(b.name) : a.status === 'fail' ? -1 : 1));
  const counts = Object.values(data.channels).reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-3 border-b border-line px-3 py-3">
      <div className="flex items-center gap-2">
        <HeartPulse size={18} className="text-accent" />
        <h2 className="flex-1 text-sm font-semibold">Stream health</h2>
        <Button
          variant="secondary"
          disabled={status.running || scan.isPending}
          onClick={() =>
            scan.mutate(undefined, {
              onSuccess: () => toast('Scan started'),
              onError: (e) => toast(e.message, { tone: 'error' }),
            })
          }
        >
          <Play size={16} /> Scan now
        </Button>
      </div>

      <p className="text-xs text-muted">
        {status.running ? (
          <>
            Scanning {status.current_channel ?? '…'}
            {status.progress && ` (${status.progress[0] + 1} of ${status.progress[1]})`}
          </>
        ) : (
          <>
            {status.finished_at ? `Last scan ${ago(status.finished_at)}` : 'Not scanned yet'}
            {status.next_run && ` · next ${until(status.next_run)}`}
            {status.phase?.startsWith('waiting') && ' · waiting for a free source'}
          </>
        )}
        {' · '}
        {data.settings.profile} profile, every {data.settings.interval_hours}h
      </p>
      {status.last_error && <p className="text-xs text-danger">Last scan error: {status.last_error}</p>}

      {Object.keys(counts).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {counts.ok ? <Badge tone="accent">{counts.ok} healthy</Badge> : null}
          {counts.warn ? <Badge tone="warn">{counts.warn} warning</Badge> : null}
          {counts.fail ? <Badge tone="danger">{counts.fail} failing</Badge> : null}
          {counts.busy ? <Badge>{counts.busy} skipped (in use)</Badge> : null}
        </div>
      )}

      {problems.length > 0 && (
        <ul className="space-y-1">
          {problems.map((c) => (
            <li key={c.channel_id}>
              <Link
                to={`/channels/${c.channel_id}`}
                className="flex items-center gap-2 rounded-lg bg-surface px-2 py-2 text-sm active:bg-surface-2"
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${c.status === 'fail' ? 'bg-danger' : 'bg-warn'}`} />
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-xs text-muted">{ago(c.checked_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {data.actions.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Automatic fixes</p>
          <ul className="space-y-1">
            {data.actions.slice(0, 5).map((a) => (
              <li key={a.at}>
                <Link to={`/channels/${a.channel_id}`} className="block rounded-lg bg-surface px-2 py-2 text-xs active:bg-surface-2">
                  <span className="font-medium text-white">{a.channel_name}</span>:{' '}
                  {a.kind === 'added' ? 'added' : 'moved up'} {a.stream_name} ({a.account}) · {ago(a.at)}
                  <span className="block text-muted">{a.reason}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
