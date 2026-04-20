'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function CompanyUserActions({
  companyId,
  userId,
  status,
}: {
  companyId: string;
  userId: string;
  status?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('Temp123!');

  async function updateStatus(next: 'ACTIVE' | 'SUSPENDED') {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/companies/${companyId}/users/${userId}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: next }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update user status');
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    try {
      setLoading(true);

      const res = await fetch(
        `${API_BASE}/companies/${companyId}/users/${userId}/password`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to reset password');
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const current = (status || 'UNKNOWN').toUpperCase();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {current !== 'ACTIVE' && (
          <button
            disabled={loading}
            onClick={() => updateStatus('ACTIVE')}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Activate
          </button>
        )}

        {current !== 'SUSPENDED' && (
          <button
            disabled={loading}
            onClick={() => updateStatus('SUSPENDED')}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Suspend
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          placeholder="New temporary password"
        />

        <button
          disabled={loading}
          onClick={resetPassword}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          Reset Password
        </button>
      </div>
    </div>
  );
}