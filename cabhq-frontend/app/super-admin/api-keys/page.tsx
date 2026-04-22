'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type KeyStatus = 'ACTIVE' | 'REVOKED';
type Scope =
  | 'READ_BOOKINGS'
  | 'WRITE_BOOKINGS'
  | 'READ_DRIVERS'
  | 'WRITE_DRIVERS'
  | 'READ_VEHICLES'
  | 'WRITE_VEHICLES'
  | 'ADMIN';

type ApiKey = {
  id: string;
  label: string;
  companyName: string;
  keyPreview: string;
  createdAt: string;
  lastUsedAt?: string | null;
  status: KeyStatus;
  scopes: Scope[];
  createdBy: string;
};

const initialKeys: ApiKey[] = [
  {
    id: 'key_001',
    label: 'Alpha Cars Dispatch API',
    companyName: 'Alpha Cars',
    keyPreview: 'ck_live_4hJ2...9KsQ',
    createdAt: '2026-04-12T09:15:00',
    lastUsedAt: '2026-04-22T11:18:00',
    status: 'ACTIVE',
    scopes: ['READ_BOOKINGS', 'WRITE_BOOKINGS', 'READ_DRIVERS'],
    createdBy: 'Megan Ross',
  },
  {
    id: 'key_002',
    label: 'Premier Fleet Reporting',
    companyName: 'Premier Fleet',
    keyPreview: 'ck_live_Y8Qa...2LmP',
    createdAt: '2026-03-28T13:42:00',
    lastUsedAt: '2026-04-21T18:03:00',
    status: 'ACTIVE',
    scopes: ['READ_BOOKINGS', 'READ_DRIVERS', 'READ_VEHICLES'],
    createdBy: 'D Patel',
  },
  {
    id: 'key_003',
    label: 'Old Metro Integration',
    companyName: 'Metro Executive',
    keyPreview: 'ck_live_O1ab...7Qtw',
    createdAt: '2026-02-11T08:10:00',
    lastUsedAt: '2026-03-01T10:20:00',
    status: 'REVOKED',
    scopes: ['ADMIN'],
    createdBy: 'A Khan',
  },
];

function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusClass(status: KeyStatus) {
  if (status === 'ACTIVE') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }

  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function scopeClass(scope: Scope) {
  if (scope === 'ADMIN') {
    return 'border-red-500/30 bg-red-500/10 text-red-300';
  }

  if (scope.startsWith('WRITE_')) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }

  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
}

export default function SuperAdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialKeys[0]?.id ?? null,
  );

  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keys;

    return keys.filter((key) =>
      [
        key.label,
        key.companyName,
        key.keyPreview,
        key.status,
        key.createdBy,
        ...key.scopes,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [keys, search]);

  const selectedKey = useMemo(
    () => keys.find((key) => key.id === selectedId) ?? null,
    [keys, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: keys.length,
      active: keys.filter((key) => key.status === 'ACTIVE').length,
      revoked: keys.filter((key) => key.status === 'REVOKED').length,
      admin: keys.filter((key) => key.scopes.includes('ADMIN')).length,
    };
  }, [keys]);

  function updateStatus(id: string, status: KeyStatus) {
    setKeys((prev) =>
      prev.map((key) => (key.id === id ? { ...key, status } : key)),
    );
  }

  function addKey() {
    const newKey: ApiKey = {
      id: `key_${Math.random().toString(36).slice(2, 8)}`,
      label: 'New Integration Key',
      companyName: 'New Company',
      keyPreview: `ck_live_${Math.random().toString(36).slice(2, 6)}...${Math.random()
        .toString(36)
        .slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      status: 'ACTIVE',
      scopes: ['READ_BOOKINGS'],
      createdBy: 'Super Admin',
    };

    setKeys((prev) => [newKey, ...prev]);
    setSelectedId(newKey.id);
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">API Keys</h1>
            <p className="mt-2 text-white/55">
              Manage external integrations, key scopes and access control across companies.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/super-admin"
              className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
            >
              Back to Overview
            </Link>
            <button
              onClick={addKey}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Create API Key
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Keys" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Revoked" value={stats.revoked} />
          <StatCard label="Admin Keys" value={stats.admin} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Key Registry</h2>
                <p className="mt-1 text-sm text-white/60">
                  Review active and revoked keys by company and scope.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search keys..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredKeys.map((key) => {
                const active = selectedId === key.id;

                return (
                  <div
                    key={key.id}
                    onClick={() => setSelectedId(key.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{key.label}</h3>
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              key.status,
                            )}`}
                          >
                            {key.status}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">
                          {key.companyName} · {key.keyPreview}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {key.scopes.map((scope) => (
                            <span
                              key={scope}
                              className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${scopeClass(
                                scope,
                              )}`}
                            >
                              {scope.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Created: {formatDateTime(key.createdAt)}</span>
                          <span>Last Used: {formatDateTime(key.lastUsedAt)}</span>
                          <span>By: {key.createdBy}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
                      >
                        View
                      </button>
                    </div>
                  </div>
                );
              })}

              {filteredKeys.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No API keys found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedKey ? (
              <Panel title="Key Detail">
                <div className="text-white/55">No key selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Key Detail">
                  <DetailRow label="Label" value={selectedKey.label} />
                  <DetailRow label="Company" value={selectedKey.companyName} />
                  <DetailRow label="Key Preview" value={selectedKey.keyPreview} />
                  <DetailRow label="Status" value={selectedKey.status} />
                  <DetailRow label="Created By" value={selectedKey.createdBy} />
                  <DetailRow label="Created At" value={formatDateTime(selectedKey.createdAt)} />
                  <DetailRow label="Last Used" value={formatDateTime(selectedKey.lastUsedAt)} />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Scopes
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedKey.scopes.map((scope) => (
                        <span
                          key={scope}
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scopeClass(
                            scope,
                          )}`}
                        >
                          {scope.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </Panel>

                <Panel title="Key Actions">
                  <div className="grid gap-3">
                    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                      Copy Key ID
                    </button>
                    <button className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20">
                      Rotate Key
                    </button>
                    <button
                      onClick={() => updateStatus(selectedKey.id, 'ACTIVE')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Mark Active
                    </button>
                    <button
                      onClick={() => updateStatus(selectedKey.id, 'REVOKED')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Revoke Key
                    </button>
                  </div>
                </Panel>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-3 text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 py-2 last:border-b-0">
      <span className="text-sm text-white/50">{label}</span>
      <span className="max-w-[60%] text-right text-sm text-white/85">
        {value}
      </span>
    </div>
  );
}