import { useState, type FormEvent } from 'react';

import { saveConnection } from '../lib/connection';
import { useAdmin } from '../lib/admin';

export function Login() {
  const { signIn, connection, reconnect } = useAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="card stack" onSubmit={submit}>
        <img className="logo" src="./favicon-192.png" alt="Polymath" />
        <div className="center">
          <h1>Polymath Admin</h1>
          <p className="muted small">Sign in to {new URL(connection.url).host}</p>
        </div>
        <label className="field">
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error ? <div className="notice error">{error}</div> : null}
        <button className="btn primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="faint small center">
          Create your admin user in Supabase → Authentication → Users, then add it to the <code>admins</code> table (see
          docs/SETUP.md).
        </p>
        <button
          type="button"
          className="btn ghost small"
          onClick={() => {
            saveConnection({ demo: true });
            reconnect();
          }}>
          Use demo mode instead
        </button>
      </form>
    </div>
  );
}

export function NotAdmin() {
  const { session, signOut } = useAdmin();
  const sql = `insert into public.admins (user_id) values ('${session?.user.id}');`;
  return (
    <div className="login">
      <div className="card stack">
        <h2>Almost there</h2>
        <p className="muted">
          You’re signed in as <b>{session?.user.email}</b>, but this account isn’t an admin yet. Run this in the
          Supabase SQL editor, then reload:
        </p>
        <pre className="snippet">{sql}</pre>
        <div className="row">
          <button className="btn primary" onClick={() => void navigator.clipboard.writeText(sql)}>
            Copy SQL
          </button>
          <button className="btn" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="btn ghost" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
