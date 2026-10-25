import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Send,
  Edit2,
  Trash2,
  Webhook,
  MessageSquare,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { ConnectIntegration } from '../types/dispatcharr';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { TextInput, SelectField, SwitchRow, LoadingBox, EmptyBox } from '../components/common/FormControls';

export const ConnectScreen: React.FC = () => {
  const [integrations, setIntegrations] = useState<ConnectIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ConnectIntegration | null>(null);
  const [deletingItem, setDeletingItem] = useState<ConnectIntegration | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/connect/integrations/');
      setIntegrations(Array.isArray(data) ? data : []);
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleTest = async (item: ConnectIntegration) => {
    try {
      await api.post(`/api/connect/integrations/${item.id}/test/`);
      showToast(`Test webhook payload sent to "${item.name}"`);
    } catch (err: any) {
      alert(err.message || 'Test webhook delivery failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/api/connect/integrations/${deletingItem.id}/`);
      setIntegrations((prev) => prev.filter((i) => i.id !== deletingItem.id));
      showToast(`Deleted integration "${deletingItem.name}"`);
    } catch (err: any) {
      alert(err.message || 'Error deleting integration');
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
          <h1 className="text-xl font-bold text-white tracking-tight">Connect & Webhooks</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Send alerts to Discord, Slack, Telegram, Emby, and custom HTTP webhooks</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {loading ? (
        <LoadingBox message="Loading integrations..." />
      ) : integrations.length === 0 ? (
        <EmptyBox message="No webhooks or integrations configured" submessage="Connect Discord or Slack to receive real-time DVR and stream failure alerts." />
      ) : (
        <div className="space-y-3">
          {integrations.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
            >
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="font-semibold text-sm text-zinc-100">{item.name}</h4>
                  <Badge color="teal">{item.integration_type.toUpperCase()}</Badge>
                  {!item.enabled && <Badge color="red">Disabled</Badge>}
                </div>
                <div className="text-xs font-mono text-zinc-400 truncate max-w-lg">{item.url}</div>
                {item.events && item.events.length > 0 && (
                  <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                    <span className="text-[11px] text-zinc-500">Events:</span>
                    {item.events.map((ev) => (
                      <span key={ev} className="text-[10px] text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                        {ev}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleTest(item)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition"
                  title="Send Test Event"
                >
                  <Send className="w-3.5 h-3.5 text-teal-400" />
                  Test
                </button>
                <button
                  onClick={() => setEditingItem(item)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                  title="Edit Integration"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeletingItem(item)}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                  title="Delete Integration"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Integration Modal */}
      {(isModalOpen || editingItem) && (
        <IntegrationModal
          item={editingItem}
          isOpen={isModalOpen || !!editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingItem(null);
            showToast('Integration saved successfully');
            fetchIntegrations();
          }}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Delete Integration"
        message={`Delete webhook integration "${deletingItem?.name}"?`}
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeletingItem(null)}
      />
    </div>
  );
};

const IntegrationModal: React.FC<{
  item: ConnectIntegration | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ item, isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState<any>(item?.integration_type || 'discord');
  const [url, setUrl] = useState(item?.url || '');
  const [enabled, setEnabled] = useState(item?.enabled !== false);
  const [events, setEvents] = useState<string[]>(
    item?.events || ['recording_started', 'recording_completed', 'server_error']
  );

  const availableEvents = [
    { key: 'recording_started', label: 'DVR: Recording Started' },
    { key: 'recording_completed', label: 'DVR: Recording Completed' },
    { key: 'recording_failed', label: 'DVR: Recording Failed' },
    { key: 'guide_refreshed', label: 'EPG: Program Guide Refreshed' },
    { key: 'server_error', label: 'System: Stream / Server Errors' },
  ];

  const toggleEvent = (key: string) => {
    setEvents((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      integration_type: type,
      url,
      events,
      enabled,
    };
    try {
      if (item) {
        await api.patch(`/api/connect/integrations/${item.id}/`, payload);
      } else {
        await api.post('/api/connect/integrations/', payload);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error saving integration');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Integration' : 'Add Integration'}
      subtitle="Configure webhook target and event subscriptions"
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
            Save Integration
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Integration Name" value={name} onChange={setName} placeholder="e.g. Discord Lab Alerts" required />
        <SelectField
          label="Integration Platform"
          value={type}
          onChange={setType}
          options={[
            { value: 'discord', label: 'Discord Webhook' },
            { value: 'telegram', label: 'Telegram Bot' },
            { value: 'slack', label: 'Slack Webhook' },
            { value: 'emby', label: 'Emby Media Server' },
            { value: 'webhook', label: 'Custom HTTP Webhook' },
          ]}
        />
        <TextInput label="Webhook URL" value={url} onChange={setUrl} placeholder="https://..." required />

        <div className="space-y-2 pt-2 border-t border-zinc-700/60">
          <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block">
            Subscribed Events
          </label>
          <div className="space-y-1.5">
            {availableEvents.map((ev) => (
              <label
                key={ev.key}
                className="flex items-center gap-2.5 text-xs text-zinc-300 cursor-pointer p-2 rounded hover:bg-zinc-900 transition"
              >
                <input
                  type="checkbox"
                  checked={events.includes(ev.key)}
                  onChange={() => toggleEvent(ev.key)}
                  className="rounded border-zinc-700 bg-zinc-900 text-teal-600 focus:ring-teal-500"
                />
                <span>{ev.label}</span>
              </label>
            ))}
          </div>
        </div>

        <SwitchRow label="Enabled" checked={enabled} onChange={setEnabled} />
      </form>
    </Modal>
  );
};
