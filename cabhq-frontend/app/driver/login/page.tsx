'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

type DriverLoginResponse = {
  accessToken?: string;
  access_token?: string;
  driverToken?: string;
  driver?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status?: string;
  };
  currentDriver?: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    status?: string;
  };
};

export default function DriverLoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/driver-app/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phone.trim(),
          pin: pin.trim(),
        }),
      });

      const data: DriverLoginResponse = await res.json();

      if (!res.ok) {
        const message =
          typeof (data as { message?: unknown })?.message === 'string'
            ? (data as { message?: string }).message!
            : 'Driver login failed';

        throw new Error(message);
      }

      const token =
        data.accessToken || data.access_token || data.driverToken || null;

      if (!token) {
        throw new Error('Driver token missing from login response');
      }

      const driver = data.driver || data.currentDriver || null;

      localStorage.setItem('driverToken', token);

      if (driver) {
        localStorage.setItem('driver', JSON.stringify(driver));
      } else {
        localStorage.removeItem('driver');
      }

      router.push('/driver');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Driver login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111f] p-6 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
        <h1 className="text-3xl font-bold">Driver Login</h1>
        <p className="mt-2 text-sm text-white/50">
          Sign in with phone number and PIN
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/70">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="Driver phone"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/70">PIN</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 outline-none focus:border-cyan-500"
              placeholder="4-digit PIN"
              required
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-cyan-600 px-4 py-3 font-semibold transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}