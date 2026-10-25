import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Film,
  Calendar,
  Layers,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { PlaylistAccount, EpgSource } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  TextInput,
  SelectField,
  SwitchRow,
  LoadingBox,
  EmptyBox,
} from '../components/common/FormControls';

export const SourcesScreen: React.FC = () => {
  const { refreshLookups } = useSession();
  const [activeTab, setActiveTab] = useState<'playlists' | 'epg'>('playlists');

  const [playlists, setPlaylists] = useState<PlaylistAccount[]>([]);
  const [epgSources, setEpgSources] = useState<EpgSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [editingPlaylist, setEditingPlaylist] = useState<PlaylistAccount | null>(null);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [deletingPlaylist, setDeletingPlaylist] = useState<PlaylistAccount | null>(null);

  const [editingEpg, setEditingEpg] = useState<EpgSource | null>(null);
  const [isEpgModalOpen, setIsEpgModalOpen] = useState(false);
  const [deletingEpg, setDeletingEpg] = useState<EpgSource | null>(null);

  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pls, epgs] = await Promise.all([
        api.get('/api/m3u/accounts/'),
        api.get('/api/epg/sources/'),
      ]);
      setPlaylists(Array.isArray(pls) ? pls : []);
      setEpgSources(Array.isArray(epgs) ? epgs : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Playlist actions
  const handleRefreshPlaylist = async (pl: PlaylistAccount) => {
    try {
      await api.post(`/api/m3u/refresh/${pl.id}/`);
      showToast(`Triggered sync for "${pl.name}"`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Sync failed');
    }
  };

  const handleRefreshAllPlaylists = async () => {
    try {
      await api.post('/api/m3u/refresh/');
      showToast('Refreshing all M3U and Xtream playlists in background');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Refresh all failed');
    }
  };

  const handleRefreshVod = async (pl: PlaylistAccount) => {
    try {
      await api.post(`/api/m3u/accounts/${pl.id}/refresh-vod/`);
      showToast(`Triggered VOD catalog scan for "${pl.name}"`);
    } catch (err: any) {
      alert(err.message || 'VOD sync failed');
    }
  };

  const handleDeletePlaylist = async () => {
    if (!deletingPlaylist) return;
    try {
      await api.delete(`/api/m3u/accounts/${deletingPlaylist.id}/`);
      setPlaylists((prev) => prev.filter((p) => p.id !== deletingPlaylist.id));
      refreshLookups();
      showToast('Playlist deleted');
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  // EPG actions
  const handleRefreshEpg = async (epg: EpgSource) => {
    try {
      await api.post(`/api/epg/refresh/${epg.id}/`);
      showToast(`Triggered guide download for "${epg.name}"`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'EPG refresh failed');
    }
  };

  const handleRefreshAllEpg = async () => {
    try {
      await api.post('/api/epg/refresh/');
      showToast('Force refreshing all EPG XMLTV guides');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Refresh failed');
    }
  };

  const handleDeleteEpg = async () => {
    if (!deletingEpg) return;
    try {
      await api.delete(`/api/epg/sources/${deletingEpg.id}/`);
      setEpgSources((prev) => prev.filter((e) => e.id !== deletingEpg.id));
      refreshLookups();
      showToast('EPG source deleted');
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-300 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">M3U & EPG Manager</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeTab === 'playlists'
              ? 'Configure IPTV providers, Xtream Codes accounts, and raw M3U feeds'
              : 'Configure XMLTV feeds and Schedules Direct program guides'}
          </p>
        </div>

        <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700">
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'playlists' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playlists ({playlists.length})
          </button>
          <button
            onClick={() => setActiveTab('epg')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'epg' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            EPG Sources ({epgSources.length})
          </button>
        </div>
      </div>

      {activeTab === 'playlists' ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-zinc-400">
              Synced playlists generate stream options for channels and populate the raw stream index.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAllPlaylists}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                Sync All
              </button>
              <button
                onClick={() => setIsPlaylistModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add Playlist
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingBox message="Loading playlists..." />
          ) : playlists.length === 0 ? (
            <EmptyBox message="No playlists configured" submessage="Add an M3U URL or Xtream Codes login to import IPTV channels." />
          ) : (
            <div className="space-y-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-semibold text-sm text-zinc-100">{pl.name}</h4>
                      <Badge color={pl.type === 'xtream' ? 'teal' : 'blue'}>
                        {pl.type.toUpperCase()}
                      </Badge>
                      {!pl.enabled && <Badge color="red">Disabled</Badge>}
                    </div>

                    <div className="text-xs font-mono text-zinc-400 truncate max-w-lg">{pl.url}</div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap pt-0.5">
                      <span>Max Concurrent: {pl.max_streams || 1}</span>
                      <span>•</span>
                      <span>Streams: {pl.stream_count || 0}</span>
                      <span>•</span>
                      <span>Last sync: {Fmt.relative(pl.last_refresh)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRefreshPlaylist(pl)}
                      className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                      title="Sync / Refresh Playlist"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    {pl.type === 'xtream' && (
                      <button
                        onClick={() => handleRefreshVod(pl)}
                        className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                        title="Sync VOD Catalog"
                      >
                        <Film className="w-4 h-4 text-teal-400" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditingPlaylist(pl)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                      title="Edit Settings"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingPlaylist(pl)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                      title="Delete Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* EPG Sources Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-zinc-400">
              Electronic Program Guide (EPG) feeds supply on-air schedules and synopsis data.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshAllEpg}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-teal-400" />
                Force Refresh All
              </button>
              <button
                onClick={() => setIsEpgModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add EPG Source
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingBox message="Loading EPG sources..." />
          ) : epgSources.length === 0 ? (
            <EmptyBox message="No EPG sources configured" submessage="Add an XMLTV URL (.xml or .xml.gz) or Schedules Direct account." />
          ) : (
            <div className="space-y-3">
              {epgSources.map((epg) => (
                <div
                  key={epg.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="font-semibold text-sm text-zinc-100">{epg.name}</h4>
                      <Badge color="orange">{epg.type.toUpperCase()}</Badge>
                      {!epg.enabled && <Badge color="red">Disabled</Badge>}
                    </div>

                    <div className="text-xs font-mono text-zinc-400 truncate max-w-lg">{epg.url}</div>

                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap pt-0.5">
                      <span>Channels Mapped: {epg.channel_count || 0}</span>
                      <span>•</span>
                      <span>Sync Interval: Every {epg.refresh_interval || 24}h</span>
                      <span>•</span>
                      <span>Last sync: {Fmt.relative(epg.last_refresh)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRefreshEpg(epg)}
                      className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                      title="Force Refresh EPG"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingEpg(epg)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                      title="Edit Source"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingEpg(epg)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                      title="Delete Source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Playlist Add/Edit Modal */}
      {(isPlaylistModalOpen || editingPlaylist) && (
        <PlaylistModal
          playlist={editingPlaylist}
          isOpen={isPlaylistModalOpen || !!editingPlaylist}
          onClose={() => {
            setIsPlaylistModalOpen(false);
            setEditingPlaylist(null);
          }}
          onSuccess={() => {
            setIsPlaylistModalOpen(false);
            setEditingPlaylist(null);
            fetchData();
            refreshLookups();
            showToast('Playlist saved successfully');
          }}
        />
      )}

      {/* EPG Source Add/Edit Modal */}
      {(isEpgModalOpen || editingEpg) && (
        <EpgModal
          epg={editingEpg}
          isOpen={isEpgModalOpen || !!editingEpg}
          onClose={() => {
            setIsEpgModalOpen(false);
            setEditingEpg(null);
          }}
          onSuccess={() => {
            setIsEpgModalOpen(false);
            setEditingEpg(null);
            fetchData();
            refreshLookups();
            showToast('EPG Source saved successfully');
          }}
        />
      )}

      {/* Delete Playlist Confirmation */}
      <ConfirmModal
        isOpen={!!deletingPlaylist}
        title="Delete Playlist"
        message={`Delete "${deletingPlaylist?.name}"? Raw streams associated with this playlist will be removed.`}
        confirmText="Delete Playlist"
        destructive
        onConfirm={handleDeletePlaylist}
        onCancel={() => setDeletingPlaylist(null)}
      />

      {/* Delete EPG Confirmation */}
      <ConfirmModal
        isOpen={!!deletingEpg}
        title="Delete EPG Source"
        message={`Delete EPG source "${deletingEpg?.name}"?`}
        confirmText="Delete Source"
        destructive
        onConfirm={handleDeleteEpg}
        onCancel={() => setDeletingEpg(null)}
      />
    </div>
  );
};

const PlaylistModal: React.FC<{
  playlist: PlaylistAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ playlist, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState(playlist?.name || '');
  const [type, setType] = useState<'m3u' | 'xtream'>(playlist?.type || 'm3u');
  const [url, setUrl] = useState(playlist?.url || '');
  const [username, setUsername] = useState(playlist?.username || '');
  const [password, setPassword] = useState(playlist?.password || '');
  const [maxStreams, setMaxStreams] = useState(String(playlist?.max_streams || 2));
  const [refreshInterval, setRefreshInterval] = useState(String(playlist?.refresh_interval || 24));
  const [enabled, setEnabled] = useState(playlist?.enabled !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      type,
      url,
      username: type === 'xtream' ? username : undefined,
      password: type === 'xtream' ? password : undefined,
      max_streams: parseInt(maxStreams) || 1,
      refresh_interval: parseInt(refreshInterval) || 24,
      enabled,
    };
    try {
      if (playlist) {
        await api.patch(`/api/m3u/accounts/${playlist.id}/`, payload);
      } else {
        await api.post('/api/m3u/accounts/', payload);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error saving playlist');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={playlist ? 'Edit Playlist' : 'Add Playlist'}
      subtitle="Configure IPTV M3U stream or Xtream Codes provider"
      maxWidth="md"
      actions={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg shadow-xs"
          >
            Save Playlist
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Account / Playlist Name" value={name} onChange={setName} placeholder="e.g. Primary IPTV Provider" required />
        <SelectField
          label="Playlist Type"
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'm3u', label: 'Plain M3U / M3U8 URL' },
            { value: 'xtream', label: 'Xtream Codes API Account' },
          ]}
        />
        <TextInput
          label={type === 'xtream' ? 'Server Base URL' : 'M3U Playlist URL'}
          value={url}
          onChange={setUrl}
          placeholder={type === 'xtream' ? 'http://server.domain.com:8080' : 'https://.../playlist.m3u'}
          required
        />
        {type === 'xtream' && (
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Username" value={username} onChange={setUsername} required />
            <TextInput label="Password" value={password} onChange={setPassword} type="password" required />
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <TextInput label="Max Concurrent Streams" value={maxStreams} onChange={setMaxStreams} type="number" />
          <TextInput label="Sync Interval (Hours)" value={refreshInterval} onChange={setRefreshInterval} type="number" />
        </div>
        <SwitchRow label="Enabled" checked={enabled} onChange={setEnabled} />
      </form>
    </Modal>
  );
};

const EpgModal: React.FC<{
  epg: EpgSource | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ epg, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState(epg?.name || '');
  const [type, setType] = useState<'xmltv' | 'schedules_direct'>(epg?.type || 'xmltv');
  const [url, setUrl] = useState(epg?.url || '');
  const [refreshInterval, setRefreshInterval] = useState(String(epg?.refresh_interval || 24));
  const [enabled, setEnabled] = useState(epg?.enabled !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      type,
      url,
      refresh_interval: parseInt(refreshInterval) || 24,
      enabled,
    };
    try {
      if (epg) {
        await api.patch(`/api/epg/sources/${epg.id}/`, payload);
      } else {
        await api.post('/api/epg/sources/', payload);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error saving EPG source');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={epg ? 'Edit EPG Source' : 'Add EPG Source'}
      subtitle="Configure electronic guide metadata feeds"
      maxWidth="md"
      actions={
        <>
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-300 hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg shadow-xs"
          >
            Save EPG Source
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Source Label" value={name} onChange={setName} placeholder="e.g. UK & US XMLTV Guide" required />
        <SelectField
          label="Format Type"
          value={type}
          onChange={(v) => setType(v)}
          options={[
            { value: 'xmltv', label: 'XMLTV URL (.xml or .xml.gz)' },
            { value: 'schedules_direct', label: 'Schedules Direct API' },
          ]}
        />
        <TextInput label="Source URL" value={url} onChange={setUrl} placeholder="https://.../guide.xml.gz" required />
        <TextInput label="Auto-Refresh Interval (Hours)" value={refreshInterval} onChange={setRefreshInterval} type="number" />
        <SwitchRow label="Enabled" checked={enabled} onChange={setEnabled} />
      </form>
    </Modal>
  );
};
