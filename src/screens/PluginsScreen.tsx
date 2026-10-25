import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Download,
  RotateCw,
  Settings,
  Trash2,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { PluginItem } from '../types/dispatcharr';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SwitchRow, LoadingBox, EmptyBox } from '../components/common/FormControls';

export const PluginsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');
  const [plugins, setPlugins] = useState<PluginItem[]>([]);
  const [dirPlugins, setDirPlugins] = useState<PluginItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [configuringPlugin, setConfiguringPlugin] = useState<PluginItem | null>(null);
  const [deletingPlugin, setDeletingPlugin] = useState<PluginItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [installed, browse] = await Promise.all([
        api.get('/api/plugins/plugins/'),
        api.get('/api/plugins/directory/'),
      ]);
      setPlugins(Array.isArray(installed) ? installed : []);
      setDirPlugins(Array.isArray(browse) ? browse : []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggle = async (p: PluginItem) => {
    try {
      await api.post(`/api/plugins/plugins/${p.key}/enabled/`, { enabled: !p.enabled });
      setPlugins((prev) => prev.map((item) => (item.key === p.key ? { ...item, enabled: !p.enabled } : item)));
      showToast(`${p.name} ${!p.enabled ? 'enabled' : 'disabled'}`);
    } catch (err: any) {
      alert(err.message || 'Error toggling plugin');
    }
  };

  const handleReload = async () => {
    try {
      await api.post('/api/plugins/plugins/reload/');
      showToast('Plugins reloaded successfully');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Reload failed');
    }
  };

  const handleInstall = async (p: PluginItem) => {
    try {
      await api.post('/api/plugins/plugins/install/', { key: p.key });
      showToast(`Installed plugin "${p.name}"`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Install failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingPlugin) return;
    try {
      await api.delete(`/api/plugins/plugins/${deletingPlugin.key}/delete/`);
      setPlugins((prev) => prev.filter((item) => item.key !== deletingPlugin.key));
      showToast(`Uninstalled "${deletingPlugin.name}"`);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Uninstall failed');
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
          <h1 className="text-xl font-bold text-white tracking-tight">Plugins & Extensions</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Extend Dispatcharr with transcoders, cleaners, and automation plugins</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs border border-zinc-700 transition"
          >
            <RotateCw className="w-3.5 h-3.5 text-teal-400" />
            Reload Plugins
          </button>

          <div className="flex items-center bg-zinc-800 p-1 rounded-lg border border-zinc-700">
            <button
              onClick={() => setActiveTab('installed')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'installed' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              My Plugins ({plugins.length})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                activeTab === 'browse' ? 'bg-teal-600 text-white shadow-xs' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Directory ({dirPlugins.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingBox message="Loading plugins..." />
      ) : activeTab === 'installed' ? (
        plugins.length === 0 ? (
          <EmptyBox message="No plugins installed" submessage="Explore the directory to install commercial detection or transcoding extensions." />
        ) : (
          <div className="space-y-3">
            {plugins.map((p) => (
              <div
                key={p.key}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-semibold text-sm text-zinc-100">{p.name}</h4>
                    <Badge color="teal">v{p.version}</Badge>
                    {!p.enabled && <Badge color="red">Disabled</Badge>}
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">{p.description}</p>
                  <div className="text-[11px] text-zinc-500">Author: {p.author || 'Community'}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={p.enabled}
                    onClick={() => handleToggle(p)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      p.enabled ? 'bg-teal-600' : 'bg-zinc-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        p.enabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <button
                    onClick={() => setConfiguringPlugin(p)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                    title="Plugin Configuration"
                  >
                    <Settings className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setDeletingPlugin(p)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                    title="Uninstall Plugin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Directory Tab */
        dirPlugins.length === 0 ? (
          <EmptyBox message="No community plugins available" submessage="All directory plugins are currently installed." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dirPlugins.map((p) => (
              <div
                key={p.key}
                className="flex flex-col justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-zinc-100">{p.name}</h4>
                    <Badge color="zinc">v{p.version}</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">{p.description}</p>
                  <div className="text-[11px] text-zinc-500">Author: {p.author || 'Community'}</div>
                </div>

                <div className="pt-2 border-t border-zinc-700/50 flex justify-end">
                  <button
                    onClick={() => handleInstall(p)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Install Plugin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Plugin Settings Modal */}
      {configuringPlugin && (
        <Modal
          isOpen={!!configuringPlugin}
          onClose={() => setConfiguringPlugin(null)}
          title={`${configuringPlugin.name} Settings`}
          subtitle="Configure runtime options and integration flags"
          maxWidth="md"
          actions={
            <button
              onClick={() => {
                showToast('Plugin settings saved');
                setConfiguringPlugin(null);
              }}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg"
            >
              Save Configuration
            </button>
          }
        >
          <div className="space-y-4">
            <SwitchRow label="Enable Diagnostic Logging" checked={true} onChange={() => {}} />
            <SwitchRow label="Execute on DVR Task Triggers" checked={true} onChange={() => {}} />
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-400">
              plugin_version: {configuringPlugin.version}
              <br />
              plugin_key: {configuringPlugin.key}
              <br />
              status: active
            </div>
          </div>
        </Modal>
      )}

      {/* Uninstall Confirmation */}
      <ConfirmModal
        isOpen={!!deletingPlugin}
        title="Uninstall Plugin"
        message={`Are you sure you want to uninstall "${deletingPlugin?.name}"?`}
        confirmText="Uninstall"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeletingPlugin(null)}
      />
    </div>
  );
};
