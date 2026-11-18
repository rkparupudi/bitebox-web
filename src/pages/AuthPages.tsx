import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../auth/AuthContext';
import { ErrorBanner } from '../components/ui';

/** The accounts created by `npm run seed` in the API. Shown only in local development. */
const DEMO = [
  { email: 'customer@bitebridge.dev', label: 'Customer' },
  { email: 'owner@bitebridge.dev', label: 'Restaurant owner' },
  { email: 'admin@bitebridge.dev', label: 'Admin' },
];

export function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;

  async function signIn(e: string, p: string) {
    setBusy(true);
    setError(null);
    try {
      const u = await login(e, p);
      navigate(from ?? homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form
        className="card auth-card stack"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          signIn(email, password);
        }}
      >
        <div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to order or manage your restaurant.</p>
        </div>
        <ErrorBanner error={error} />
        <label className="field">
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </label>
        <label className="field">
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="small muted">
          New here? <Link to="/register" style={{ color: 'var(--brand)' }}>Create an account</Link>
        </p>
        {import.meta.env.DEV && (
          <div>
            <hr className="sep" />
            <p className="small muted" style={{ marginTop: 10 }}>
              Local demo accounts (from <code>npm run seed</code>, password <code>password123</code>):
            </p>
            <div className="demo-logins">
              {DEMO.map((d) => (
                <button key={d.email} type="button" className="btn small" disabled={busy} onClick={() => signIn(d.email, 'password123')}>
                  Sign in as {d.label} <span className="muted">· {d.email}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'customer' as 'customer' | 'restaurant_owner' });
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={homeFor(user.role)} replace />;
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="auth-wrap">
      <form
        className="card auth-card stack"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const u = await register(form);
            navigate(homeFor(u.role), { replace: true });
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div>
          <h1>Create your account</h1>
          <p className="muted">Order food, or list your restaurant.</p>
        </div>
        <ErrorBanner error={error} />
        <div className="row">
          {(['customer', 'restaurant_owner'] as const).map((r) => (
            <button
              key={r}
              type="button"
              className={`btn block ${form.role === r ? 'primary' : ''}`}
              onClick={() => setForm({ ...form, role: r })}
            >
              {r === 'customer' ? 'I want to order' : 'I run a restaurant'}
            </button>
          ))}
        </div>
        <label className="field">
          Full name
          <input value={form.fullName} onChange={set('fullName')} required />
        </label>
        <label className="field">
          Email
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="field">
          Password <span className="muted small">(at least 8 characters)</span>
          <input type="password" value={form.password} onChange={set('password')} minLength={8} required />
        </label>
        <button className="btn primary block" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
        <p className="small muted">
          Already have an account? <Link to="/login" style={{ color: 'var(--brand)' }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
