'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function CompanyStatusActions({
  companyId,
  status,
}: {
  companyId: string;
  status?: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function setStatus(next: string) {
    try {
      setLoading(true);

      const res = await fetch(`${API_BASE}/companies/${companyId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to update status');
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const current = (status || 'UNKNOWN').toUpperCase();

  return (
    <div className="flex flex-wrap gap-3">
      {current !== 'ACTIVE' && (
        <button
          disabled={loading}
          onClick={() => setStatus('ACTIVE')}
          className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Activate
        </button>
      )}

      {current !== 'SUSPENDED' && (
        <button
          disabled={loading}
          onClick={() => setStatus('SUSPENDED')}
          className="rounded-xl bg-red-500 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Suspend
        </button>
      )}

      {current !== 'PENDING' && (
        <button
          disabled={loading}
          onClick={() => setStatus('PENDING')}
          className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-black disabled:opacity-50"
        >
          Pending
        </button>
      )}
    </div>
  );
}