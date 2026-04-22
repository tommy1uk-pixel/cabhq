'use client';

import { useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') ||
  'http://localhost:3002';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR' | 'DRIVER';
    companyId: string;
  };
};

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as LoginResponse | { message?: string })
        : null;

      if (!res.ok) {
        throw new Error((data as { message?: string })?.message || 'Login failed');
      }

      const payload = data as LoginResponse;

      localStorage.setItem('cabhq_token', payload.token);
      localStorage.setItem('cabhq_user', JSON.stringify(payload.user));
      localStorage.setItem('token', payload.token);
      localStorage.setItem('user', JSON.stringify(payload.user));

      document.cookie = `cabhq_token=${payload.token}; path=/; SameSite=Lax`;

      if (payload.user.role === 'SUPER_ADMIN') {
        window.location.href = '/super-admin';
      } else if (payload.user.role === 'DRIVER') {
        window.location.href = '/driver';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border border-white/10 bg-[#020b18] p-8"
    >
      <div>
        <h2 className="text-3xl font-black tracking-tight text-white">
          Access your CABHQ account
        </h2>

        <p className="mt-2 text-base leading-7 text-slate-400">
          Sign in to continue.
        </p>
      </div>

      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-base text-white outline-none"
            placeholder="you@company.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-base text-white outline-none"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800/60 bg-red-950/30 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-cyan-500 px-5 py-4 text-base font-semibold text-black disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}