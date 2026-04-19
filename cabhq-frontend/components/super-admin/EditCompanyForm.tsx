'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Company } from '@/lib/super-admin/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function EditCompanyForm({
  company,
}: {
  company: Company;
}) {
  const router = useRouter();
  const [name, setName] = useState(company.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to update company');
      }

      router.push(`/super-admin/companies/${company.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update company');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-950 p-6"
    >
      <label className="block space-y-2">
        <span className="text-sm text-slate-300">Company name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
        />
      </label>

      {error ? (
        <div className="rounded-xl border border-red-800 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/super-admin/companies/${company.id}`)}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-white"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}