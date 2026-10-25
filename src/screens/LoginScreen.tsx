import React, { useState, useEffect } from 'react';
import { Tv, Server, Key, User, ArrowRight, Sparkles, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSession } from '../context/SessionContext';
import { api } from '../services/api';
import { TextInput, SwitchRow } from '../components/common/FormControls';

export const LoginScreen: React.FC = () => {
  const { login, setDemoMode, serverUrl } = useSession();
  const [server, setServer] = useState(serverUrl || 'http://localhost:8000');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [email, setEmail] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuperuserMode, setIsSuperuserMode] = useState(false);

  useEffect(() => {
    // Check if superuser already exists
    if (server) {
      api.checkSuperuserStatus().then((status) => {
        if (status.superuser_exists === false) {
          setIsSuperuserMode(true);
        }
      });
    }
  }, [server]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSuperuserMode) {
        api.serverUrl = server;
        await api.initializeSuperuser({ username, password, email });
        setIsSuperuserMode(false);
      }
      await login(server, username, password);
    } catch (err: any) {
      setError(err.message || 'Connection failed. Ensure Dispatcharr server is running.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemoMode = () => {
    setDemoMode(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl">
            <img src="/logo.png" alt="Dispatcharr Logo" className="w-12 h-12 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dispatcharr</h1>
          <p className="text-xs text-zinc-400">
            {isSuperuserMode
              ? 'First-Time Setup: Initialize Superuser Account'
              : 'Connect to your self-hosted Dispatcharr IPTV server'}
          </p>
        </div>

        {/* Card */}
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <TextInput
              label="Dispatcharr Server URL"
              value={server}
              onChange={setServer}
              placeholder="http://192.168.1.100:8000"
              required
              description="IPTV Dispatcharr backend endpoint address."
            />

            <TextInput
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="admin"
              required
            />

            {isSuperuserMode && (
              <TextInput
                label="Superuser Email"
                value={email}
                onChange={setEmail}
                placeholder="admin@dispatcharr.local"
                type="email"
                required
              />
            )}

            <TextInput
              label="Password"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••••••"
              required
            />

            <div className="pt-1">
              <button
                type="submit"
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition disabled:opacity-50"
              >
                {busy ? (
                  <span>Connecting...</span>
                ) : (
                  <>
                    <span>{isSuperuserMode ? 'Create Superuser & Log In' : 'Connect & Log In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Standalone Demo Mode Button */}
          <div className="pt-2 border-t border-zinc-800 text-center">
            <button
              onClick={handleDemoMode}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-700/80 transition shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Explore with Demo IPTV Data (Instant Standalone)
            </button>
            <p className="text-[11px] text-zinc-500 mt-2">
              Explore channels, TV Guide, DVR, VOD, and stats with pre-loaded mock data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
