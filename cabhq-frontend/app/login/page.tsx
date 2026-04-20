'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'DRIVER';
    companyId: string;
    company?: {
      id: string;
      name: string;
    };
  };
};

function getRedirectPath(role: LoginResponse['user']['role']) {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/super-admin';
    case 'ADMIN':
    case 'OPERATOR':
      return '/dashboard';
    case 'DRIVER':
      return '/driver';
    default:
      return '/dashboard';
  }
}

function setAuthCookie(token: string) {
  document.cookie = `cabhq_token=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('admin@cabhq.com');
  const [password, setPassword] = useState('Temp123!');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const data = await apiFetch<LoginResponse>(
        '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password: password.trim(),
          }),
        },
        {
          suppressAutoClear: true,
        },
      );

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setAuthCookie(data.token);

      const redirectPath = getRedirectPath(data.user.role);
      window.location.href = redirectPath;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#020b1c] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <h1 className="text-5xl font-bold tracking-tight">Login</h1>
          <p className="mt-3 text-sm text-white/65">Sign in to CabHQ dispatch</p>

          <form onSubmit={handleSubmit} className="mt-10 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@cabhq.com"
                className="w-full rounded-2xl border border-white/10 bg-[#dfe4ee] px-4 py-4 text-lg text-black outline-none transition focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">
                Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl border border-cyan-500/70 bg-[#020b1c] px-4 py-4 text-lg text-white outline-none transition focus:border-cyan-400"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-cyan-600 px-4 py-4 text-xl font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}