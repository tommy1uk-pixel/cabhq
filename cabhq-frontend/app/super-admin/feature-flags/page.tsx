'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type FlagStatus = 'ENABLED' | 'DISABLED';
type FlagScope = 'GLOBAL' | 'PLAN' | 'COMPANY';

type FeatureFlag = {
  id: string;
  key: string;
  title: string;
  description: string;
  status: FlagStatus;
  scope: FlagScope;
  targetValue: string;
  updatedAt: string;
  updatedBy: string;
};

const initialFlags: FeatureFlag[] = [
  {
    id: 'flag_001',
    key: 'auto_dispatch_v2',
    title: 'Auto Dispatch V2',
    description: 'Improved dispatch engine with smarter assignment rules.',
    status: 'ENABLED',
    scope: 'PLAN',
    targetValue: 'PRO,ENTERPRISE',
    updatedAt: '2026-04-22T10:15:00',
    updatedBy: 'Super Admin',
  },
  {
    id: 'flag_002',
    key: 'multi_depot_mode',
    title: 'Multi Depot Mode',
    description: 'Enable support for multiple depots inside one company account.',
    status: 'ENABLED',
    scope: 'PLAN',
    targetValue: 'ENTERPRISE',
    updatedAt: '2026-04-22T09:20:00',
    updatedBy: 'Megan Ross',
  },
  {
    id: 'flag_003',
    key: 'driver_app_beta',
    title: 'Driver App Beta',
    description: 'Enable beta version of the driver mobile app.',
    status: 'DISABLED',
    scope: 'COMPANY',
    targetValue: 'Alpha Cars',
    updatedAt: '2026-04-21T15:40:00',
    updatedBy: 'A Khan',
  },
  {
    id: 'flag_004',
    key: 'advanced_reporting',
    title: 'Advanced Reporting',
    description: 'Unlock premium analytics and operator-level revenue reporting.',
    status: 'ENABLED',
    scope: 'PLAN',
    targetValue: 'PRO,ENTERPRISE',
    updatedAt: '2026-04-22T08:45:00',
    updatedBy: 'Super Admin',
  },
  {
    id: 'flag_005',
    key: 'api_access',
    title: 'API Access',
    description: 'Allow company to use external API integrations.',
    status: 'ENABLED',
    scope: 'PLAN',
    targetValue: 'ENTERPRISE',
    updatedAt: '2026-04-21T18:10:00',
    updatedBy: 'D Patel',
  },
  {
    id: 'flag_006',
    key: 'priority_support_badge',
    title: 'Priority Support Badge',
    description: 'Show priority support status in account and support tools.',
    status: 'DISABLED',
    scope: 'GLOBAL',
    targetValue: 'ALL',
    updatedAt: '2026-04-20T11:05:00',
    updatedBy: 'System',
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

function statusClass(status: FlagStatus) {
  if (status === 'ENABLED') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  return 'border-red-500/30 bg-red-500/10 text-red-300';
}

function scopeClass(scope: FlagScope) {
  if (scope === 'GLOBAL') {
    return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
  }
  if (scope === 'PLAN') {
    return 'border-violet-500/30 bg-violet-500/10 text-violet-300';
  }
  return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
}

export default function SuperAdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    initialFlags[0]?.id ?? null,
  );

  const filteredFlags = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flags;

    return flags.filter((flag) =>
      [
        flag.key,
        flag.title,
        flag.description,
        flag.status,
        flag.scope,
        flag.targetValue,
        flag.updatedBy,
      ]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [flags, search]);

  const selectedFlag = useMemo(
    () => flags.find((flag) => flag.id === selectedId) ?? null,
    [flags, selectedId],
  );

  const stats = useMemo(() => {
    return {
      total: flags.length,
      enabled: flags.filter((flag) => flag.status === 'ENABLED').length,
      disabled: flags.filter((flag) => flag.status === 'DISABLED').length,
      global: flags.filter((flag) => flag.scope === 'GLOBAL').length,
      plan: flags.filter((flag) => flag.scope === 'PLAN').length,
      company: flags.filter((flag) => flag.scope === 'COMPANY').length,
    };
  }, [flags]);

  function setStatus(id: string, status: FlagStatus) {
    setFlags((prev) =>
      prev.map((flag) =>
        flag.id === id
          ? {
              ...flag,
              status,
              updatedAt: new Date().toISOString(),
            }
          : flag,
      ),
    );
  }

  function addFlag() {
    const newFlag: FeatureFlag = {
      id: `flag_${Math.random().toString(36).slice(2, 8)}`,
      key: 'new_feature_toggle',
      title: 'New Feature Toggle',
      description: 'Temporary rollout flag for a new platform feature.',
      status: 'DISABLED',
      scope: 'GLOBAL',
      targetValue: 'ALL',
      updatedAt: new Date().toISOString(),
      updatedBy: 'Super Admin',
    };

    setFlags((prev) => [newFlag, ...prev]);
    setSelectedId(newFlag.id);
  }

  return (
    <main className="min-h-screen bg-[#05070c] px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1850px]">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">
              Super Admin
            </div>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Feature Flags</h1>
            <p className="mt-2 text-white/55">
              Control rollouts, beta features and plan-based product access.
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
              onClick={addFlag}
              className="rounded-2xl bg-cyan-600 px-4 py-3 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Create Flag
            </button>
          </div>
        </div>

        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard label="Flags" value={stats.total} />
          <StatCard label="Enabled" value={stats.enabled} />
          <StatCard label="Disabled" value={stats.disabled} />
          <StatCard label="Global" value={stats.global} />
          <StatCard label="Plan" value={stats.plan} />
          <StatCard label="Company" value={stats.company} />
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Flag Registry</h2>
                <p className="mt-1 text-sm text-white/60">
                  Search, review and control platform features.
                </p>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search flags..."
                className="w-full rounded-2xl border border-white/10 bg-[#0b1728] px-4 py-3 text-sm text-white outline-none focus:border-cyan-500/50 lg:w-[320px]"
              />
            </div>

            <div className="space-y-4">
              {filteredFlags.map((flag) => {
                const active = selectedId === flag.id;

                return (
                  <div
                    key={flag.id}
                    onClick={() => setSelectedId(flag.id)}
                    className={`cursor-pointer rounded-2xl border p-5 transition ${
                      active
                        ? 'border-cyan-500/50 bg-[#0c1b2c]'
                        : 'border-white/10 bg-[#0b1728]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">{flag.title}</h3>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                              flag.status,
                            )}`}
                          >
                            {flag.status}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${scopeClass(
                              flag.scope,
                            )}`}
                          >
                            {flag.scope}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/60">{flag.key}</p>
                        <p className="mt-2 text-sm text-white/75">{flag.description}</p>

                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                          <span>Target: {flag.targetValue}</span>
                          <span>Updated: {formatDateTime(flag.updatedAt)}</span>
                          <span>By: {flag.updatedBy}</span>
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

              {filteredFlags.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-[#0b1728] p-6 text-white/55">
                  No feature flags found.
                </div>
              ) : null}
            </div>
          </section>

          <section className="space-y-6">
            {!selectedFlag ? (
              <Panel title="Flag Detail">
                <div className="text-white/55">No feature flag selected.</div>
              </Panel>
            ) : (
              <>
                <Panel title="Flag Detail">
                  <DetailRow label="Title" value={selectedFlag.title} />
                  <DetailRow label="Key" value={selectedFlag.key} />
                  <DetailRow label="Status" value={selectedFlag.status} />
                  <DetailRow label="Scope" value={selectedFlag.scope} />
                  <DetailRow label="Target" value={selectedFlag.targetValue} />
                  <DetailRow label="Updated By" value={selectedFlag.updatedBy} />
                  <DetailRow
                    label="Updated At"
                    value={formatDateTime(selectedFlag.updatedAt)}
                  />

                  <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1728] p-4">
                    <div className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/70">
                      Description
                    </div>
                    <p className="text-sm text-white/75">{selectedFlag.description}</p>
                  </div>
                </Panel>

                <Panel title="Flag Actions">
                  <div className="grid gap-3">
                    <button
                      onClick={() => setStatus(selectedFlag.id, 'ENABLED')}
                      className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Enable Flag
                    </button>
                    <button
                      onClick={() => setStatus(selectedFlag.id, 'DISABLED')}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-500"
                    >
                      Disable Flag
                    </button>
                    <button className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                      Clone Flag
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