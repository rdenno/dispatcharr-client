import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from './Badge';

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  live?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  url,
  title,
  live = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      setHasError(false);
      videoRef.current.currentTime = 0;
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Auto-play might be blocked with audio; try muted
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);
            videoRef.current.play().catch((e) => {
              setHasError(true);
              setErrorMsg(e.message || 'Stream source playback prevented by browser');
            });
          }
        });
    }
  }, [isOpen, url]);

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/90 backdrop-blur-md">
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl bg-black border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col group"
      >
        {/* Top Overlay Bar */}
        <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-90 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-white truncate max-w-md">{title || 'Media Stream'}</h2>
            {live ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-red-600/90 text-white animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                LIVE
              </span>
            ) : (
              <Badge color="teal">VOD</Badge>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Canvas */}
        <div className="relative aspect-video w-full bg-zinc-950 flex items-center justify-center">
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            playsInline
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                setDuration(videoRef.current.duration || 0);
              }
            }}
            onError={() => {
              setHasError(true);
              setErrorMsg('Unable to render live video source. Format may require TS transcode proxy.');
            }}
          />

          {hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-zinc-900/95 text-center space-y-3 z-10">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
                <AlertCircle className="w-10 h-10" />
              </div>
              <div className="font-semibold text-zinc-100 text-base">Playback Notice</div>
              <p className="text-xs text-zinc-400 max-w-md leading-relaxed">{errorMsg}</p>
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-300 max-w-lg truncate">
                {url}
              </div>
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-600 hover:bg-teal-500 text-white transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in VLC / External Player
                </a>
                <button
                  onClick={() => {
                    setHasError(false);
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
                >
                  Retry Playback
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls Bar */}
        <div className="p-3 sm:p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="p-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition shadow-sm"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition"
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 accent-teal-500 cursor-pointer"
              />
            </div>

            {!live && duration > 0 && (
              <span className="text-xs text-zinc-400 font-mono">
                {Math.floor(currentTime / 60)}:{(Math.floor(currentTime) % 60).toString().padStart(2, '0')} /{' '}
                {Math.floor(duration / 60)}:{(Math.floor(duration) % 60).toString().padStart(2, '0')}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline-block truncate max-w-xs">
              {url.split('/').slice(-1)[0] || 'stream'}
            </span>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white transition"
              title="Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
