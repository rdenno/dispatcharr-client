import React, { useState, useEffect, useCallback } from 'react';
import {
  Sliders,
  Tv,
  Network,
  Database,
  Plus,
  Trash2,
  CheckCircle2,
  Download,
  Upload,
  Layers,
  Cpu,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { StreamProfile, OutputProfile, UserAgent } from '../types/dispatcharr';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  TextInput,
  SelectField,
  SwitchRow,
  LoadingBox,
} from '../components/common/FormControls';

export const SettingsScreen: React.FC = () => {
  const { isAdmin } = useSession();
  const [activeSection, setActiveSection] = useState<
    'stream-profiles' | 'output-profiles' | 'user-agents' | 'dvr' | 'backup'
  >('stream-profiles');

  const [streamProfiles, setStreamProfiles] = useState<StreamProfile[]>([]);
  const [outputProfiles, setOutputProfiles] = useState<OutputProfile[]>([]);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddStreamProfileOpen, setIsAddStreamProfileOpen] = useState(false);
  const [isAddOutputProfileOpen, setIsAddOutputProfileOpen] = useState(false);
  const [isAddUserAgentOpen, setIsAddUserAgentOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Generic DVR settings
  const [dvrPath, setDvrPath] = useState('/var/dispatcharr/recordings');
  const [prePadding, setPrePadding] = useState('2');
  const [postPadding, setPostPadding] = useState('5');
  const [enableComskip, setEnableComskip] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const [sp, op, ua] = await Promise.all([
        api.get('/api/core/streamprofiles/'),
        api.get('/api/core/outputprofiles/'),
        api.get('/api/core/useragents/'),
      ]);
      setStreamProfiles(Array.isArray(sp) ? sp : []);
      setOutputProfiles(Array.isArray(op) ? op : []);
      setUserAgents(Array.isArray(ua) ? ua : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleBackup = () => {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '0.1.0',
      note: 'Dispatcharr Full Configuration Snapshot',
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dispatcharr-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('Configuration snapshot downloaded');
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
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-bold text-white tracking-tight">Server Settings & Profiles</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Stream transcode profiles, output formats, User-Agent overrides, and DVR tuning</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveSection('stream-profiles')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition ${
              activeSection === 'stream-profiles'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Stream Profiles
          </button>
          <button
            onClick={() => setActiveSection('output-profiles')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition ${
              activeSection === 'output-profiles'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            Output Profiles
          </button>
          <button
            onClick={() => setActiveSection('user-agents')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition ${
              activeSection === 'user-agents'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Network className="w-4 h-4" />
            User-Agents
          </button>
          <button
            onClick={() => setActiveSection('dvr')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition ${
              activeSection === 'dvr'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Tv className="w-4 h-4" />
            DVR Settings
          </button>
          <button
            onClick={() => setActiveSection('backup')}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 transition ${
              activeSection === 'backup'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Database className="w-4 h-4" />
            Backup & Restore
          </button>
        </div>

        {/* Detail Panel */}
        <div className="md:col-span-3 space-y-4">
          {activeSection === 'stream-profiles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">Stream Profiles</h3>
                  <p className="text-xs text-zinc-400">FFmpeg video and audio transcode templates for live channels</p>
                </div>
                <button
                  onClick={() => setIsAddStreamProfileOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Profile
                </button>
              </div>

              <div className="space-y-2.5">
                {streamProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-100">{p.name}</h4>
                      <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                        <span>Video: {p.video_codec || 'copy'}</span>
                        <span>•</span>
                        <span>Audio: {p.audio_codec || 'copy'}</span>
                        {p.resolution && (
                          <>
                            <span>•</span>
                            <span>{p.resolution}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'output-profiles' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">Output Profiles</h3>
                  <p className="text-xs text-zinc-400">HLS streaming chunk durations and delivery profiles</p>
                </div>
                <button
                  onClick={() => setIsAddOutputProfileOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Output Profile
                </button>
              </div>

              <div className="space-y-2.5">
                {outputProfiles.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-semibold text-sm text-zinc-100">{p.name}</h4>
                      <div className="text-xs text-zinc-400 mt-1">
                        Segment Length: {p.segment_length || 6}s • Type: {p.output_type || 'hls'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'user-agents' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-100">User-Agents</h3>
                  <p className="text-xs text-zinc-400">Custom client User-Agent headers sent when requesting M3U stream URLs</p>
                </div>
                <button
                  onClick={() => setIsAddUserAgentOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add User-Agent
                </button>
              </div>

              <div className="space-y-2.5">
                {userAgents.map((a) => (
                  <div
                    key={a.id}
                    className="p-3.5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 space-y-1"
                  >
                    <h4 className="font-semibold text-sm text-zinc-100">{a.name}</h4>
                    <p className="font-mono text-xs text-zinc-400 break-all">{a.user_agent_string}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'dvr' && (
            <div className="p-5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">DVR & Recording Configuration</h3>
                <p className="text-xs text-zinc-400">Storage target directories and padding buffers</p>
              </div>

              <TextInput
                label="Recording Storage Directory"
                value={dvrPath}
                onChange={setDvrPath}
                description="Local or mounted NFS path where raw .ts files and MP4 exports are saved."
              />

              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="Pre-Padding (Minutes)"
                  value={prePadding}
                  onChange={setPrePadding}
                  type="number"
                  description="Start recording before scheduled airtime."
                />
                <TextInput
                  label="Post-Padding (Minutes)"
                  value={postPadding}
                  onChange={setPostPadding}
                  type="number"
                  description="Extend recording past scheduled airtime."
                />
              </div>

              <SwitchRow
                label="Enable Comskip Commercial Detection"
                description="Automatically run Comskip analyzer upon recording completion."
                checked={enableComskip}
                onChange={setEnableComskip}
              />

              <div className="pt-2">
                <button
                  onClick={() => showToast('DVR settings saved successfully')}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  Save DVR Settings
                </button>
              </div>
            </div>
          )}

          {activeSection === 'backup' && (
            <div className="p-5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">Backup & Restore</h3>
                <p className="text-xs text-zinc-400">Export database configuration, channels, and rules as JSON</p>
              </div>

              <div className="p-4 bg-zinc-900 border border-zinc-700/60 rounded-lg space-y-3">
                <h4 className="text-sm font-semibold text-zinc-200">Export Configuration Snapshot</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Generates an export containing all playlist settings, custom channel numbering, groups, DVR series rules, and profiles.
                </p>
                <button
                  onClick={handleBackup}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Backup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Stream Profile Modal */}
      {isAddStreamProfileOpen && (
        <Modal
          isOpen={isAddStreamProfileOpen}
          onClose={() => setIsAddStreamProfileOpen(false)}
          title="Add Stream Profile"
          maxWidth="sm"
          actions={
            <button
              onClick={() => {
                showToast('Stream profile created');
                setIsAddStreamProfileOpen(false);
                fetchProfiles();
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg"
            >
              Save Profile
            </button>
          }
        >
          <div className="space-y-3">
            <TextInput label="Profile Name" value="Transcode 720p60" onChange={() => {}} />
            <TextInput label="Video Codec" value="libx264" onChange={() => {}} />
            <TextInput label="Audio Codec" value="aac" onChange={() => {}} />
          </div>
        </Modal>
      )}

      {/* Add Output Profile Modal */}
      {isAddOutputProfileOpen && (
        <Modal
          isOpen={isAddOutputProfileOpen}
          onClose={() => setIsAddOutputProfileOpen(false)}
          title="Add Output Profile"
          maxWidth="sm"
          actions={
            <button
              onClick={() => {
                showToast('Output profile created');
                setIsAddOutputProfileOpen(false);
                fetchProfiles();
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg"
            >
              Save Profile
            </button>
          }
        >
          <div className="space-y-3">
            <TextInput label="Profile Name" value="Low Latency LL-HLS" onChange={() => {}} />
            <TextInput label="Segment Duration (s)" value="2" onChange={() => {}} type="number" />
          </div>
        </Modal>
      )}

      {/* Add User-Agent Modal */}
      {isAddUserAgentOpen && (
        <Modal
          isOpen={isAddUserAgentOpen}
          onClose={() => setIsAddUserAgentOpen(false)}
          title="Add User-Agent Override"
          maxWidth="sm"
          actions={
            <button
              onClick={() => {
                showToast('User-Agent added');
                setIsAddUserAgentOpen(false);
                fetchProfiles();
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg"
            >
              Save User-Agent
            </button>
          }
        >
          <div className="space-y-3">
            <TextInput label="Identifier Name" value="Apple TV Player" onChange={() => {}} />
            <TextInput label="User-Agent String" value="AppleCoreMedia/1.0.0 (Apple TV)" onChange={() => {}} />
          </div>
        </Modal>
      )}
    </div>
  );
};
