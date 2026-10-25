import { useEffect, useRef, useState } from 'react';
import type Mpegts from 'mpegts.js';
import { AlertTriangle, X } from 'lucide-react';
import { accessToken } from '../api/client';
import { Spinner } from './ui';

/**
 * Live MPEG-TS preview via mpegts.js, configured like Dispatcharr's own floating player.
 * Unmounting stops the stream, which releases the provider connection.
 */
export function Player({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<'loading' | 'playing' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setState('loading');
    setError(null);

    let player: Mpegts.Player | null = null;
    let cancelled = false;

    (async () => {
      // Loaded on first preview: it's most of the bundle and the list screens don't need it
      const mpegts = (await import('mpegts.js')).default;
      if (!mpegts.isSupported()) {
        setState('error');
        setError('This browser cannot play live MPEG-TS (no Media Source Extensions).');
        return;
      }
      const token = await accessToken();
      if (cancelled) return;
      player = mpegts.createPlayer(
        // Absolute URL: mpegts.js fetches from a Web Worker, where relative URLs don't resolve
        { type: 'mpegts', url: new URL(url, window.location.origin).href, isLive: true, cors: true },
        {
          enableWorker: true,
          enableStashBuffer: false,
          liveBufferLatencyChasing: false,
          autoCleanupSourceBuffer: true,
          autoCleanupMaxBackwardDuration: 120,
          autoCleanupMinBackwardDuration: 60,
          reuseRedirectedURL: true,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      player.attachMediaElement(video);
      player.on(mpegts.Events.ERROR, (type: string, detail: string) => {
        if (type === 'NetworkError' && String(detail).includes('aborted')) return;
        setState('error');
        setError(`${type}: ${detail}`);
      });
      player.on(mpegts.Events.MEDIA_INFO, () => setState('playing'));
      player.load();
      video.play().catch(() => {
        // Autoplay with sound can be blocked; retry muted so the preview still shows picture
        video.muted = true;
        video.play().catch(() => {});
      });
    })();

    return () => {
      cancelled = true;
      if (player) {
        player.pause();
        player.unload();
        player.detachMediaElement();
        player.destroy();
      }
    };
  }, [url]);

  return (
    <div className="border-b border-line bg-black">
      <div className="relative aspect-video w-full">
        <video ref={videoRef} className="h-full w-full" controls playsInline />
        {state === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        )}
        {state === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 px-6 text-center text-sm">
            <AlertTriangle className="text-warn" />
            <span>Stream failed to play</span>
            <span className="text-xs text-muted">{error}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <span className="h-2 w-2 shrink-0 rounded-full bg-danger" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <button className="flex items-center gap-1 text-muted" onClick={onClose}>
          <X size={16} /> Stop
        </button>
      </div>
    </div>
  );
}
