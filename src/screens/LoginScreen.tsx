import { useState, type FormEvent } from 'react';
import { login } from '../api/client';

export default function LoginScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(username.trim(), password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pt-safe flex min-h-full flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <img src="/m/icon-192.png" alt="" className="mx-auto mb-4 h-16 w-16 rounded-2xl" />
        <h1 className="mb-1 text-center text-2xl font-semibold">Dispatcharr</h1>
        <p className="mb-8 text-center text-sm text-muted">Sign in with your Dispatcharr account</p>
        <form onSubmit={submit} className="space-y-3">
          <input
            className="field"
            placeholder="Username"
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="field"
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full rounded-xl bg-accent py-3 font-semibold text-black disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
