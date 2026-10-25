import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Radio, Users, Wifi, Clock, StopCircle, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { LiveStreamStatus, VodClientStatus } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { LoadingBox, EmptyBox } from '../components/common/FormControls';

export const StatsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'streams' | 'vod'>('streams');
  const [streams, setStreams] = useState<LiveStreamStatus[]>([]);
  const [vodClients, setVodClients] = useState<VodClientStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingStream, setStoppingStream] = useState<LiveStreamStatus | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const [tsRes, vodRes] = await Promise.all([
        api.get('/proxy/ts/status'),
        api.get('/proxy/vod/stats/'),
      ]);
      setStreams(tsRes?.channels || []);
      setVodClients(vodRes?.connections || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const handleStopStream = async () => {
    if (!stoppingStream) return;
    try {
      const id = stoppingStream.channel_id || stoppingStream.name;
      await api.post(`/proxy/ts/stop/${id}`);
      setStreams((prev) => prev.filter((s) => s.channel_id !== stoppingStream.channel_id));
      setStoppingStream(null);
    } catch (err: any) {
      alert(err.message || 'Error stopping stream');
    }
  };

  // Aggregated totals
  const totalClients = streams.reduce((acc, s) => acc + (s.client_count || s.clients?.length || 0), 0) + vodClients.length;
  const totalBandwidthKbps = streams.reduce((acc, s) => acc + (s.bitrate || 0), 0) + vodClients.reduce((acc, v) => acc + (v.bitrate || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Server Stats & Live Monitoring</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Live TS active streams, client sessions, and bandwidth consumption</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Polling (3s)
          </span>
          <button
            onClick={fetchStats}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Active TS Streams</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{streams.length}</div>
          <div className="mt-1 text-xs text-zinc-400">Broadcasting via transcode proxy</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Connected Clients</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{totalClients}</div>
          <div className="mt-1 text-xs text-zinc-400">Total active viewers</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Bandwidth Bitrate</span>
            <Wifi className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white font-mono">{Fmt.bitrate(totalBandwidthKbps)}</div>
          <div className="mt-1 text-xs text-zinc-400">Aggregated server egress</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700 w-fit">
        <button
          onClick={() => setActiveTab('streams')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'streams' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          Live Streams ({streams.length})
        </button>
        <button
          onClick={() => setActiveTab('vod')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
            activeTab === 'vod' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
          }`}
        >
          VOD Clients ({vodClients.length})
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingBox message="Querying active streaming telemetry..." />
      ) : activeTab === 'streams' ? (
        streams.length === 0 ? (
          <EmptyBox message="No active live TS streams" submessage="Stream connections will appear here when clients tune into channels." />
        ) : (
          <div className="space-y-3">
            {streams.map((s, idx) => (
              <div
                key={s.channel_id || idx}
                className="p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <h4 className="font-semibold text-sm text-zinc-100">{s.channel_name || s.name || 'Channel'}</h4>
                      <Badge color="teal">{s.client_count || s.clients?.length || 0} clients</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>Bitrate: {Fmt.bitrate(s.bitrate)}</span>
                      <span>•</span>
                      <span>Uptime: {Fmt.duration(s.uptime)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setStoppingStream(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium transition w-fit"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    Disconnect Stream
                  </button>
                </div>

                {/* Clients sub-list */}
                {s.clients && s.clients.length > 0 && (
                  <div className="pt-2 border-t border-zinc-700/50 space-y-1.5">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">Connected Viewers:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {s.clients.map((c, i) => (
                        <div key={i} className="p-2 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                          <span className="font-mono text-zinc-400">{c.ip}</span>
                          <span className="text-zinc-500 truncate max-w-[120px]">{c.user_agent}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        /* VOD clients */
        vodClients.length === 0 ? (
          <EmptyBox message="No active VOD sessions" submessage="Users watching movies or series will appear here." />
        ) : (
          <div className="space-y-3">
            {vodClients.map((v, idx) => (
              <div
                key={v.client_id || idx}
                className="flex items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition"
              >
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-zinc-100">{v.title}</h4>
                  <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono">
                    <span>IP: {v.ip}</span>
                    <span>•</span>
                    <span>Session: {Fmt.duration(v.duration)}</span>
                    {v.bitrate && (
                      <>
                        <span>•</span>
                        <span>{Fmt.bitrate(v.bitrate)}</span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setVodClients((prev) => prev.filter((x) => x.client_id !== v.client_id))}
                  className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white text-xs font-medium transition"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Disconnect Stream Confirmation */}
      <ConfirmModal
        isOpen={!!stoppingStream}
        title="Disconnect Stream"
        message={`Terminate active upstream connection for "${stoppingStream?.channel_name || stoppingStream?.name}"? All connected clients will be disconnected.`}
        confirmText="Disconnect"
        destructive
        onConfirm={handleStopStream}
        onCancel={() => setStoppingStream(null)}
      />
    </div>
  );
};
