import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Play,
  Edit2,
  Trash2,
  ListOrdered,
  FolderPlus,
  Wand2,
  SlidersHorizontal,
  Tv,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { Channel, ChannelGroup, RawStream } from '../types/dispatcharr';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  SearchField,
  TextInput,
  SelectField,
  SwitchRow,
  LoadingBox,
  EmptyBox,
} from '../components/common/FormControls';

export const ChannelsScreen: React.FC = () => {
  const { isAdmin, channelGroups, refreshLookups, openPlayer } = useSession();
  const [activeTab, setActiveTab] = useState<'channels' | 'streams'>('channels');

  // Channels state
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [showDisabled, setShowDisabled] = useState(false);
  const [showStreamless, setShowStreamless] = useState(false);

  // Streams state
  const [streams, setStreams] = useState<RawStream[]>([]);
  const [streamsLoading, setStreamsLoading] = useState(false);

  // Modals
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingChannel, setDeletingChannel] = useState<Channel | null>(null);
  const [isAssignNumbersOpen, setIsAssignNumbersOpen] = useState(false);
  const [startingNumber, setStartingNumber] = useState('1');
  const [isGroupManagerOpen, setIsGroupManagerOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const fetchChannels = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, any> = {};
      if (search) q.search = search;
      if (selectedGroup !== null) q.channel_group = selectedGroup;
      if (!showDisabled) q.enabled = true;
      if (showStreamless) q.streamless = true;

      const data = await api.get('/api/channels/channels/', q);
      setChannels(Array.isArray(data) ? data : []);
    } catch {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, showDisabled, showStreamless]);

  const fetchStreams = useCallback(async () => {
    setStreamsLoading(true);
    try {
      const data = await api.get('/api/channels/streams/');
      setStreams(Array.isArray(data) ? data : []);
    } catch {
      setStreams([]);
    } finally {
      setStreamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'channels') {
      fetchChannels();
    } else {
      fetchStreams();
    }
  }, [activeTab, fetchChannels, fetchStreams]);

  const handleToggleEnabled = async (ch: Channel) => {
    try {
      await api.patch(`/api/channels/channels/${ch.id}/`, { enabled: !ch.enabled });
      setChannels((prev) => prev.map((c) => (c.id === ch.id ? { ...c, enabled: !c.enabled } : c)));
    } catch {
      // ignore
    }
  };

  const handleSaveChannel = async (e: React.FormEvent, data: Partial<Channel>) => {
    e.preventDefault();
    try {
      if (editingChannel) {
        await api.patch(`/api/channels/channels/${editingChannel.id}/`, data);
        setMessage('Channel updated successfully');
      } else {
        await api.post('/api/channels/channels/', data);
        setMessage('Channel created successfully');
      }
      setIsCreateOpen(false);
      setEditingChannel(null);
      fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error saving channel');
    }
  };

  const handleDeleteChannel = async () => {
    if (!deletingChannel) return;
    try {
      await api.delete(`/api/channels/channels/${deletingChannel.id}/`);
      setChannels((prev) => prev.filter((c) => c.id !== deletingChannel.id));
      setMessage('Channel deleted');
    } catch (err: any) {
      alert(err.message || 'Error deleting channel');
    }
  };

  const handleAssignNumbers = async () => {
    try {
      await api.post('/api/channels/channels/assign/', {
        starting_num: parseInt(startingNumber) || 1,
      });
      setIsAssignNumbersOpen(false);
      setMessage('Channel numbers assigned sequentially');
      fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error assigning numbers');
    }
  };

  const handleAutoMatchEpg = async () => {
    try {
      await api.post('/api/channels/channels/match-epg/');
      setMessage('Auto-matched EPG guides to channels');
      fetchChannels();
    } catch (err: any) {
      alert(err.message || 'Error auto-matching EPG');
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await api.post('/api/channels/groups/', { name: newGroupName });
      setNewGroupName('');
      refreshLookups();
      setMessage('Channel group created');
    } catch (err: any) {
      alert(err.message || 'Error creating group');
    }
  };

  const handleDeleteGroup = async (gid: number) => {
    try {
      await api.delete(`/api/channels/groups/${gid}/`);
      refreshLookups();
      if (selectedGroup === gid) setSelectedGroup(null);
    } catch (err: any) {
      alert(err.message || 'Error deleting group');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast banner */}
      {message && (
        <div className="flex items-center justify-between p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-300 text-xs animate-in fade-in">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="text-teal-400 hover:text-teal-200">
            ×
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Channels & Streams</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeTab === 'channels' ? 'Organize, number, and stream IPTV channels' : 'Inspect raw upstream M3U and Xtream sources'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700">
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'channels' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Channels ({channels.length})
            </button>
            <button
              onClick={() => setActiveTab('streams')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'streams' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Raw Streams ({streams.length || '•'})
            </button>
          </div>
        )}
      </div>

      {activeTab === 'channels' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by channel name or number..."
              className="max-w-md"
            />

            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add Channel
              </button>

              <button
                onClick={() => setShowDisabled(!showDisabled)}
                className={`p-2 rounded-lg border text-xs font-medium transition ${
                  showDisabled
                    ? 'bg-zinc-700 text-white border-zinc-600'
                    : 'bg-zinc-800/80 text-zinc-400 border-zinc-700 hover:text-white'
                }`}
                title={showDisabled ? 'Showing disabled channels' : 'Hiding disabled channels'}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={() => setIsAssignNumbersOpen(true)}
                    className="p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-700 transition"
                    title="Assign Channel Numbers"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsGroupManagerOpen(true)}
                    className="p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white border border-zinc-700 transition"
                    title="Manage Channel Groups"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleAutoMatchEpg}
                    className="p-2 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-teal-400 border border-zinc-700 transition"
                    title="Auto Match EPG"
                  >
                    <Wand2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Group Chips Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedGroup(null)}
              className={`px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                selectedGroup === null
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-medium'
                  : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              All Groups
            </button>
            {channelGroups.map((g) => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(selectedGroup === g.id ? null : g.id)}
                className={`px-3 py-1.5 rounded-full border transition whitespace-nowrap ${
                  selectedGroup === g.id
                    ? 'bg-teal-500/20 text-teal-300 border-teal-500/40 font-medium'
                    : 'bg-zinc-800/60 text-zinc-400 border-zinc-700 hover:bg-zinc-800'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>

          {/* Channels List */}
          {loading ? (
            <LoadingBox message="Fetching channels..." />
          ) : channels.length === 0 ? (
            <EmptyBox message="No channels found" submessage="Try adjusting filters or import playlists via M3U & EPG Manager." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className={`flex flex-col justify-between p-4 rounded-xl border bg-zinc-800/70 hover:bg-zinc-800 transition shadow-xs group ${
                    !ch.enabled ? 'opacity-60 border-zinc-800' : 'border-zinc-700/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Logo */}
                    <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-zinc-700/60 overflow-hidden shrink-0 flex items-center justify-center p-1">
                      {ch.logo_url ? (
                        <img src={ch.logo_url} alt={ch.name} className="w-full h-full object-contain" />
                      ) : (
                        <Tv className="w-6 h-6 text-zinc-600" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {ch.channel_number && (
                          <span className="font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-zinc-900 text-teal-400 border border-zinc-700">
                            {ch.channel_number}
                          </span>
                        )}
                        <h4 className="font-semibold text-sm text-zinc-100 truncate">{ch.name}</h4>
                      </div>

                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {ch.channel_group_name && (
                          <span className="text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800">
                            {ch.channel_group_name}
                          </span>
                        )}
                        {(ch.stream_count ?? 1) > 0 ? (
                          <span className="text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                            {ch.stream_count} stream{ch.stream_count === 1 ? '' : 's'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            Streamless
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-zinc-700/50">
                    <button
                      onClick={() => handleToggleEnabled(ch)}
                      className={`text-xs flex items-center gap-1 transition ${
                        ch.enabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      {ch.enabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {ch.enabled ? 'Enabled' : 'Disabled'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openPlayer(`/proxy/ts/stream/${ch.uuid || ch.id}`, ch.name, true)}
                        className="p-1.5 rounded-lg bg-teal-600/20 text-teal-400 hover:bg-teal-600 hover:text-white transition"
                        title="Play Live Stream"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingChannel(ch)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                        title="Edit Channel"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => setDeletingChannel(ch)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                          title="Delete Channel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Streams Tab */
        <div className="space-y-4">
          {streamsLoading ? (
            <LoadingBox message="Loading raw streams..." />
          ) : streams.length === 0 ? (
            <EmptyBox message="No raw streams found" submessage="Add M3U or Xtream accounts in M3U & EPG Manager." />
          ) : (
            <div className="space-y-2.5">
              {streams.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-700/70 bg-zinc-800/80 hover:bg-zinc-800 transition"
                >
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100 truncate">{s.name}</span>
                      {s.resolution && <Badge color="zinc">{s.resolution}</Badge>}
                      {s.fps && <Badge color="teal">{s.fps} FPS</Badge>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span>Source: {s.playlist_name || 'M3U Feed'}</span>
                      {s.channel_name && <span className="text-teal-400">Mapped to: {s.channel_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openPlayer(s.url, s.name, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Play Stream
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit / Create Channel Modal */}
      {(isCreateOpen || editingChannel) && (
        <ChannelFormModal
          channel={editingChannel}
          isOpen={isCreateOpen || !!editingChannel}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingChannel(null);
          }}
          onSave={handleSaveChannel}
          channelGroups={channelGroups}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingChannel}
        title="Delete Channel"
        message={`Are you sure you want to permanently delete "${deletingChannel?.name}"? Associated DVR rules may be affected.`}
        confirmText="Delete"
        destructive
        onConfirm={handleDeleteChannel}
        onCancel={() => setDeletingChannel(null)}
      />

      {/* Assign Numbers Modal */}
      <Modal
        isOpen={isAssignNumbersOpen}
        onClose={() => setIsAssignNumbersOpen(false)}
        title="Assign Channel Numbers"
        subtitle="Sequentially number all channels in current order"
        maxWidth="sm"
        actions={
          <>
            <button
              onClick={() => setIsAssignNumbersOpen(false)}
              className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignNumbers}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white"
            >
              Assign Numbers
            </button>
          </>
        }
      >
        <TextInput
          label="Starting Channel Number"
          value={startingNumber}
          onChange={setStartingNumber}
          type="number"
          description="E.g. 1 or 100. Channels will be numbered consecutively."
        />
      </Modal>

      {/* Channel Groups Manager Modal */}
      <Modal
        isOpen={isGroupManagerOpen}
        onClose={() => setIsGroupManagerOpen(false)}
        title="Manage Channel Groups"
        subtitle="Create or delete categories for IPTV channels"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <TextInput
                label="New Group Name"
                value={newGroupName}
                onChange={setNewGroupName}
                placeholder="e.g. Kids & Animation"
              />
            </div>
            <button
              type="button"
              onClick={handleCreateGroup}
              className="mt-6 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pt-2">
            {channelGroups.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-lg text-sm"
              >
                <span className="font-medium text-zinc-200">{g.name}</span>
                <button
                  onClick={() => handleDeleteGroup(g.id)}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded hover:bg-zinc-800 transition"
                  title="Delete Group"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface ChannelFormModalProps {
  channel: Channel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent, data: Partial<Channel>) => void;
  channelGroups: ChannelGroup[];
}

const ChannelFormModal: React.FC<ChannelFormModalProps> = ({
  channel,
  isOpen,
  onClose,
  onSave,
  channelGroups,
}) => {
  const [name, setName] = useState(channel?.name || '');
  const [channelNumber, setChannelNumber] = useState(String(channel?.channel_number || ''));
  const [logoUrl, setLogoUrl] = useState(channel?.logo_url || '');
  const [groupId, setGroupId] = useState<number | null>(channel?.channel_group || null);
  const [enabled, setEnabled] = useState(channel?.enabled !== false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(e, {
      name,
      channel_number: channelNumber,
      logo_url: logoUrl,
      channel_group: groupId,
      enabled,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={channel ? 'Edit Channel' : 'Add Channel'}
      subtitle="Configure channel metadata and playlist mappings"
      maxWidth="md"
      actions={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-zinc-300 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs"
          >
            Save Channel
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Channel Name" value={name} onChange={setName} required placeholder="e.g. ESPN HD" />
        <TextInput
          label="Channel Number"
          value={channelNumber}
          onChange={setChannelNumber}
          placeholder="e.g. 101 or 101.1"
          description="Numeric channel designation displayed in guide and player."
        />
        <TextInput
          label="Logo URL"
          value={logoUrl}
          onChange={setLogoUrl}
          placeholder="https://..."
          description="Station logo image link or local asset."
        />
        <SelectField
          label="Channel Group"
          value={groupId}
          onChange={setGroupId}
          options={channelGroups.map((g) => ({ value: g.id, label: g.name }))}
          noneLabel="No Group"
        />
        <SwitchRow
          label="Channel Enabled"
          description="Enabled channels are available to clients and guide exports."
          checked={enabled}
          onChange={setEnabled}
        />
      </form>
    </Modal>
  );
};
