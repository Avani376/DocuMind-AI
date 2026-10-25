import { useState } from 'react';
import Orb from '../three/Orb';
import { api, setToken } from '../services/api';
import ThemeToggle from './ThemeToggle';

export default function Auth({
  onAuth,
  dark,
  onToggleTheme,
}: {
  onAuth: () => void;
  dark: boolean;
  onToggleTheme: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    if (mode === 'register' && !name.trim()) {
      setError('Enter your name to create an account.');
      return;
    }
    setBusy(true);

    try {
      const response =
        mode === 'login'
          ? await api.login(email, password)
          : await api.register(name, email, password);

      setToken(response.access_token);
      onAuth();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <ThemeToggle
        dark={dark}
        onToggle={onToggleTheme}
        className="welcome-theme-toggle"
      />
      <div className="auth-glow" />
      <div className="auth-card">
        <Orb small />
        <p className="eyebrow">YOUR DOCUMENTS. YOUR INTELLIGENCE.</p>
        <h1>
          DocuMind <em>AI</em>
        </h1>
        <p className="muted">A smarter way to explore what you know.</p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <input
              type="text"
              required
              maxLength={100}
              autoComplete="name"
              placeholder="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="error">{error}</p>}
          <button className="primary wide" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="switch">
          {mode === 'login'
            ? 'New to DocuMind?'
            : 'Already have an account?'}{' '}
          <button
            onClick={() =>
              setMode(mode === 'login' ? 'register' : 'login')
            }
          >
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </div>
      <span className="auth-foot">PRIVATE WORKSPACE · GROUNDED ANSWERS</span>
    </main>
  );
}
