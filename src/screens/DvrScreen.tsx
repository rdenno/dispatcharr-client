import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Play,
  StopCircle,
  Clock,
  FastForward,
  Trash2,
  Disc3,
  Calendar,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { Recording, RecurringRule } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import {
  SearchField,
  TextInput,
  SelectField,
  LoadingBox,
  EmptyBox,
} from '../components/common/FormControls';

export const DvrScreen: React.FC = () => {
  const { channelGroups, openPlayer, canManageDvr } = useSession();
  const [activeTab, setActiveTab] = useState<'recordings' | 'rules'>('recordings');

  // Recordings
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState<Array<{ id: number; name: string }>>([]);

  // Recurring rules
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);

  // Modals & messages
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [deletingRec, setDeletingRec] = useState<Recording | null>(null);
  const [deletingRule, setDeletingRule] = useState<RecurringRule | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRecordings = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? { search } : undefined;
      const data = await api.get('/api/channels/recordings/', q);
      setRecordings(Array.isArray(data) ? data : []);
    } catch {
      setRecordings([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const data = await api.get('/api/channels/recurring-rules/');
      setRules(Array.isArray(data) ? data : []);
    } catch {
      setRules([]);
    } finally {
      setRulesLoading(false);
    }
  }, []);

  useEffect(() => {
    // Also fetch channel names for dropdown
    api.get('/api/channels/channels/').then((list) => {
      if (Array.isArray(list)) {
        setChannels(list.map((c) => ({ id: c.id, name: c.name })));
      }
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'recordings') fetchRecordings();
    else fetchRules();
  }, [activeTab, fetchRecordings, fetchRules]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const handleExtend = async (rec: Recording) => {
    try {
      await api.post(`/api/channels/recordings/${rec.id}/extend/`, { extra_minutes: 15 });
      showToast(`Extended "${rec.title}" by 15 minutes`);
      fetchRecordings();
    } catch (err: any) {
      alert(err.message || 'Error extending recording');
    }
  };

  const handleComskip = async (rec: Recording) => {
    try {
      await api.post(`/api/channels/recordings/${rec.id}/comskip/`);
      showToast(`Comskip commercial detection queued for "${rec.title}"`);
    } catch (err: any) {
      alert(err.message || 'Error starting Comskip');
    }
  };

  const handleStop = async (rec: Recording) => {
    try {
      await api.post(`/api/channels/recordings/${rec.id}/stop/`);
      showToast(`Stopped recording "${rec.title}"`);
      fetchRecordings();
    } catch (err: any) {
      alert(err.message || 'Error stopping recording');
    }
  };

  const handleDeleteRecording = async () => {
    if (!deletingRec) return;
    try {
      await api.delete(`/api/channels/recordings/${deletingRec.id}/`);
      setRecordings((prev) => prev.filter((r) => r.id !== deletingRec.id));
      showToast('Recording deleted');
    } catch (err: any) {
      alert(err.message || 'Error deleting recording');
    }
  };

  const handleDeleteRule = async () => {
    if (!deletingRule) return;
    try {
      await api.delete(`/api/channels/recurring-rules/${deletingRule.id}/`);
      setRules((prev) => prev.filter((r) => r.id !== deletingRule.id));
      showToast('Recurring series rule deleted');
    } catch (err: any) {
      alert(err.message || 'Error deleting rule');
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
          <h1 className="text-xl font-bold text-white tracking-tight">DVR Manager</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            {activeTab === 'recordings'
              ? 'Recorded, in-progress, and scheduled broadcasts'
              : 'Series recording schedules & recurring rules'}
          </p>
        </div>

        <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700">
          <button
            onClick={() => setActiveTab('recordings')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'recordings' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Recordings ({recordings.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              activeTab === 'rules' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Series Rules ({rules.length})
          </button>
        </div>
      </div>

      {activeTab === 'recordings' ? (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex items-center gap-3 flex-wrap justify-between">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search recordings by title or channel..."
              className="max-w-md"
            />

            {canManageDvr && (
              <button
                onClick={() => setIsRecordModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Schedule Recording
              </button>
            )}
          </div>

          {/* Recordings List */}
          {loading ? (
            <LoadingBox message="Loading DVR recordings..." />
          ) : recordings.length === 0 ? (
            <EmptyBox message="No recordings found" submessage="Schedule programs from the TV Guide or set recurring rules." />
          ) : (
            <div className="space-y-3">
              {recordings.map((rec) => {
                const statusColor = {
                  recording: 'red',
                  scheduled: 'orange',
                  upcoming: 'orange',
                  completed: 'green',
                  failed: 'red',
                }[rec.status.toLowerCase()] as any || 'blue';

                return (
                  <div
                    key={rec.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="font-semibold text-sm text-zinc-100 truncate">{rec.title}</h4>
                        <Badge color={statusColor}>
                          {rec.status === 'recording' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-ping mr-1" />}
                          {rec.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                        <span className="text-teal-400 font-medium">{rec.channel_name || 'IPTV Channel'}</span>
                        <span>•</span>
                        <span>{Fmt.dateTime(rec.start_time)}</span>
                        {rec.file_size && (
                          <>
                            <span>•</span>
                            <span className="text-zinc-500">{Fmt.bytes(rec.file_size)}</span>
                          </>
                        )}
                      </div>

                      {rec.comskip_status && (
                        <div className="text-[11px] text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded border border-zinc-800 inline-block">
                          {rec.comskip_status}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.file_url && (
                        <button
                          onClick={() => openPlayer(rec.file_url!, rec.title, false)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition shadow-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Play
                        </button>
                      )}

                      {canManageDvr && (
                        <>
                          {rec.status === 'recording' && (
                            <>
                              <button
                                onClick={() => handleExtend(rec)}
                                className="p-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition"
                                title="Extend +15 Minutes"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStop(rec)}
                                className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition"
                                title="Stop Recording"
                              >
                                <StopCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {rec.status === 'completed' && (
                            <button
                              onClick={() => handleComskip(rec)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-700 transition"
                              title="Run Comskip Commercial Detection"
                            >
                              <FastForward className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => setDeletingRec(rec)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                            title="Delete Recording"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Recurring Rules Tab */
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="text-xs text-zinc-400">
              Rules automatically scan electronic program guides and schedule recurring episodes.
            </div>
            {canManageDvr && (
              <button
                onClick={() => setIsRuleModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-4 h-4" />
                Add Recurring Rule
              </button>
            )}
          </div>

          {rulesLoading ? (
            <LoadingBox message="Loading recurring recording rules..." />
          ) : rules.length === 0 ? (
            <EmptyBox message="No recurring rules" submessage="Create rules to automate recording TV series and sports." />
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-zinc-100">{rule.title}</h4>
                      <Badge color="blue">{rule.match_type.toUpperCase()}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-400 flex-wrap">
                      <span className="text-teal-400">{rule.channel_name || 'Any Channel'}</span>
                      <span>•</span>
                      <span>Days: {rule.days_of_week?.join(', ') || 'All Days'}</span>
                      {rule.keep_limit && (
                        <>
                          <span>•</span>
                          <span>Keep latest {rule.keep_limit} episodes</span>
                        </>
                      )}
                    </div>
                  </div>

                  {canManageDvr && (
                    <button
                      onClick={() => setDeletingRule(rule)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Schedule Recording Modal */}
      {isRecordModalOpen && (
        <ScheduleRecordingModal
          isOpen={isRecordModalOpen}
          channels={channels}
          onClose={() => setIsRecordModalOpen(false)}
          onSuccess={() => {
            setIsRecordModalOpen(false);
            showToast('Scheduled recording created');
            fetchRecordings();
          }}
        />
      )}

      {/* Add Recurring Rule Modal */}
      {isRuleModalOpen && (
        <CreateRuleModal
          isOpen={isRuleModalOpen}
          channels={channels}
          onClose={() => setIsRuleModalOpen(false)}
          onSuccess={() => {
            setIsRuleModalOpen(false);
            showToast('Recurring series rule created');
            fetchRules();
          }}
        />
      )}

      {/* Delete Recording Confirm */}
      <ConfirmModal
        isOpen={!!deletingRec}
        title="Delete Recording"
        message={`Delete recording "${deletingRec?.title}" and associated media files?`}
        confirmText="Delete Recording"
        destructive
        onConfirm={handleDeleteRecording}
        onCancel={() => setDeletingRec(null)}
      />

      {/* Delete Rule Confirm */}
      <ConfirmModal
        isOpen={!!deletingRule}
        title="Delete Recurring Rule"
        message={`Delete rule "${deletingRule?.title}"? Future episodes will no longer be scheduled.`}
        confirmText="Delete Rule"
        destructive
        onConfirm={handleDeleteRule}
        onCancel={() => setDeletingRule(null)}
      />
    </div>
  );
};

const ScheduleRecordingModal: React.FC<{
  isOpen: boolean;
  channels: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, channels, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [channelId, setChannelId] = useState<number>(channels[0]?.id || 101);
  const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
  const [durationMin, setDurationMin] = useState('60');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const start = new Date(startTime).toISOString();
    const end = new Date(new Date(startTime).getTime() + (parseInt(durationMin) || 60) * 60000).toISOString();
    try {
      await api.post('/api/channels/recordings/', {
        title,
        channel_id: channelId,
        start_time: start,
        end_time: end,
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error scheduling recording');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Recording"
      subtitle="Manually program a DVR recording slot"
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
            Create Recording
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Broadcast Title" value={title} onChange={setTitle} placeholder="e.g. World Cup Final" required />
        <SelectField
          label="Channel"
          value={channelId}
          onChange={setChannelId}
          options={channels.map((c) => ({ value: c.id, label: c.name }))}
        />
        <TextInput label="Start Time (Local)" value={startTime} onChange={setStartTime} type="datetime-local" required />
        <TextInput label="Duration (Minutes)" value={durationMin} onChange={setDurationMin} type="number" required />
      </form>
    </Modal>
  );
};

const CreateRuleModal: React.FC<{
  isOpen: boolean;
  channels: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, channels, onClose, onSuccess }) => {
  const [title, setTitle] = useState('');
  const [channelId, setChannelId] = useState<number | null>(null);
  const [matchType, setMatchType] = useState<'series' | 'title' | 'exact'>('series');
  const [keepLimit, setKeepLimit] = useState('5');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/channels/recurring-rules/', {
        title,
        channel_id: channelId,
        match_type: matchType,
        keep_limit: parseInt(keepLimit) || 5,
        days_of_week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      });
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error creating rule');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Recurring Rule"
      subtitle="Automate recordings whenever matching series air"
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
            Save Rule
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Series / Program Match Keyword" value={title} onChange={setTitle} placeholder="e.g. Formula 1" required />
        <SelectField
          label="Restrict to Channel (Optional)"
          value={channelId}
          onChange={setChannelId}
          options={channels.map((c) => ({ value: c.id, label: c.name }))}
          noneLabel="Any Channel"
        />
        <SelectField
          label="Match Type"
          value={matchType}
          onChange={setMatchType}
          options={[
            { value: 'series', label: 'Series Broadcast Match' },
            { value: 'title', label: 'Title Contains Keyword' },
            { value: 'exact', label: 'Exact Title Match' },
          ]}
        />
        <TextInput label="Episode Retention Limit" value={keepLimit} onChange={setKeepLimit} type="number" description="Maximum number of recordings to retain before auto-deleting oldest." />
      </form>
    </Modal>
  );
};
