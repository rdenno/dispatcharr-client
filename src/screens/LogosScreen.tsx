import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Sparkles, Trash2, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { ChannelLogo } from '../types/dispatcharr';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { SearchField, TextInput, LoadingBox, EmptyBox } from '../components/common/FormControls';

export const LogosScreen: React.FC = () => {
  const [logos, setLogos] = useState<ChannelLogo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadUrl, setUploadUrl] = useState('');
  const [deletingLogo, setDeletingLogo] = useState<ChannelLogo | null>(null);
  const [isCleanupOpen, setIsCleanupOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchLogos = useCallback(async () => {
    setLoading(true);
    try {
      const q = search ? { search } : undefined;
      const data = await api.get('/api/channels/logos/', q);
      setLogos(Array.isArray(data) ? data : []);
    } catch {
      setLogos([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchLogos();
  }, [fetchLogos]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/channels/logos/upload/', {
        name: uploadName,
        url: uploadUrl,
      });
      setIsUploadOpen(false);
      setUploadName('');
      setUploadUrl('');
      showToast('Logo uploaded successfully');
      fetchLogos();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  const handleCleanup = async () => {
    try {
      await api.post('/api/channels/logos/cleanup/', { delete_files: true });
      setIsCleanupOpen(false);
      showToast('Unassigned logos removed from disk');
      fetchLogos();
    } catch (err: any) {
      alert(err.message || 'Cleanup failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingLogo) return;
    try {
      await api.delete(`/api/channels/logos/${deletingLogo.id}/`);
      setLogos((prev) => prev.filter((l) => l.id !== deletingLogo.id));
      showToast('Logo deleted');
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
          <h1 className="text-xl font-bold text-white tracking-tight">Logo Manager</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage station logos, upload custom branding, and clean up orphaned images</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCleanupOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-medium border border-zinc-700 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Cleanup Unused
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Logo
          </button>
        </div>
      </div>

      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search logos by name..."
        className="max-w-md"
      />

      {loading ? (
        <LoadingBox message="Loading station logos..." />
      ) : logos.length === 0 ? (
        <EmptyBox message="No logos found" submessage="Upload SVG or PNG station logos to map them to IPTV channels." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {logos.map((logo) => (
            <div
              key={logo.id}
              className="flex flex-col justify-between p-3.5 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition group"
            >
              <div className="aspect-square w-full rounded-lg bg-zinc-900 border border-zinc-700/60 p-4 flex items-center justify-center overflow-hidden">
                <img src={logo.url} alt={logo.name} className="max-w-full max-h-full object-contain" />
              </div>

              <div className="mt-3 space-y-1">
                <h4 className="font-semibold text-xs text-zinc-200 truncate" title={logo.name}>
                  {logo.name}
                </h4>
                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{(logo.channel_count || 0)} mapped</span>
                  {logo.file_size && <span>{Fmt.bytes(logo.file_size)}</span>}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-700/50 flex justify-end">
                <button
                  onClick={() => setDeletingLogo(logo)}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                  title="Delete Logo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Logo Modal */}
      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          title="Upload Channel Logo"
          subtitle="Add image asset to station branding library"
          maxWidth="sm"
          actions={
            <>
              <button type="button" onClick={() => setIsUploadOpen(false)} className="px-4 py-2 text-sm text-zinc-300 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpload}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg shadow-xs"
              >
                Upload
              </button>
            </>
          }
        >
          <form onSubmit={handleUpload} className="space-y-4">
            <TextInput label="Logo Filename" value={uploadName} onChange={setUploadName} placeholder="e.g. bbc_news_hd.png" required />
            <TextInput label="Image URL or Base64" value={uploadUrl} onChange={setUploadUrl} placeholder="https://..." required />
          </form>
        </Modal>
      )}

      {/* Cleanup Confirmation */}
      <ConfirmModal
        isOpen={isCleanupOpen}
        title="Cleanup Unused Logos"
        message="Remove all station logos that are not currently linked to any active IPTV channel? This frees up local disk storage."
        confirmText="Run Cleanup"
        destructive
        onConfirm={handleCleanup}
        onCancel={() => setIsCleanupOpen(false)}
      />

      {/* Delete Logo Confirmation */}
      <ConfirmModal
        isOpen={!!deletingLogo}
        title="Delete Logo"
        message={`Delete "${deletingLogo?.name}" from station logo storage?`}
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeletingLogo(null)}
      />
    </div>
  );
};
