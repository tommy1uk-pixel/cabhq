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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: company.name || '',
    code: company.code || '',
    slug: company.slug || '',
    status: company.status || 'ACTIVE',
    contactName: company.contactName || '',
    contactEmail: company.contactEmail || '',
    contactPhone: company.contactPhone || '',
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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
      className="space-y-8 rounded-3xl border border-slate-800 bg-slate-950 p-8"
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Company name" value={form.name} onChange={(v) => setForm((p) => ({ ...p, name: v }))} />
        <Field label="Code" value={form.code} onChange={(v) => setForm((p) => ({ ...p, code: v }))} />
        <Field label="Slug" value={form.slug} onChange={(v) => setForm((p) => ({ ...p, slug: v }))} />
        <Field label="Contact name" value={form.contactName} onChange={(v) => setForm((p) => ({ ...p, contactName: v }))} />
        <Field label="Contact email" value={form.contactEmail} onChange={(v) => setForm((p) => ({ ...p, contactEmail: v }))} />
        <Field label="Contact phone" value={form.contactPhone} onChange={(v) => setForm((p) => ({ ...p, contactPhone: v }))} />

        <label className="space-y-2">
          <span className="text-base text-slate-300">Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="SUSPENDED">SUSPENDED</option>
            <option value="PENDING">PENDING</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-base text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push(`/super-admin/companies/${company.id}`)}
          className="rounded-xl border border-slate-700 px-5 py-3 text-sm font-medium text-white"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-base text-slate-300">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
      />
    </label>
  );
}