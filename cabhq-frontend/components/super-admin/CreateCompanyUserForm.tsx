'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export default function CreateCompanyUserForm({
  companyId,
}: {
  companyId: string;
}) {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Temp123!');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR' | 'DRIVER'>('ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/companies/${companyId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || 'Failed to create user');
      }

      setEmail('');
      setPassword('Temp123!');
      setRole('ADMIN');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-5 rounded-3xl border border-slate-800 bg-slate-950 p-8"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Create User</h2>
        <p className="mt-2 text-base text-slate-400">
          Add a new user to this company.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Email" value={email} onChange={setEmail} />
        <Field
          label="Temporary Password"
          value={password}
          onChange={setPassword}
        />

        <label className="space-y-2">
          <span className="text-base text-slate-300">Role</span>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as 'ADMIN' | 'OPERATOR' | 'DRIVER')
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="DRIVER">DRIVER</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-800 bg-red-950/30 px-5 py-4 text-base text-red-300">
          {error}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create user'}
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