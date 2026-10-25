import React from 'react';
import { ExternalLink, Github, Tv, CheckCircle2 } from 'lucide-react';
import { useSession } from '../context/SessionContext';

export const AboutScreen: React.FC = () => {
  const { serverUrl, isDemoMode } = useSession();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-bold text-white tracking-tight">About Dispatcharr</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Application version, runtime status, and architecture details</p>
      </div>

      <div className="p-6 rounded-2xl border border-zinc-700/80 bg-zinc-800/80 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center p-2.5 shadow-lg">
            <img src="/logo.png" alt="Dispatcharr Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Dispatcharr
              <span className="text-xs font-mono font-medium text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                v0.1.0
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">IPTV Channel, M3U Playlist, EPG, and DVR Streaming Management System</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-zinc-900 border border-zinc-700/60 rounded-xl space-y-1">
            <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">Client Runtime</span>
            <div className="text-zinc-200 font-medium">Dispatcharr Web Client (React + Vite + TypeScript)</div>
          </div>
          <div className="p-3 bg-zinc-900 border border-zinc-700/60 rounded-xl space-y-1">
            <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-semibold">Active Server</span>
            <div className="text-zinc-200 font-mono truncate">{isDemoMode ? 'Demo Standalone Mode (In-Memory Simulator)' : serverUrl}</div>
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-zinc-700/60">
          <h3 className="text-sm font-semibold text-zinc-200">Core Capabilities</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Full Parity with Dispatcharr WebUI</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>M3U &amp; Xtream Codes Provider Synchronization</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>XMLTV &amp; Schedules Direct Program Guide (EPG)</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Automated Series DVR &amp; Comskip Ad-Detection</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>VOD Movies and TV Series with Playback</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
              <span>Real-Time TS Stream Bitrate Telemetry</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 border-t border-zinc-700/60 flex items-center gap-3">
          <a
            href="https://github.com/dispatcharr/dispatcharr"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-xs font-medium transition"
          >
            <Github className="w-4 h-4" />
            Dispatcharr Core GitHub
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
          <a
            href="https://github.com/rdenno/dispatcharr-client"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-xs font-medium transition"
          >
            <Github className="w-4 h-4" />
            Client Repository
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>
        </div>
      </div>
    </div>
  );
};
