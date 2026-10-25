import { useEffect, useMemo, useState } from 'react';
import { Check, Play, Plus, Search } from 'lucide-react';
import clsx from 'clsx';
import { useStreamSearch } from '../api/hooks';
import type { M3UAccount, Stream } from '../api/types';
import { useDebounced, useOnVisible } from '../lib/useDebounced';
import { StreamRow } from './StreamRow';
import { Centered, IconButton, Sheet, Spinner } from './ui';

/** Search all provider streams and add matches to the channel. */
export function StreamPicker({
  open,
  onClose,
  initialQuery,
  accounts,
  inChannel,
  onAdd,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  initialQuery: string;
  accounts: M3UAccount[];
  inChannel: number[];
  onAdd: (s: Stream) => void;
  onPreview: (s: Stream) => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [account, setAccount] = useState<number | null>(null);
  const debounced = useDebounced(query, 350);
  // Exact phrase first; if nothing matches, fall back to matching all the words
  const phrase = useStreamSearch(debounced, account, 'phrase');
  const phraseEmpty = phrase.isSuccess && phrase.data.pages[0]?.count === 0;
  // A single word can't match any differently by words, so only fall back for multi-word queries
  const usingWords = phraseEmpty && /\s/.test(debounced.trim());
  const words = useStreamSearch(debounced, account, 'words', usingWords);
  const results = usingWords ? words : phrase;
  const items = useMemo(() => results.data?.pages.flatMap((p) => p.results) ?? [], [results.data]);
  const total = results.data?.pages[0]?.count;
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const sentinel = useOnVisible(() => results.fetchNextPage(), !!results.hasNextPage && !results.isFetchingNextPage);

  // Start from the channel's name each time the picker opens
  useEffect(() => {
    if (open) setQuery(initialQuery);
  }, [open, initialQuery]);

  return (
    <Sheet open={open} onClose={onClose} title="Add a stream" tall>
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-surface px-4 pb-2">
        <div className="relative">
          <Search size={18} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            className="field pl-9"
            type="search"
            placeholder="Search stream names"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {accounts.length > 1 && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 py-1">
            {[{ id: null, name: 'All sources' } as const, ...accounts].map((a) => (
              <button
                key={a.id ?? 'all'}
                onClick={() => setAccount(a.id)}
                className={clsx(
                  'shrink-0 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ring-1',
                  account === a.id ? 'bg-accent/15 text-accent ring-accent/40' : 'bg-surface-2 text-muted ring-line',
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        )}
        {total !== undefined && (
          <p className="text-xs text-muted">
            {total} stream{total === 1 ? '' : 's'}{' '}
            {usingWords ? 'containing all of these words (no exact matches)' : 'matching this text'}
          </p>
        )}
      </div>

      {debounced.trim().length < 2 ? (
        <Centered>Type at least 2 characters</Centered>
      ) : results.isPending ? (
        <Centered>
          <Spinner />
        </Centered>
      ) : results.isError ? (
        <Centered>
          <span className="text-danger">{results.error.message}</span>
        </Centered>
      ) : items.length === 0 ? (
        <Centered>No streams match “{debounced}”</Centered>
      ) : (
        <ul className="-mx-4 divide-y divide-line">
          {items.map((stream) => {
            const added = inChannel.includes(stream.id);
            return (
              <li key={stream.id}>
                <StreamRow
                  stream={stream}
                  accounts={accountMap}
                  actions={
                    <>
                      <IconButton
                        label="Preview"
                        tone="accent"
                        disabled={!stream.stream_hash}
                        onClick={() => {
                          onPreview(stream);
                          onClose();
                        }}
                      >
                        <Play size={20} />
                      </IconButton>
                      <IconButton label={added ? 'Already in channel' : 'Add to channel'} tone="accent" disabled={added} onClick={() => onAdd(stream)}>
                        {added ? <Check size={20} /> : <Plus size={22} />}
                      </IconButton>
                    </>
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
      <div ref={sentinel} className="h-10">
        {results.isFetchingNextPage && (
          <Centered>
            <Spinner />
          </Centered>
        )}
      </div>
    </Sheet>
  );
}
