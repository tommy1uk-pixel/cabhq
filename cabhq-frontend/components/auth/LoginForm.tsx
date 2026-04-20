'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  decodeJwtPayload,
  getDefaultRouteForRole,
  setAuthCookie,
} from '@/lib/auth';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

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
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Login failed');
      }

      const token = data?.token as string | undefined;
      if (!token) {
        throw new Error('No token returned from login');
      }

      setAuthCookie(token);

      const payload = decodeJwtPayload(token);
      const nextPath = getDefaultRouteForRole(payload?.role);

      router.push(nextPath);
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
      className="space-y-6 rounded-3xl border border-slate-800 bg-slate-950 p-8"
    >
      <div>
        <h1 className="text-4xl font-semibold tracking-tight text-white">
          Login
        </h1>
        <p className="mt-2 text-base text-slate-400">
          Sign in to CabHQ.
        </p>
      </div>

      <label className="block space-y-2">
        <span className="text-base text-slate-300">Email</span>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-base text-slate-300">Password</span>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-base text-red-300">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-2xl bg-white px-5 py-3 text-base font-semibold text-black disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}