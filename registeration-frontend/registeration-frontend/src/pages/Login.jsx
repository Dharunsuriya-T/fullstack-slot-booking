import { useEffect, useState } from 'react';

export default function Login() {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

  const [mode, setMode] = useState('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get('verify');
    const reset = params.get('reset');

    async function runVerify(token) {
      try {
        setSubmitting(true);
        setError('');
        setInfo('');
        const res = await fetch(
          `${API_BASE}/auth/verify-email?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Verification failed');
          return;
        }
        setInfo('Email verified. You can login now.');
      } catch (err) {
        setError(err.message || 'Verification failed');
      } finally {
        setSubmitting(false);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }

    if (verify) {
      runVerify(verify);
      return;
    }

    if (reset) {
      setResetToken(reset);
      setMode('RESET');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [API_BASE]);

  async function submitLocalAuth(e) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');
      setInfo('');
      const endpoint = mode === 'REGISTER' ? 'register' : 'login';
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed');
        return;
      }

      window.location.reload();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitForgotPassword(e) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');
      setInfo('');
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Request failed');
        return;
      }
      setInfo(
        'If an account exists for this email, a password reset link has been sent.'
      );
      setMode('LOGIN');
    } catch (err) {
      setError(err.message || 'Request failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function submitResetPassword(e) {
    e.preventDefault();
    if (submitting) return;

    try {
      setSubmitting(true);
      setError('');
      setInfo('');

      if (!resetToken) {
        setError('Reset token missing');
        return;
      }
      if (resetPassword.length < 8) {
        setError('Password must be at least 8 characters');
        return;
      }

      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: resetPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Reset failed');
        return;
      }

      setInfo('Password reset successful. Please login.');
      setResetToken('');
      setResetPassword('');
      setMode('LOGIN');
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Placement Portal
        </h1>

        <button
          type="button"
          onClick={() => {
            window.location.href = `${API_BASE}/auth/google`;
          }}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {error && (
          <div className="mb-4 border border-red-200 bg-red-50 text-red-800 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-4 border border-green-200 bg-green-50 text-green-800 px-3 py-2 rounded text-sm">
            {info}
          </div>
        )}

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode('LOGIN')}
            className={`flex-1 py-2 rounded border text-sm ${
              mode === 'LOGIN'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('REGISTER')}
            className={`flex-1 py-2 rounded border text-sm ${
              mode === 'REGISTER'
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        {mode === 'FORGOT' ? (
          <form onSubmit={submitForgotPassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="your.name@kongu.edu"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:bg-gray-300 disabled:text-gray-600"
            >
              {submitting ? 'Please wait…' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => setMode('LOGIN')}
              className="w-full text-sm text-indigo-600 hover:underline"
            >
              Back to login
            </button>
          </form>
        ) : mode === 'RESET' ? (
          <form onSubmit={submitResetPassword} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New password
              </label>
              <input
                type="password"
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Minimum 8 characters"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:bg-gray-300 disabled:text-gray-600"
            >
              {submitting ? 'Please wait…' : 'Reset password'}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetToken('');
                setResetPassword('');
                setMode('LOGIN');
              }}
              className="w-full text-sm text-indigo-600 hover:underline"
            >
              Back to login
            </button>
          </form>
        ) : (
          <form onSubmit={submitLocalAuth} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="your.name@kongu.edu"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          {mode === 'LOGIN' && (
            <button
              type="button"
              onClick={() => setMode('FORGOT')}
              className="w-full text-sm text-indigo-600 hover:underline text-left"
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-gray-900 text-white hover:bg-black transition disabled:bg-gray-300 disabled:text-gray-600"
          >
            {submitting
              ? 'Please wait…'
              : mode === 'REGISTER'
              ? 'Create account'
              : 'Login'}
          </button>
        </form>
        )}
      </div>
    </div>
  );
}
