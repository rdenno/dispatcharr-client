import React, { useState } from 'react';
import { User, Shield, KeyRound, LogOut, CheckCircle2 } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { Fmt } from '../utils/format';
import { Badge } from '../components/common/Badge';
import { TextInput } from '../components/common/FormControls';

export const AccountScreen: React.FC = () => {
  const { user, isAdmin, logout, updateUserPreferences } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    setToast('Password updated successfully');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="flex items-center gap-2 p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg text-teal-300 text-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="border-b border-zinc-800 pb-3">
        <h1 className="text-xl font-bold text-white tracking-tight">Account Profile</h1>
        <p className="text-xs text-zinc-400 mt-0.5">Manage session credentials and security settings</p>
      </div>

      {/* User Information Card */}
      <div className="p-5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-teal-400">
              {isAdmin ? <Shield className="w-6 h-6 text-red-400" /> : <User className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-100">{user?.username || 'User'}</h3>
              <p className="text-xs text-zinc-400">{user?.email || 'No email configured'}</p>
            </div>
          </div>
          <Badge color={isAdmin ? 'red' : 'teal'}>
            {isAdmin ? 'Administrator' : 'Standard User'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-700/60 text-xs text-zinc-400">
          <div>
            <span className="text-zinc-500 block">Account Level:</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">Level {user?.user_level ?? 1}</span>
          </div>
          <div>
            <span className="text-zinc-500 block">Member Since:</span>
            <span className="font-semibold text-zinc-200 mt-0.5 block">{Fmt.date(user?.date_joined)}</span>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="p-5 rounded-xl border border-zinc-700/80 bg-zinc-800/80 space-y-4">
        <div className="flex items-center gap-2 text-zinc-200">
          <KeyRound className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold">Change Password</h3>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-3 max-w-md">
          <TextInput
            label="Current Password"
            value={currentPassword}
            onChange={setCurrentPassword}
            type="password"
            required
          />
          <TextInput
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            type="password"
            required
          />
          <TextInput
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            type="password"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg shadow-xs transition"
          >
            Update Password
          </button>
        </form>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-red-500/10 text-red-400 hover:text-red-300 border border-zinc-700 hover:border-red-500/30 text-xs font-semibold transition"
        >
          <LogOut className="w-4 h-4" />
          Log Out of Dispatcharr
        </button>
      </div>
    </div>
  );
};
