import type { ReactNode } from 'react';
import type { M3UAccount, Stream } from '../api/types';
import { Badge, timeAgo } from './ui';

/** Compact quality summary from Dispatcharr's last probe of the stream. */
export function statsBadges(stream: Stream): string[] {
  const s = stream.stream_stats;
  if (!s) return [];
  const out: string[] = [];
  if (s.resolution) out.push(String(s.resolution));
  if (s.source_fps) out.push(`${Math.round(Number(s.source_fps))}fps`);
  if (s.video_codec) out.push(String(s.video_codec).toUpperCase());
  const kbps = Number(s.video_bitrate ?? s.ffmpeg_output_bitrate);
  if (kbps > 0) out.push(kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`);
  return out;
}

export function StreamRow({
  stream,
  accounts,
  leading,
  actions,
  highlight,
}: {
  stream: Stream;
  accounts: Map<number, M3UAccount>;
  leading?: ReactNode;
  actions: ReactNode;
  highlight?: boolean;
}) {
  const account = stream.m3u_account ? accounts.get(stream.m3u_account) : undefined;
  const badges = statsBadges(stream);
  const probed = timeAgo(stream.stream_stats_updated_at);
  return (
    <div className={`flex items-start gap-2 px-3 py-2.5 ${highlight ? 'bg-accent/5' : ''}`}>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug font-medium break-words">{stream.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Badge tone={account?.is_active === false ? 'danger' : 'accent'}>
            {account?.name ?? (stream.m3u_account ? '…' : 'Custom')}
          </Badge>
          {badges.map((b) => (
            <Badge key={b}>{b}</Badge>
          ))}
          {stream.is_stale && <Badge tone="warn">Stale</Badge>}
          {(stream.current_viewers ?? 0) > 0 && <Badge tone="accent">{stream.current_viewers} watching</Badge>}
        </div>
        {probed && <p className="mt-1 text-[11px] text-muted">Probed {probed}</p>}
      </div>
      <div className="flex shrink-0 items-center">{actions}</div>
    </div>
  );
}
