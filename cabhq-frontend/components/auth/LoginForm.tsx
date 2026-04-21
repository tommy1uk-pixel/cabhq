'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

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
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const text = await res.text();
      const data = text ? (JSON.parse(text) as LoginResponse | { message?: string }) : null;

      if (!res.ok) {
        throw new Error((data as { message?: string })?.message || 'Login failed');
      }

      const payload = data as LoginResponse;

      localStorage.setItem('cabhq_token', payload.token);
      localStorage.setItem('cabhq_user', JSON.stringify(payload.user));

      if (payload.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin');
      } else if (payload.user.role === 'DRIVER') {
        router.push('/driver');
      } else {
        router.push('/dashboard');
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
    >
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Login
        </h2>
        <p className="mt-2 text-base text-slate-400">
          Access your CabHQ account.
        </p>
      </div>

      <div className="space-y-5">
        <label className="block space-y-2">
          <span className="text-base text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
            placeholder="you@company.com"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-base text-slate-300">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
            placeholder="••••••••"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-base text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-white px-5 py-4 text-base font-semibold text-black disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}