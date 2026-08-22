import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Button, ErrorNote, Field, Input } from './components/ui';
import { apiError } from '../lib/useApi';

const Login = () => {
  const { login, isAuthed } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (isAuthed) {
    return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(form.username.trim(), form.password);
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (caught) {
      setError(
        caught?.response?.status === 401
          ? 'That username and password did not match. Check both and try again.'
          : apiError(caught)
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      <div className="flex flex-1 items-center justify-center px-5 py-24">
        <div className="w-full max-w-sm">
          <div className="mb-10">
            <span className="eyebrow">Restricted</span>
            <h1 className="display-face mt-5 text-[2.5rem] font-medium leading-[0.95] text-ink">
              Portfolio CRM
            </h1>
            <p className="mt-4 text-body leading-relaxed text-ink-secondary">
              Sign in to manage leads, outreach and everything on the public site.
            </p>
          </div>

          <form onSubmit={submit} className="bezel space-y-5 shadow-panel">
            <div className="bezel-core space-y-5 p-6">
            {error && <ErrorNote>{error}</ErrorNote>}

            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={form.username}
                onChange={(event) =>
                  setForm({ ...form, username: event.target.value })
                }
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={(event) =>
                  setForm({ ...form, password: event.target.value })
                }
              />
            </Field>

            <Button
              type="submit"
              size="lg"
              loading={busy}
              icon={busy ? undefined : ArrowRight}
              className="w-full justify-between"
              disabled={!form.username || !form.password}
            >
              {busy ? 'Signing in' : 'Sign in'}
            </Button>

            <p className="text-label leading-relaxed text-ink-tertiary">
              The account is the Django superuser on the backend. If the server has
              been idle it can take up to a minute to answer the first request.
            </p>
            </div>
          </form>

          <Link
            to="/"
            className="group mt-8 inline-flex items-center gap-2.5 rounded-full px-3 py-2 text-label font-medium text-ink-secondary transition-all duration-500 ease-fluid hover:bg-white/[0.06] hover:text-ink"
          >
            <ArrowLeft size={14} />
            Back to the portfolio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
