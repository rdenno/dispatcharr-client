import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  Key,
  Edit2,
  Trash2,
  Shield,
  User as UserIcon,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types/dispatcharr';
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

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [generatedKey, setGeneratedKey] = useState<{ user: User; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/accounts/users/');
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleGenerateKey = async (u: User) => {
    try {
      const res = await api.post(`/api/accounts/users/${u.id}/api-key/`);
      setGeneratedKey({ user: u, key: res.api_key || 'disp_' + Math.random().toString(36).substring(2) });
      setCopied(false);
    } catch (err: any) {
      alert(err.message || 'Error generating key');
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.delete(`/api/accounts/users/${deletingUser.id}/`);
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      showToast(`User "${deletingUser.username}" removed`);
    } catch (err: any) {
      alert(err.message || 'Error deleting user');
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
          <h1 className="text-xl font-bold text-white tracking-tight">User Management</h1>
          <p className="text-xs text-zinc-400 mt-0.5">Manage user credentials, permission levels, and client API tokens</p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {loading ? (
        <LoadingBox message="Loading users..." />
      ) : users.length === 0 ? (
        <EmptyBox message="No users found" />
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const role = u.user_level >= 10 ? 'Admin' : u.user_level >= 1 ? 'Standard User' : 'Streamer';
            const roleColor = u.user_level >= 10 ? 'red' : u.user_level >= 1 ? 'teal' : 'zinc';

            return (
              <div
                key={u.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-zinc-700/80 bg-zinc-800/70 hover:bg-zinc-800 transition gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0 text-zinc-400">
                    {u.user_level >= 10 ? <Shield className="w-5 h-5 text-red-400" /> : <UserIcon className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-zinc-100">{u.username}</h4>
                      <Badge color={roleColor}>{role}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
                      {u.email && <span>{u.email}</span>}
                      {u.last_login && <span>Last Login: {Fmt.relative(u.last_login)}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleGenerateKey(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition"
                    title="Generate API Key"
                  >
                    <Key className="w-3.5 h-3.5 text-teal-400" />
                    API Key
                  </button>
                  <button
                    onClick={() => setEditingUser(u)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition"
                    title="Edit User"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {u.user_level < 10 && (
                    <button
                      onClick={() => setDeletingUser(u)}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-700 transition"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit User Modal */}
      {(isCreateOpen || editingUser) && (
        <UserFormModal
          user={editingUser}
          isOpen={isCreateOpen || !!editingUser}
          onClose={() => {
            setIsCreateOpen(false);
            setEditingUser(null);
          }}
          onSuccess={() => {
            setIsCreateOpen(false);
            setEditingUser(null);
            showToast('User saved successfully');
            fetchUsers();
          }}
        />
      )}

      {/* Generated API Key Modal */}
      {generatedKey && (
        <Modal
          isOpen={!!generatedKey}
          onClose={() => setGeneratedKey(null)}
          title="Generated API Key"
          subtitle={`Access token for ${generatedKey.user.username}`}
          maxWidth="sm"
        >
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              Use this bearer key to authenticate external players (TiviMate, Kodi, VLC, Emby, etc.) with Dispatcharr:
            </p>
            <div className="p-3 bg-zinc-950 border border-zinc-700 rounded-lg flex items-center justify-between gap-2 font-mono text-xs text-teal-400 break-all select-all">
              <span>{generatedKey.key}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey.key);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="p-1.5 rounded hover:bg-zinc-800 text-zinc-300 hover:text-white transition shrink-0"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation */}
      <ConfirmModal
        isOpen={!!deletingUser}
        title="Delete User"
        message={`Delete user account "${deletingUser?.username}"? Their active streaming sessions will be terminated.`}
        confirmText="Delete User"
        destructive
        onConfirm={handleDeleteUser}
        onCancel={() => setDeletingUser(null)}
      />
    </div>
  );
};

const UserFormModal: React.FC<{
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ user, isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [level, setLevel] = useState(user?.user_level ?? 1);
  const [dvrAccess, setDvrAccess] = useState<'manage' | 'view' | 'none'>(
    user?.custom_properties?.dvr_access || 'view'
  );
  const [vodMovies, setVodMovies] = useState(user?.custom_properties?.vod_movies_enabled !== false);
  const [vodSeries, setVodSeries] = useState(user?.custom_properties?.vod_series_enabled !== false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      username,
      email,
      user_level: level,
      ...(password ? { password } : {}),
      custom_properties: {
        ...(user?.custom_properties || {}),
        dvr_access: dvrAccess,
        vod_movies_enabled: vodMovies,
        vod_series_enabled: vodSeries,
      },
    };
    try {
      if (user) {
        await api.patch(`/api/accounts/users/${user.id}/`, payload);
      } else {
        await api.post('/api/accounts/users/', payload);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Error saving user');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user ? 'Edit User' : 'Add User'}
      subtitle="Configure credentials and granular access controls"
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
            Save User
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextInput label="Username" value={username} onChange={setUsername} required />
        <TextInput
          label={user ? 'New Password (Optional)' : 'Password'}
          value={password}
          onChange={setPassword}
          type="password"
          required={!user}
        />
        <TextInput label="Email Address" value={email} onChange={setEmail} type="email" />
        <SelectField
          label="Account Role & Level"
          value={level}
          onChange={setLevel}
          options={[
            { value: 10, label: 'Admin (Full Management & System Settings)' },
            { value: 1, label: 'Standard User (Streaming & Guide Access)' },
            { value: 0, label: 'Streamer (Stream Only, No WebUI Access)' },
          ]}
        />

        {level < 10 && (
          <div className="pt-2 border-t border-zinc-700/60 space-y-3">
            <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Granular Permissions</span>
            <SelectField
              label="DVR Access"
              value={dvrAccess}
              onChange={setDvrAccess}
              options={[
                { value: 'manage', label: 'Full DVR Management (Schedule & Delete)' },
                { value: 'view', label: 'View Only (Watch Completed Recordings)' },
                { value: 'none', label: 'No DVR Access' },
              ]}
            />
            <SwitchRow label="VOD Movies Enabled" checked={vodMovies} onChange={setVodMovies} />
            <SwitchRow label="VOD Series Enabled" checked={vodSeries} onChange={setVodSeries} />
          </div>
        )}
      </form>
    </Modal>
  );
};
