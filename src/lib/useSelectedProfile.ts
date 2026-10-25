import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { useChannelProfiles } from '../api/hooks';

const KEY = 'dispatcharr-mobile.profile';
const listeners = new Set<() => void>();

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * The channel profile whose membership toggles show on channel rows.
 * Remembered per device; defaults to a profile named "Plex", else the first one.
 * Stored value "none" hides the toggles.
 */
export function useSelectedProfile() {
  const profiles = useChannelProfiles();
  const stored = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
  );

  const profile = useMemo(() => {
    const list = profiles.data ?? [];
    if (stored === 'none') return null;
    return (
      list.find((p) => String(p.id) === stored) ??
      list.find((p) => p.name.toLowerCase() === 'plex') ??
      list[0] ??
      null
    );
  }, [profiles.data, stored]);

  const select = useCallback((id: number | null) => {
    try {
      localStorage.setItem(KEY, id === null ? 'none' : String(id));
    } catch {
      // Selection just won't persist
    }
    listeners.forEach((l) => l());
  }, []);

  const members = useMemo(() => new Set(profile?.channels ?? []), [profile]);
  return { profiles: profiles.data ?? [], profile, members, select };
}
