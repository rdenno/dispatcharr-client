import { useEffect, useRef, useState } from 'react';

export function useDebounced<T>(value: T, ms = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/** Calls onVisible when the returned ref's element scrolls into view (infinite lists). */
export function useOnVisible(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onVisible);
  callback.current = onVisible;
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    const io = new IntersectionObserver((entries) => entries[0]?.isIntersecting && callback.current(), {
      rootMargin: '400px',
    });
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);
  return ref;
}
